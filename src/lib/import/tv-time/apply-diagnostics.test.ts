import { describe, expect, it } from "vitest";
import { applyDiagnosticCode, atApplyStage, classifyApplyError, type ApplyStageError } from "./apply-diagnostics";
import { applyDiagnosticDisplay, safeApplyFailure } from "./apply-error";

describe("sanitized Apply diagnostics", () => {
  it("categorizes TMDB synchronization failures and rate limits", () => {
    expect(classifyApplyError("tv_metadata_sync", { name: "TmdbApiError", status: 503 })).toMatchObject({ stage: "tv_metadata_sync", category: "tmdb_5xx", retryable: true, safeCode: "503" });
    expect(classifyApplyError("tv_metadata_sync", { name: "TmdbApiError", status: 429 })).toMatchObject({ category: "tmdb_rate_limited", retryable: true });
  });
  it("categorizes PostgREST, RPC, abort, validation, and unknown errors", () => {
    expect(classifyApplyError("tv_episode_lookup", { code: "PGRST301", status: 500 })).toMatchObject({ category: "postgrest_error", safeCode: "PGRST301", retryable: true });
    expect(classifyApplyError("tv_apply_rpc", { code: "23514" })).toMatchObject({ category: "postgres_error", retryable: false });
    expect(classifyApplyError("tv_metadata_sync", new DOMException("aborted", "AbortError"))).toMatchObject({ category: "request_aborted", retryable: true });
    expect(classifyApplyError("tv_payload_build", new Error("Invalid payload"))).toMatchObject({ category: "validation_error", retryable: false });
    expect(classifyApplyError("tv_item_load", new Error("private title coordinate token"))).toMatchObject({ category: "unknown_error", safeCode: null });
  });
  it("wraps a stage without retaining raw source details", async () => {
    let caught: ApplyStageError | undefined; try { await atApplyStage("tv_episode_lookup", async () => { throw Object.assign(new Error("Private title S01E02 token"), { code: "PGRST116" }); }); } catch (error) { caught = error as ApplyStageError; }
    const failure = safeApplyFailure(caught); expect(failure.code).toBe("apply_failed:tv_episode_lookup:postgrest_error:PGRST116"); expect(JSON.stringify(failure)).not.toMatch(/Private|S01E02|token/);
  });
  it("creates bounded stable codes and safe display text", () => {
    const code = applyDiagnosticCode({ stage: "tv_metadata_sync", category: "tmdb_5xx", safeCode: "503", retryable: true }); expect(code).toBe("apply_failed:tv_metadata_sync:tmdb_5xx:503");
    expect(applyDiagnosticDisplay(code)).toEqual({ message: "Apply paused while synchronizing TV metadata.", diagnostic: "tv_metadata_sync / tmdb_5xx", retryable: true });
  });
});
