export const IMPORT_UPLOAD_FALLBACK = "The import could not be uploaded. Please try again.";

export type ImportUploadResponse = {
  importId?: string;
  error?: string;
  code?: string;
  applied?: number;
  blocked?: number;
  tvUnits?: { applied: number; blocked: number };
  movieItems?: { applied: number; blocked: number };
};

const safeValidationCodes = new Set(["content_type", "zip_compressed_too_large", "empty_upload", "timestamp_invalid", "fingerprint_mismatch", "tv_metadata_episode_identity_conflict"]);

export async function readImportUploadResponse(response: Response): Promise<ImportUploadResponse | null> {
  try {
    const value: unknown = await response.json();
    return value !== null && typeof value === "object" && !Array.isArray(value) ? value as ImportUploadResponse : null;
  } catch {
    return null;
  }
}

export function safeImportUploadError(result: ImportUploadResponse | null): string {
  const code = result?.code;
  if (code && (safeValidationCodes.has(code) || code.startsWith("zip_") || code.startsWith("csv_")) && typeof result.error === "string" && result.error.length <= 240) return result.error;
  return IMPORT_UPLOAD_FALLBACK;
}
