"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { applyFailureDisplay } from "@/lib/import/tv-time/apply-error";
import type { ImportApplyProgress } from "@/lib/import/tv-time/progress";
import { ImportApplyProgressPanel } from "./import-apply-progress";

export function ImportUploadForm({ mode, importId, initialProgress }: { mode: "analyze" | "apply"; importId?: string; initialProgress?: ImportApplyProgress }) {
  const router = useRouter(); const [pending, setPending] = useState(false); const [message, setMessage] = useState<string>();
  async function upload(file: File) {
    setPending(true); setMessage(undefined);
    try {
      const url = mode === "analyze" ? "/api/imports/tv-time/analyze" : `/api/imports/${importId}/apply`;
      const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/zip" }, body: file });
      const result = await response.json() as { importId?: string; error?: string; code?: string; applied?: number; blocked?: number; tvUnits?: { applied: number; blocked: number }; movieItems?: { applied: number; blocked: number } };
      if (!response.ok) setMessage(mode === "apply" && result.code === "apply_failed" ? undefined : applyFailureDisplay(result.code, result.error));
      else if (result.importId) router.push(`/profile/import/${result.importId}`);
      else if (result.tvUnits && result.movieItems) { setMessage(`TV units: ${result.tvUnits.applied} applied, ${result.tvUnits.blocked} blocked. Movie items: ${result.movieItems.applied} applied, ${result.movieItems.blocked} blocked.`); router.refresh(); }
      else { setMessage(`Applied ${result.applied ?? 0} items; ${result.blocked ?? 0} remain blocked.`); router.refresh(); }
    } catch { setMessage("The upload could not be completed."); }
    finally { setPending(false); }
  }
  return <div className="space-y-3"><input type="file" accept=".zip,application/zip" disabled={pending} onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload(file); }} /><p className="text-sm text-[var(--muted)]">Maximum 3.5 MB. The ZIP is processed in memory and is never stored. {mode === "apply" ? "Choose the exact ZIP analyzed for this session." : "You will upload it again only when applying the import."}</p>{mode === "apply" && importId && initialProgress ? <ImportApplyProgressPanel key={initialProgress.updatedAt} importId={importId} initialProgress={initialProgress} requestPending={pending} /> : pending ? <p>Processing…</p> : null}{message ? <p role="status">{message}</p> : null}</div>;
}
