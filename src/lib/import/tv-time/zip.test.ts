import { describe, expect, it } from "vitest";
import { readAllowedTvTimeZip } from "./zip";

function crc32(data: Uint8Array): number { let crc = 0xffffffff; for (const byte of data) { crc ^= byte; for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1)); } return (crc ^ 0xffffffff) >>> 0; }
function storedZip(entries: { name: string; value: string }[]): Uint8Array {
  const encoder = new TextEncoder(); const parts: Uint8Array[] = []; const central: Uint8Array[] = []; let offset = 0;
  for (const entry of entries) {
    const name = encoder.encode(entry.name); const data = encoder.encode(entry.value); const crc = crc32(data);
    const local = new Uint8Array(30 + name.length + data.length); const view = new DataView(local.buffer);
    view.setUint32(0, 0x04034b50, true); view.setUint16(4, 20, true); view.setUint32(14, crc, true); view.setUint32(18, data.length, true); view.setUint32(22, data.length, true); view.setUint16(26, name.length, true); local.set(name, 30); local.set(data, 30 + name.length); parts.push(local);
    const directory = new Uint8Array(46 + name.length); const directoryView = new DataView(directory.buffer);
    directoryView.setUint32(0, 0x02014b50, true); directoryView.setUint16(4, 20, true); directoryView.setUint16(6, 20, true); directoryView.setUint32(16, crc, true); directoryView.setUint32(20, data.length, true); directoryView.setUint32(24, data.length, true); directoryView.setUint16(28, name.length, true); directoryView.setUint32(42, offset, true); directory.set(name, 46); central.push(directory); offset += local.length;
  }
  const centralSize = central.reduce((sum, value) => sum + value.length, 0); const end = new Uint8Array(22); const endView = new DataView(end.buffer);
  endView.setUint32(0, 0x06054b50, true); endView.setUint16(8, entries.length, true); endView.setUint16(10, entries.length, true); endView.setUint32(12, centralSize, true); endView.setUint32(16, offset, true);
  const all = [...parts, ...central, end]; const result = new Uint8Array(all.reduce((sum, value) => sum + value.length, 0)); let cursor = 0; for (const value of all) { result.set(value, cursor); cursor += value.length; } return result;
}

const required = ["tracking-prod-records.csv", "tracking-prod-records-v2.csv", "user_tv_show_data.csv", "followed_tv_show.csv"].map((name) => ({ name, value: "header\n" }));

describe("TV Time ZIP security", () => {
  it("returns only allowlisted files and never opens sensitive entries", () => {
    const result = readAllowedTvTimeZip(storedZip([...required, { name: "access_token.csv", value: "secret-token" }]));
    expect(Object.keys(result)).toHaveLength(4); expect(JSON.stringify(result)).not.toContain("secret-token");
  });
  it("rejects traversal paths", () => expect(() => readAllowedTvTimeZip(storedZip([{ name: "../tracking-prod-records.csv", value: "x" }]))).toThrow("path traversal"));
  it("rejects duplicate case-insensitive names", () => expect(() => readAllowedTvTimeZip(storedZip([...required, { name: "FOLLOWED_TV_SHOW.CSV", value: "x" }]))).toThrow("duplicate filenames"));
  it("rejects nested archive extensions case-insensitively", () => expect(() => readAllowedTvTimeZip(storedZip([{ name: "payload.ZIP", value: "x" }]))).toThrow("Nested paths and archives"));
  it("rejects a central filename that differs from its local filename", () => {
    const archive = storedZip(required);
    archive[30] ^= 1;
    expect(() => readAllowedTvTimeZip(archive)).toThrow("does not match its local header");
  });
  it("rejects central/local compression metadata mismatch", () => {
    const archive = storedZip(required);
    new DataView(archive.buffer).setUint16(8, 8, true);
    expect(() => readAllowedTvTimeZip(archive)).toThrow("does not match its local header");
  });
  it("rejects central/local CRC mismatch", () => {
    const archive = storedZip(required);
    new DataView(archive.buffer).setUint32(14, 0, true);
    expect(() => readAllowedTvTimeZip(archive)).toThrow("integrity metadata");
  });
  it("rejects overlapping local records and entry data", () => {
    const archive = storedZip(required);
    const view = new DataView(archive.buffer);
    const eocd = archive.length - 22;
    const directoryOffset = view.getUint32(eocd + 16, true);
    const enlarged = view.getUint32(18, true) + 40;
    view.setUint32(18, enlarged, true);
    view.setUint32(directoryOffset + 20, enlarged, true);
    expect(() => readAllowedTvTimeZip(archive)).toThrow("overlap");
  });
});
