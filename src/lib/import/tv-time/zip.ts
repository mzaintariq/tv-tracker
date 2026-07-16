import { inflateRawSync } from "node:zlib";

import { TvTimeImportError } from "./errors";
import { ALLOWED_TV_TIME_FILES, type AllowedTvTimeFile } from "./schemas";
import { MAX_COMPRESSED_UPLOAD_BYTES } from "./types";

const MAX_ENTRIES = 100;
const MAX_ENTRY_BYTES = 10_000_000;
const MAX_ALLOWED_TOTAL_BYTES = 20_000_000;
const MAX_COMPRESSION_RATIO = 250;

type CentralEntry = {
  name: string;
  nameBytes: Uint8Array;
  flags: number;
  method: number;
  crc: number;
  compressedSize: number;
  uncompressedSize: number;
  localOffset: number;
  externalAttributes: number;
  dataStart?: number;
  dataEnd?: number;
};

function fail(code: string, message: string): never {
  throw new TvTimeImportError(code, message);
}

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of data) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function validateName(name: string): void {
  if (!name || name.includes("\0") || name.includes("\\") || name.startsWith("/") || /^[A-Za-z]:/.test(name)) fail("zip_unsafe_path", "The ZIP contains an unsafe path.");
  if (name.split("/").some((part) => part === ".." || part === ".")) fail("zip_unsafe_path", "The ZIP contains path traversal.");
  if (name.includes("/") || name.toLocaleLowerCase("en-US").endsWith(".zip")) fail("zip_nested_path", "Nested paths and archives are not supported.");
}

function centralEntries(bytes: Uint8Array): { entries: CentralEntry[]; directoryOffset: number } {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let eocd = -1;
  for (let index = bytes.length - 22; index >= Math.max(0, bytes.length - 65_557); index -= 1) {
    if (view.getUint32(index, true) === 0x06054b50) { eocd = index; break; }
  }
  if (eocd < 0) fail("zip_invalid", "The upload is not a valid ZIP archive.");
  const count = view.getUint16(eocd + 10, true);
  const directorySize = view.getUint32(eocd + 12, true);
  const directoryOffset = view.getUint32(eocd + 16, true);
  if (count === 0 || count > MAX_ENTRIES || directoryOffset + directorySize > eocd) fail("zip_limits", "The ZIP entry count or directory is invalid.");
  const decoder = new TextDecoder("utf-8", { fatal: true });
  const entries: CentralEntry[] = [];
  const names = new Set<string>();
  let offset = directoryOffset;
  for (let index = 0; index < count; index += 1) {
    if (offset + 46 > bytes.length || view.getUint32(offset, true) !== 0x02014b50) fail("zip_invalid_directory", "The ZIP directory is malformed.");
    const flags = view.getUint16(offset + 8, true);
    const method = view.getUint16(offset + 10, true);
    const compressedSize = view.getUint32(offset + 20, true);
    const uncompressedSize = view.getUint32(offset + 24, true);
    const nameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    const nextOffset = offset + 46 + nameLength + extraLength + commentLength;
    if (nextOffset > eocd || nextOffset > bytes.length) fail("zip_invalid_directory", "The ZIP directory is malformed.");
    const nameBytes = bytes.slice(offset + 46, offset + 46 + nameLength);
    const name = decoder.decode(nameBytes);
    validateName(name);
    const folded = name.toLocaleLowerCase("en-US");
    if (names.has(folded)) fail("zip_duplicate_name", "The ZIP contains duplicate filenames.");
    names.add(folded);
    if ((flags & 1) !== 0) fail("zip_encrypted", "Encrypted ZIP entries are not supported.");
    const externalAttributes = view.getUint32(offset + 38, true);
    const unixType = (externalAttributes >>> 16) & 0xf000;
    if (unixType === 0xa000) fail("zip_symlink", "ZIP symlinks are not supported.");
    entries.push({ name, nameBytes, flags, method, crc: view.getUint32(offset + 16, true), compressedSize, uncompressedSize, localOffset: view.getUint32(offset + 42, true), externalAttributes });
    offset = nextOffset;
  }
  if (offset !== directoryOffset + directorySize) fail("zip_invalid_directory", "The ZIP directory size does not match its entries.");
  return { entries, directoryOffset };
}

function sameBytes(left: Uint8Array, right: Uint8Array): boolean {
  return left.length === right.length && left.every((byte, index) => byte === right[index]);
}

function bindLocalHeaders(bytes: Uint8Array, entries: CentralEntry[], directoryOffset: number): void {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  for (const entry of entries) {
    const offset = entry.localOffset;
    if (offset + 30 > directoryOffset || view.getUint32(offset, true) !== 0x04034b50) fail("zip_invalid_local", "A ZIP local header is malformed.");
    const flags = view.getUint16(offset + 6, true);
    const method = view.getUint16(offset + 8, true);
    const localCrc = view.getUint32(offset + 14, true);
    const localCompressedSize = view.getUint32(offset + 18, true);
    const localUncompressedSize = view.getUint32(offset + 22, true);
    const nameLength = view.getUint16(offset + 26, true);
    const extraLength = view.getUint16(offset + 28, true);
    const nameStart = offset + 30;
    const dataStart = nameStart + nameLength + extraLength;
    const dataEnd = dataStart + entry.compressedSize;
    if (dataStart > directoryOffset || dataEnd > directoryOffset || !sameBytes(bytes.subarray(nameStart, nameStart + nameLength), entry.nameBytes)) fail("zip_header_mismatch", "A ZIP central entry does not match its local header.");
    if (flags !== entry.flags || method !== entry.method) fail("zip_header_mismatch", "A ZIP central entry does not match its local header.");
    const usesDescriptor = (flags & 0x08) !== 0;
    if ((!usesDescriptor && (localCrc !== entry.crc || localCompressedSize !== entry.compressedSize || localUncompressedSize !== entry.uncompressedSize))
      || (usesDescriptor && !([0, entry.crc].includes(localCrc) && [0, entry.compressedSize].includes(localCompressedSize) && [0, entry.uncompressedSize].includes(localUncompressedSize)))) fail("zip_header_mismatch", "A ZIP central entry does not match its local integrity metadata.");
    entry.dataStart = dataStart;
    entry.dataEnd = dataEnd;
  }
  const ranges = [...entries].sort((left, right) => left.localOffset - right.localOffset);
  for (let index = 1; index < ranges.length; index += 1) {
    if (ranges[index].localOffset < (ranges[index - 1].dataEnd ?? 0)) fail("zip_overlap", "ZIP local records or entry data ranges overlap.");
  }
}

export function readAllowedTvTimeZip(bytes: Uint8Array): Partial<Record<AllowedTvTimeFile, string>> {
  if (bytes.length > MAX_COMPRESSED_UPLOAD_BYTES) fail("zip_compressed_too_large", "The ZIP exceeds the compressed upload limit.");
  const { entries, directoryOffset } = centralEntries(bytes);
  bindLocalHeaders(bytes, entries, directoryOffset);
  const result: Partial<Record<AllowedTvTimeFile, string>> = {};
  let total = 0;
  for (const entry of entries) {
    if (!(entry.name in ALLOWED_TV_TIME_FILES)) continue;
    if (entry.uncompressedSize > MAX_ENTRY_BYTES) fail("zip_entry_too_large", "An import CSV exceeds the supported size.");
    if (entry.compressedSize === 0 ? entry.uncompressedSize > 0 : entry.uncompressedSize / entry.compressedSize > MAX_COMPRESSION_RATIO) fail("zip_ratio", "A ZIP entry has an unsafe compression ratio.");
    total += entry.uncompressedSize;
    if (total > MAX_ALLOWED_TOTAL_BYTES) fail("zip_total_too_large", "The import CSVs exceed the supported total size.");
    const start = entry.dataStart;
    if (start === undefined) fail("zip_invalid_local", "A ZIP local header is malformed.");
    const compressed = bytes.subarray(start, start + entry.compressedSize);
    if (compressed.length !== entry.compressedSize) fail("zip_truncated", "A ZIP entry is truncated.");
    let content: Uint8Array;
    if (entry.method === 0) content = compressed;
    else if (entry.method === 8) content = inflateRawSync(compressed, { maxOutputLength: entry.uncompressedSize });
    else fail("zip_method", "A ZIP entry uses an unsupported compression method.");
    if (content.length !== entry.uncompressedSize || crc32(content) !== entry.crc) fail("zip_integrity", "A ZIP entry failed its integrity check.");
    const decoded = new TextDecoder("utf-8", { fatal: true }).decode(content).replace(/^\uFEFF/, "");
    result[entry.name as AllowedTvTimeFile] = decoded;
  }
  const required: AllowedTvTimeFile[] = ["tracking-prod-records.csv", "tracking-prod-records-v2.csv", "user_tv_show_data.csv", "followed_tv_show.csv"];
  if (required.some((name) => result[name] === undefined)) fail("zip_missing_required", "The ZIP is missing required TV Time CSV files.");
  return result;
}
