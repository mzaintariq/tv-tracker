"use client";

import { useEffect, useState } from "react";

import {
  applyPhaseLabel,
  applyingProgress,
  pausedApplyMessage,
  progressPercent,
  reconcileApplyProgress,
  startImportProgressPolling,
  type ImportApplyProgress,
} from "@/lib/import/tv-time/progress";
import { applyDiagnosticDisplay } from "@/lib/import/tv-time/apply-error";

function ProgressBar({ label, value }: { label: string; value: number }) {
  return <div className="h-2 overflow-hidden rounded-full bg-[var(--border)]" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={value}><div className="h-full bg-[var(--accent)] transition-[width]" style={{ width: `${value}%` }} /></div>;
}

export function ImportApplyProgressPanel({ importId, initialProgress, requestPending }: { importId: string; initialProgress: ImportApplyProgress; requestPending: boolean }) {
  const [progress, setProgress] = useState(initialProgress);
  const [pollError, setPollError] = useState(false);

  useEffect(() => {
    if (!requestPending && progress.status !== "applying") return;
    const controller = new AbortController();
    const stop = startImportProgressPolling({
      fetchProgress: async () => {
        const response = await fetch(`/api/imports/${importId}/progress`, { cache: "no-store", signal: controller.signal });
        if (!response.ok) throw new Error("progress_request_failed");
        return response.json() as Promise<ImportApplyProgress>;
      },
      onProgress: (next) => { setPollError(false); setProgress((current) => reconcileApplyProgress(current, next)); },
      onError: () => { if (!controller.signal.aborted) setPollError(true); },
      shouldContinue: (next) => requestPending || next.status === "applying",
    });
    return () => { controller.abort(); stop(); };
  }, [importId, progress.status, requestPending]);

  const displayed = requestPending ? applyingProgress(progress, progress.updatedAt) : progress;
  const diagnostic = applyDiagnosticDisplay(displayed.lastErrorCode);
  const tvPercent = progressPercent(displayed.tvApplied + displayed.tvBlocked, displayed.tvTotalEligible);
  const moviePercent = progressPercent(displayed.movieApplied, displayed.movieTotalEligible);
  const announcement = requestPending || displayed.status === "applying" ? "Import Apply started." : displayed.status === "completed" ? "Import Apply completed." : displayed.status === "failed" ? "Import Apply failed." : null;
  return <div className="space-y-4 rounded-lg border p-4">
    {announcement ? <p className="sr-only" role={displayed.status === "failed" ? "alert" : "status"}>{announcement}</p> : null}
    <div><p className="font-medium">{applyPhaseLabel(displayed)}{requestPending ? "…" : ""}</p><p className="text-xs text-[var(--muted)]">Last updated {new Date(displayed.updatedAt).toLocaleTimeString()}</p></div>
    <div className="space-y-2"><div className="flex justify-between gap-3"><h3 className="font-medium">TV transactional units</h3><span>{tvPercent}%</span></div><ProgressBar label="TV import progress" value={tvPercent} /><p className="text-sm text-[var(--muted)]">{displayed.tvApplied} units applied · {displayed.tvBlocked} units blocked · {displayed.tvRemaining} units remaining</p></div>
    <div className="space-y-2"><div className="flex justify-between gap-3"><h3 className="font-medium">Movie items</h3><span>{moviePercent}%</span></div><ProgressBar label="Movie import progress" value={moviePercent} /><p className="text-sm text-[var(--muted)]">{displayed.movieApplied} items applied · {displayed.movieRemaining} items remaining</p></div>
    <p className="text-sm text-[var(--muted)]">Skipped: {displayed.tvSkipped} TV · {displayed.movieSkipped} movies</p>
    {displayed.status === "paused" ? <div role="alert"><p>{diagnostic?.message ?? pausedApplyMessage(displayed.lastErrorCode)}</p>{diagnostic ? <p className="text-sm text-[var(--muted)]">Diagnostic: {diagnostic.diagnostic}. {diagnostic.retryable ? "A manual retry may be appropriate." : "Resolve the underlying issue before retrying."}</p> : null}<p className="text-sm text-[var(--muted)]">Already applied units remain saved. Re-upload the same ZIP to resume.</p></div> : null}
    {pollError ? <p className="text-sm text-[var(--muted)]">Progress temporarily unavailable; the Apply request is still running.</p> : null}
  </div>;
}
