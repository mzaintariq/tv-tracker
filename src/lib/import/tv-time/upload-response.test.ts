import { describe, expect, it } from "vitest";
import { IMPORT_UPLOAD_FALLBACK, readImportUploadResponse, safeImportUploadError } from "./upload-response";

describe("import upload response parsing", () => {
  it("parses successful JSON", async () => {
    await expect(readImportUploadResponse(new Response(JSON.stringify({ importId: "one" }), { headers: { "content-type": "application/json" } }))).resolves.toEqual({ importId: "one" });
  });

  it("preserves known safe JSON validation errors", () => {
    expect(safeImportUploadError({ code: "zip_compressed_too_large", error: "The ZIP exceeds 3.5 MB." })).toBe("The ZIP exceeds 3.5 MB.");
    expect(safeImportUploadError({ code: "fingerprint_mismatch", error: "Choose the same ZIP that was analyzed." })).toBe("Choose the same ZIP that was analyzed.");
  });

  it.each([
    new Response("<html>proxy failure</html>", { headers: { "content-type": "text/html" } }),
    new Response(null),
    new Response("{malformed", { headers: { "content-type": "application/json" } }),
  ])("returns no payload for HTML, empty, or malformed responses", async (response) => {
    expect(await readImportUploadResponse(response)).toBeNull();
  });

  it("never exposes unknown response bodies or errors", () => {
    const raw = "PostgreSQL relation failed SQLSTATE 23505 <html>stack trace</html>";
    expect(safeImportUploadError({ code: "internal_error", error: raw })).toBe(IMPORT_UPLOAD_FALLBACK);
    expect(safeImportUploadError(null)).toBe(IMPORT_UPLOAD_FALLBACK);
  });
});
