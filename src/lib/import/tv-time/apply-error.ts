export const TV_EPISODE_IDENTITY_ERROR = "tv_metadata_episode_identity_conflict";
export const APPLY_RESUME_TRANSITION_ERROR = "apply_resume_transition_failed";

export class ShowEpisodeReconciliationError extends Error {
  readonly code = TV_EPISODE_IDENTITY_ERROR;
  constructor() { super("TV episode metadata could not be reconciled safely."); this.name = "ShowEpisodeReconciliationError"; }
}

export class ApplyLifecycleTransitionError extends Error {
  readonly code = APPLY_RESUME_TRANSITION_ERROR;
  constructor() { super("The import could not enter the Apply lifecycle safely."); this.name = "ApplyLifecycleTransitionError"; }
}

export function safeApplyFailure(error: unknown): { code: string; message: string; diagnostic?: ApplyStageError["diagnostic"] } {
  if (error instanceof ShowEpisodeReconciliationError) return { code: error.code, message: "TV episode metadata could not be reconciled safely. The import was paused." };
  if (error instanceof ApplyLifecycleTransitionError) return { code: error.code, message: "The import could not resume Apply safely." };
  if (error instanceof ApplyStageError) return { code: applyDiagnosticCode(error.diagnostic), message: "Application paused safely.", diagnostic: error.diagnostic };
  return { code: "apply_failed", message: "Application paused safely. Re-upload the same ZIP to retry." };
}

export function applyFailureDisplay(code: string | undefined, fallback: string | undefined): string {
  return code === TV_EPISODE_IDENTITY_ERROR ? "TV episode metadata changed unexpectedly. The import was paused safely; refresh metadata before retrying." : fallback ?? "Upload failed.";
}

export function applyDiagnosticDisplay(code: string | null): { message: string; diagnostic: string; retryable: boolean } | null {
  if (!code?.startsWith("apply_failed:")) return null; const [, stage, category] = code.split(":"); if (!stage || !category) return null;
  const stageLabel: Record<string, string> = { tv_metadata_sync: "synchronizing TV metadata", tv_episode_lookup: "loading synchronized episodes", tv_apply_rpc: "applying TV history", movie_metadata_sync: "synchronizing movie metadata", movie_apply_rpc: "applying movie history" };
  const retryable = ["timeout", "network_error", "request_aborted", "tmdb_rate_limited", "tmdb_5xx"].includes(category) || (category === "postgrest_error" && code.endsWith(":500"));
  return { message: `Apply paused while ${stageLabel[stage] ?? "processing the import"}.`, diagnostic: `${stage} / ${category}`, retryable };
}
import { applyDiagnosticCode, ApplyStageError } from "./apply-diagnostics";
