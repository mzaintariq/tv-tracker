import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";

import { ImportApplyProgressPanel } from "@/components/import/import-apply-progress";
import {
  applyingProgress,
  progressPercent,
  reconcileApplyProgress,
  startImportProgressPolling,
  type ImportApplyProgress,
} from "./progress";

function sampleProgress(overrides: Partial<ImportApplyProgress> = {}): ImportApplyProgress {
  return {
    status: "applying",
    applyPhase: "applying",
    tvTotalEligible: 10,
    tvApplied: 4,
    tvBlocked: 1,
    tvRemaining: 5,
    movieTotalEligible: 20,
    movieApplied: 5,
    movieRemaining: 15,
    tvSkipped: 2,
    movieSkipped: 3,
    lastErrorCode: null,
    updatedAt: "2026-07-16T12:00:00Z",
    ...overrides,
  };
}

async function flush(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

describe("Apply progress polling", () => {
  it("starts while applying and never overlaps requests", async () => {
    const scheduled: Array<() => void> = [];
    let finishFirst: ((progress: ImportApplyProgress) => void) | undefined;
    const fetchProgress = vi.fn(() => new Promise<ImportApplyProgress>((resolve) => { finishFirst = resolve; }));
    const stop = startImportProgressPolling({ fetchProgress, onProgress: vi.fn(), shouldContinue: () => true, schedule: (callback) => { scheduled.push(callback); return 1 as unknown as ReturnType<typeof setTimeout>; } });
    expect(fetchProgress).toHaveBeenCalledTimes(1);
    expect(scheduled).toHaveLength(0);
    finishFirst?.(sampleProgress());
    await flush();
    expect(scheduled).toHaveLength(1);
    scheduled[0](); scheduled[0]();
    expect(fetchProgress).toHaveBeenCalledTimes(2);
    stop();
  });

  it.each(["completed", "paused"])("performs one final persisted fetch and stops on %s", async (status) => {
    const scheduled: Array<() => void> = []; const schedule = vi.fn((callback: () => void) => { scheduled.push(callback); return 1 as unknown as ReturnType<typeof setTimeout>; });
    const onProgress = vi.fn();
    startImportProgressPolling({ fetchProgress: async () => sampleProgress({ status }), onProgress, shouldContinue: () => true, schedule });
    await flush();
    expect(onProgress).toHaveBeenCalledOnce();
    expect(schedule).toHaveBeenCalledOnce(); scheduled[0](); await flush(); expect(onProgress).toHaveBeenCalledTimes(2); expect(schedule).toHaveBeenCalledOnce();
  });
});

describe("Apply progress presentation", () => {
  it("uses independent TV and movie denominators", () => {
    expect(progressPercent(5, 10)).toBe(50);
    expect(progressPercent(5, 20)).toBe(25);
  });

  it("restores counts, separates blocked/skipped, and shows a safe paused error", () => {
    const markup = renderToStaticMarkup(createElement(ImportApplyProgressPanel, {
      importId: "00000000-0000-0000-0000-000000000001",
      initialProgress: sampleProgress({ status: "paused", applyPhase: "paused", lastErrorCode: "tv_metadata_episode_identity_conflict" }),
      requestPending: false,
    }));
    expect(markup).toContain("4 units applied · 1 units blocked · 5 units remaining");
    expect(markup).toContain("5 items applied · 15 items remaining");
    expect(markup).toContain("Skipped: 2 TV · 3 movies");
    expect(markup).toContain("Already applied units remain saved");
    expect(markup.match(/role="progressbar"/g)).toHaveLength(2);
    expect(markup).not.toContain('aria-live="polite"');
    expect(markup).toContain('role="alert"');
    expect(markup).not.toContain("constraint");
  });

  it("replaces stale paused state immediately and rejects older polling state", () => {
    const paused = sampleProgress({ status: "paused", applyPhase: "paused", lastErrorCode: "apply_failed", updatedAt: "2026-07-16T12:00:00Z" });
    const applying = applyingProgress(paused, "2026-07-16T12:01:00Z");
    expect(applying).toMatchObject({ status: "applying", applyPhase: "applying", lastErrorCode: null });
    expect(reconcileApplyProgress(applying, paused)).toEqual(applying);
    expect(reconcileApplyProgress(sampleProgress({ tvApplied: 289 }), sampleProgress({ tvApplied: 288 }))).toMatchObject({ tvApplied: 289 });
  });

  it("does not render a second generic lifecycle message from the upload response", () => {
    const source = readFileSync("src/components/import/import-upload-form.tsx", "utf8");
    expect(source).toContain('mode === "apply" && result?.code === "apply_failed"');
  });

  it("exposes only aggregate fields from the authenticated progress function", () => {
    const migration = readFileSync("supabase/migrations/20260716020000_apply_lifecycle_progress.sql", "utf8");
    const sql = migration.slice(migration.indexOf("create function public.get_tv_time_import_apply_progress"), migration.indexOf("revoke execute on function public.get_tv_time_import_apply_progress"));
    const route = readFileSync("src/app/api/imports/[importId]/progress/route.ts", "utf8");
    for (const field of ["tvTotalEligible", "tvApplied", "tvBlocked", "tvRemaining", "movieTotalEligible", "movieApplied", "movieRemaining", "tvSkipped", "movieSkipped", "lastErrorCode", "updatedAt"]) expect(sql).toContain(`'${field}'`);
    for (const forbidden of ["source_title", "source_key", "match_context", "candidate", "source_fingerprint"]) expect(sql).not.toContain(forbidden);
    expect(sql).toContain("i.user_id = auth.uid()");
    expect(route).toContain("supabase.auth.getUser()");
  });
});
