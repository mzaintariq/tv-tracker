"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { confirmImportCandidate, deleteImportSession, forgetAllTvTimeImportData, resolveImportIssue, setImportPaused, skipAllUnresolvedImportItems, skipImportItem } from "@/app/actions/imports";
import { claimMatchingAutoStart, MatchingCoordinatorError, mutationError, runMatchingCoordinator, shouldNavigateAfterDelete } from "@/lib/import/tv-time/ui-state";
import type { MatchingAutoStart } from "@/lib/import/tv-time/ui-state";
import type { CandidateDisplay } from "@/lib/import/tv-time/matching-quality";
import { CandidateCard, candidatesForDisplay } from "./candidate-card";
import { notifyResolutionRefresh } from "./resolution-events";

export function MatchMoreButton({ importId, autoStart = false }: { importId: string; autoStart?: boolean }) {
  const router = useRouter(); const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const autoStartedImport = useRef<MatchingAutoStart | null>(null);
  const run = useCallback(async (signal?: AbortSignal) => {
    setPending(true);
    setError(null);
    try { await runMatchingCoordinator(importId, fetch, { continueWhilePending: true, signal, onBatchComplete: () => { window.dispatchEvent(new CustomEvent("tv-time-matching-progress", { detail: { importId } })); notifyResolutionRefresh(importId); } }); }
    catch (cause) { window.dispatchEvent(new CustomEvent("tv-time-matching-stopped", { detail: { importId } })); setError(cause instanceof MatchingCoordinatorError ? cause.message : "Matching paused because a request failed. Select Continue matching to retry."); }
    finally { setPending(false); router.refresh(); }
  }, [importId, router]);
  useEffect(() => {
    const controller = claimMatchingAutoStart(autoStartedImport, importId, autoStart);
    if (!controller) return;
    void run(controller.signal);
    return () => controller.abort();
  }, [autoStart, importId, run]);
  return <div className="space-y-2"><button className="rounded-lg border px-3 py-2" disabled={pending} onClick={() => void run()}>{pending ? "Matching…" : "Continue matching"}</button>{error ? <p role="alert" className="text-sm text-[var(--danger)]">{error}</p> : null}</div>;
}

export function ResolutionControls({ importId, itemId, candidates, candidateMetadata }: { importId: string; itemId: string; candidates: number[]; candidateMetadata?: CandidateDisplay[] }) {
  const [pending, setPending] = useState(false); const [error, setError] = useState<string | null>(null); const run = async (action: () => Promise<{ error?: string; success?: string }>) => { setPending(true); setError(null); const result = await action(); setError(mutationError(result)); setPending(false); if (!result.error) notifyResolutionRefresh(importId, itemId); };
  const [manualId, setManualId] = useState("");
  return <div className="space-y-3"><div className="grid gap-3 sm:grid-cols-2">{candidatesForDisplay(candidates, candidateMetadata).map((candidate) => <CandidateCard key={candidate.id} candidate={candidate} disabled={pending} onUse={() => void run(() => confirmImportCandidate(importId, itemId, candidate.id))} />)}</div><div className="flex flex-wrap gap-2"><input className="w-36 rounded-lg border px-3 py-2" inputMode="numeric" aria-label="Manual TMDB ID" placeholder="TMDB ID" value={manualId} onChange={(event) => setManualId(event.target.value)} /><button disabled={pending || !/^\d+$/.test(manualId)} className="rounded-lg border px-3 py-2" onClick={() => void run(() => confirmImportCandidate(importId, itemId, Number(manualId)))}>Confirm ID</button><button disabled={pending} className="rounded-lg border px-3 py-2 text-[var(--danger)]" onClick={() => void run(() => skipImportItem(importId, itemId))}>Skip this import</button></div>{error ? <p role="alert" className="text-sm text-[var(--danger)]">{error}</p> : null}</div>;
}

export function IssueDecision({ importId, issueId }: { importId: string; issueId: string }) {
  const [pending, setPending] = useState(false); const pendingRef = useRef(false); const [message, setMessage] = useState<string | null>(null); const [error, setError] = useState<string | null>(null);
  const decide = async (accepted: boolean) => { if (pendingRef.current) return; pendingRef.current=true; setPending(true); setMessage(null); setError(null); const result=await resolveImportIssue(importId,issueId,accepted); pendingRef.current=false; setPending(false); if (result.error) { setError(mutationError(result)); return; } setMessage(result.success ?? "Decision saved."); notifyResolutionRefresh(importId); };
  return <div className="space-y-2"><div className="flex gap-2"><button disabled={pending} className="rounded-lg border px-3 py-2" onClick={() => void decide(true)}>Confirm</button><button disabled={pending} className="rounded-lg border px-3 py-2" onClick={() => void decide(false)}>Decline</button></div>{message ? <p role="status" className="text-sm">{message}</p> : null}{error ? <p role="alert" className="text-sm text-[var(--danger)]">{error}</p> : null}</div>;
}

export function SkipCoordinateButton({ importId, issueId }: { importId: string; issueId: string }) {
  const [error, setError] = useState<string | null>(null); return <div className="space-y-2"><button className="rounded-lg border px-3 py-2" onClick={async () => { const result = await resolveImportIssue(importId, issueId, false); setError(mutationError(result)); if (!result.error) notifyResolutionRefresh(importId); }}>Skip this episode record</button><p className="text-sm text-[var(--muted)]">This skips only this unmatched episode record. The show and all other successfully matched episode history can still be imported.</p>{error ? <p role="alert" className="text-sm text-[var(--danger)]">{error}</p> : null}</div>;
}

export function DeleteImportButton({ importId }: { importId: string }) {
  const router = useRouter(); const [error, setError] = useState<string | null>(null); return <div className="space-y-2"><button className="rounded-lg border px-3 py-2 text-[var(--danger)]" onClick={async () => { if (!window.confirm("Delete this import session? Imported library data and reusable mappings remain.")) return; setError(null); const result = await deleteImportSession(importId); if (shouldNavigateAfterDelete(result)) router.push("/profile/import"); else setError(mutationError(result)); }}>Delete import session</button>{error ? <p role="alert" className="text-sm text-[var(--danger)]">{error}</p> : null}</div>;
}

export function SkipAllUnresolvedButton({ importId, count }: { importId: string; count: number }) {
  const router = useRouter(); const [error, setError] = useState<string | null>(null); const [pending, setPending] = useState(false);
  return <div className="space-y-2"><button disabled={pending || count === 0} className="rounded-lg border px-3 py-2 text-[var(--danger)]" onClick={async () => { if (!window.confirm(`Skip all ${count} unresolved media items? Confirmed, pending, matching, applied, and non-media decisions will not be changed.`)) return; setPending(true); setError(null); const result = await skipAllUnresolvedImportItems(importId); setPending(false); setError(mutationError(result)); if (!result.error) router.refresh(); }}>{pending ? "Skipping unresolved media…" : `Skip all unresolved media (${count})`}</button>{error ? <p role="alert" className="text-sm text-[var(--danger)]">{error}</p> : null}</div>;
}

export function PauseResumeButton({ importId, paused }: { importId: string; paused: boolean }) {
  const router = useRouter(); return <button className="rounded-lg border px-3 py-2" onClick={async () => { await setImportPaused(importId, !paused); router.refresh(); }}>{paused ? "Resume import" : "Pause import"}</button>;
}

export function ForgetTvTimeButton() {
  const router = useRouter(); return <button className="rounded-lg border px-3 py-2 text-[var(--danger)]" onClick={async () => { if (!window.confirm("Forget all TV Time import sessions and reusable mappings? Imported TrackTV data remains.")) return; await forgetAllTvTimeImportData(); router.refresh(); }}>Forget all TV Time import data</button>;
}
