import { MAX_COMPRESSED_UPLOAD_BYTES } from "./types";
import { TvTimeImportError } from "./errors";

export async function readBoundedZipBody(request: Request): Promise<Uint8Array> {
  if (request.headers.get("content-type")?.split(";", 1)[0] !== "application/zip") throw new TvTimeImportError("content_type", "Upload the original ZIP file.");
  const declared = Number(request.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > MAX_COMPRESSED_UPLOAD_BYTES) throw new TvTimeImportError("zip_compressed_too_large", "The ZIP exceeds 3.5 MB.");
  if (!request.body) throw new TvTimeImportError("empty_upload", "Choose a TV Time ZIP file.");
  const reader = request.body.getReader(); const chunks: Uint8Array[] = []; let total = 0;
  while (true) {
    const { done, value } = await reader.read(); if (done) break;
    total += value.length; if (total > MAX_COMPRESSED_UPLOAD_BYTES) { await reader.cancel(); throw new TvTimeImportError("zip_compressed_too_large", "The ZIP exceeds 3.5 MB."); }
    chunks.push(value);
  }
  const output = new Uint8Array(total); let offset = 0;
  for (const chunk of chunks) { output.set(chunk, offset); offset += chunk.length; }
  return output;
}
