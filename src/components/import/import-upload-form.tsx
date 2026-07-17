"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import type { ImportApplyProgress } from "@/lib/import/tv-time/progress";
import { IMPORT_UPLOAD_FALLBACK, readImportUploadResponse, safeImportUploadError } from "@/lib/import/tv-time/upload-response";
import { ImportApplyProgressPanel } from "./import-apply-progress";

type Feedback = { kind: "error" | "status"; text: string };

export function ImportUploadForm({ mode, importId, initialProgress }: { mode: "analyze" | "apply"; importId?: string; initialProgress?: ImportApplyProgress }) {
  const router = useRouter(); const [pending, setPending] = useState(false); const pendingRef = useRef(false); const [feedback, setFeedback] = useState<Feedback>();
  const inputId = `tv-time-${mode}-zip`;
  const instructionsId = `${inputId}-instructions`;
  const feedbackId = `${inputId}-feedback`;
  async function upload(file: File) {
    if (pendingRef.current) return; pendingRef.current = true; setPending(true); setFeedback(undefined);
    try {
      const url = mode === "analyze" ? "/api/imports/tv-time/analyze" : `/api/imports/${importId}/apply`;
      const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/zip" }, body: file });
      const result = await readImportUploadResponse(response);
      if (!response.ok) {
        if (!(mode === "apply" && result?.code === "apply_failed")) setFeedback({ kind: "error", text: safeImportUploadError(result) });
        return;
      }
      if (!result) { setFeedback({ kind: "error", text: IMPORT_UPLOAD_FALLBACK }); return; }
      if (mode === "analyze" && result.importId) { router.push(`/profile/import/${result.importId}`); return; }
      if (mode === "analyze") { setFeedback({ kind: "error", text: IMPORT_UPLOAD_FALLBACK }); return; }
      if (result.tvUnits && result.movieItems) setFeedback({ kind: "status", text: `TV units: ${result.tvUnits.applied} applied, ${result.tvUnits.blocked} blocked. Movie items: ${result.movieItems.applied} applied, ${result.movieItems.blocked} blocked.` });
      else setFeedback({ kind: "status", text: `Applied ${result.applied ?? 0} items; ${result.blocked ?? 0} remain blocked.` });
      router.refresh();
    } catch { setFeedback({ kind: "error", text: IMPORT_UPLOAD_FALLBACK }); }
    finally { pendingRef.current = false; setPending(false); }
  }
  return <div className="min-w-0 space-y-3"><label htmlFor={inputId} className="block break-words font-medium">{mode === "apply" ? "Choose the TV Time ZIP to apply" : "Choose a TV Time ZIP to analyze"}</label><input id={inputId} className="block w-full min-w-0 max-w-full text-sm file:max-w-full" type="file" accept=".zip,application/zip" required aria-describedby={`${instructionsId}${feedback ? ` ${feedbackId}` : ""}`} aria-invalid={feedback?.kind === "error" ? true : undefined} disabled={pending} onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload(file); }} /><p id={instructionsId} className="break-words text-sm text-[var(--muted)]">Required format: a ZIP file, maximum 3.5 MB. The ZIP is processed in memory and is never stored. {mode === "apply" ? "Choose the exact ZIP analyzed for this session." : "You will upload it again only when applying the import."}</p>{mode === "apply" && importId && initialProgress ? <ImportApplyProgressPanel key={initialProgress.updatedAt} importId={importId} initialProgress={initialProgress} requestPending={pending} /> : pending ? <p role="status">Processing import ZIP…</p> : null}{feedback ? <p id={feedbackId} className="break-words" role={feedback.kind === "error" ? "alert" : "status"}>{feedback.text}</p> : null}</div>;
}
