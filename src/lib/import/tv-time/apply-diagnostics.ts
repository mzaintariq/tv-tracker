export type ApplyStage = "apply_lifecycle_load" | "apply_lifecycle_start" | "tv_item_load" | "tv_mapping_load" | "tv_metadata_sync" | "tv_episode_lookup" | "tv_payload_build" | "tv_apply_rpc" | "movie_metadata_sync" | "movie_metadata_cache" | "movie_payload_build" | "movie_apply_rpc" | "apply_progress_update";
export type ApplyErrorCategory = "timeout" | "network_error" | "request_aborted" | "tmdb_rate_limited" | "tmdb_4xx" | "tmdb_5xx" | "postgrest_error" | "postgres_error" | "rpc_rejected" | "invalid_response" | "validation_error" | "unknown_error";
export type ApplyDiagnostic = { stage: ApplyStage; category: ApplyErrorCategory; safeCode: string | null; retryable: boolean };

type ErrorShape = { name?: unknown; message?: unknown; code?: unknown; status?: unknown };
function shape(error: unknown): ErrorShape { return typeof error === "object" && error !== null ? error : {}; }
function safeExternalCode(value: unknown): string | null { return typeof value === "string" && /^[A-Z0-9_]{2,20}$/i.test(value) ? value : null; }

export function classifyApplyError(stage: ApplyStage, error: unknown): ApplyDiagnostic {
  const value = shape(error); const name = typeof value.name === "string" ? value.name : ""; const message = typeof value.message === "string" ? value.message.toLocaleLowerCase() : ""; const code = safeExternalCode(value.code); const status = typeof value.status === "number" ? value.status : null;
  if (name === "TmdbApiError" && status !== null) { const category = status === 429 ? "tmdb_rate_limited" : status >= 500 ? "tmdb_5xx" : "tmdb_4xx"; return { stage, category, safeCode: String(status), retryable: status === 429 || status >= 500 }; }
  if (name === "AbortError") return { stage, category: "request_aborted", safeCode: null, retryable: true };
  if (name === "TimeoutError" || message.includes("timeout") || message.includes("timed out")) return { stage, category: "timeout", safeCode: code, retryable: true };
  if (message.includes("fetch failed") || message.includes("network")) return { stage, category: "network_error", safeCode: code, retryable: true };
  if (code?.startsWith("PGRST")) return { stage, category: "postgrest_error", safeCode: code, retryable: status !== null && status >= 500 };
  if (code && /^[0-9A-Z]{5}$/.test(code)) return { stage, category: "postgres_error", safeCode: code, retryable: false };
  if (stage.endsWith("_rpc")) return { stage, category: "rpc_rejected", safeCode: code, retryable: status !== null && status >= 500 };
  if (message.includes("invalid") || message.includes("mismatch") || message.includes("missing")) return { stage, category: "validation_error", safeCode: code, retryable: false };
  return { stage, category: "unknown_error", safeCode: code, retryable: false };
}

export class ApplyStageError extends Error {
  readonly diagnostic: ApplyDiagnostic;
  constructor(diagnostic: ApplyDiagnostic) { super("Apply stage failed safely."); this.name = "ApplyStageError"; this.diagnostic = diagnostic; }
}

export async function atApplyStage<T>(stage: ApplyStage, operation: () => Promise<T>): Promise<T> {
  try { return await operation(); } catch (error) { if (error instanceof ApplyStageError) throw error; throw new ApplyStageError(classifyApplyError(stage, error)); }
}

export function applyDiagnosticCode(diagnostic: ApplyDiagnostic): string {
  return ["apply_failed", diagnostic.stage, diagnostic.category, diagnostic.safeCode].filter(Boolean).join(":");
}
