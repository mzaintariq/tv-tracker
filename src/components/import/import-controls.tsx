"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { confirmImportCandidate, deleteImportSession, forgetAllTvTimeImportData, resolveImportIssue, setImportPaused, skipAllUnresolvedImportItems, skipImportItem } from "@/app/actions/imports";
import type { CandidateDisplay } from "@/lib/import/tv-time/matching-quality";
import { claimMatchingAutoStart, MatchingCoordinatorError, mutationError, runMatchingCoordinator, shouldNavigateAfterDelete, type MatchingAutoStart } from "@/lib/import/tv-time/ui-state";
import { CandidateCard, candidatesForDisplay } from "./candidate-card";
import { notifyResolutionRefresh } from "./resolution-events";

const unexpectedMutationError = "The import action could not be completed. Please try again.";
const secondaryButton = "interactive-control touch-target max-w-full whitespace-normal rounded-lg border bg-[var(--surface)] px-3 py-2 text-sm font-semibold text-[var(--foreground)]";
const dangerButton = "interactive-control touch-target max-w-full whitespace-normal rounded-lg border bg-[var(--surface)] px-3 py-2 text-sm font-semibold text-[var(--danger)]";

export function MatchMoreButton({ importId, autoStart = false }: { importId: string; autoStart?: boolean }) {
  const router = useRouter(); const [pending, setPending] = useState(false); const [error, setError] = useState<string | null>(null); const autoStartedImport = useRef<MatchingAutoStart | null>(null);
  const run = useCallback(async (signal?: AbortSignal) => { setPending(true); setError(null); try { await runMatchingCoordinator(importId, fetch, { continueWhilePending: true, signal, onBatchComplete: () => { window.dispatchEvent(new CustomEvent("tv-time-matching-progress", { detail: { importId } })); notifyResolutionRefresh(importId); } }); } catch (cause) { window.dispatchEvent(new CustomEvent("tv-time-matching-stopped", { detail: { importId } })); setError(cause instanceof MatchingCoordinatorError ? cause.message : "Matching paused because a request failed. Select Continue matching to retry."); } finally { setPending(false); router.refresh(); } }, [importId, router]);
  useEffect(() => { const controller = claimMatchingAutoStart(autoStartedImport, importId, autoStart); if (!controller) return; void run(controller.signal); return () => controller.abort(); }, [autoStart, importId, run]);
  return <div className="space-y-2"><button className={secondaryButton} disabled={pending} onClick={() => void run()}>{pending ? "Matching…" : "Continue matching"}</button>{error ? <p role="alert" className="text-sm text-[var(--danger)]">{error}</p> : null}</div>;
}

export function ResolutionControls({ importId, itemId, itemLabel = "this import item", candidates, candidateMetadata }: { importId: string; itemId: string; itemLabel?: string; candidates: number[]; candidateMetadata?: CandidateDisplay[] }) {
  const [pending, setPending] = useState(false); const pendingRef = useRef(false); const [error, setError] = useState<string | null>(null); const [manualId, setManualId] = useState("");
  const run = async (action: () => Promise<{ error?: string; success?: string }>) => {
    if (pendingRef.current) return; pendingRef.current = true; setPending(true); setError(null);
    try { const result = await action(); if (result.error) { setError(mutationError(result)); return; } notifyResolutionRefresh(importId, itemId); }
    catch { setError(unexpectedMutationError); }
    finally { pendingRef.current = false; setPending(false); }
  };
  const manualIdInput = `manual-tmdb-${itemId}`;
  const manualHelp = `${manualIdInput}-help`;
  return <div className="min-w-0 space-y-3"><div className="grid min-w-0 gap-3 sm:grid-cols-2">{candidatesForDisplay(candidates, candidateMetadata).map((candidate) => <CandidateCard key={candidate.id} candidate={candidate} disabled={pending} onUse={() => void run(() => confirmImportCandidate(importId, itemId, candidate.id))} />)}</div><div className="min-w-0 space-y-2"><label htmlFor={manualIdInput} className="block break-words text-sm font-medium">Manual TMDB ID for {itemLabel}</label><p id={manualHelp} className="break-words text-sm text-[var(--muted)]">Enter the numeric TMDB identifier when none of the suggested matches is correct.</p><div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap"><input id={manualIdInput} className="interactive-control touch-target w-full min-w-0 max-w-full rounded-lg border bg-[var(--surface)] px-3 py-2 text-[var(--foreground)] sm:w-36" inputMode="numeric" aria-describedby={manualHelp} placeholder="TMDB ID" value={manualId} onChange={(event) => setManualId(event.target.value)} /><button aria-label={`Confirm TMDB ID for ${itemLabel}`} disabled={pending || !/^\d+$/.test(manualId)} className={secondaryButton} onClick={() => void run(() => confirmImportCandidate(importId, itemId, Number(manualId)))}>Confirm ID</button><button aria-label={`Skip ${itemLabel} from this import`} disabled={pending} className={dangerButton} onClick={() => void run(() => skipImportItem(importId, itemId))}>Skip this import</button></div></div>{error ? <p role="alert" className="break-words text-sm text-[var(--danger)]">{error}</p> : null}</div>;
}

export function IssueDecision({ importId, issueId }: { importId: string; issueId: string }) {
  const [pending, setPending] = useState(false); const pendingRef = useRef(false); const [message, setMessage] = useState<string | null>(null); const [error, setError] = useState<string | null>(null);
  const decide = async (accepted: boolean) => { if (pendingRef.current) return; pendingRef.current = true; setPending(true); setMessage(null); setError(null); const result = await resolveImportIssue(importId, issueId, accepted); pendingRef.current = false; setPending(false); if (result.error) { setError(mutationError(result)); return; } setMessage(result.success ?? "Decision saved."); notifyResolutionRefresh(importId); };
  return <div className="space-y-2"><div className="flex gap-2"><button disabled={pending} className={secondaryButton} onClick={() => void decide(true)}>Confirm</button><button disabled={pending} className={secondaryButton} onClick={() => void decide(false)}>Decline</button></div>{message ? <p role="status" className="text-sm">{message}</p> : null}{error ? <p role="alert" className="text-sm text-[var(--danger)]">{error}</p> : null}</div>;
}

export function SkipCoordinateButton({ importId, issueId }: { importId: string; issueId: string }) {
  const [pending, setPending] = useState(false); const pendingRef = useRef(false); const [error, setError] = useState<string | null>(null); const [message, setMessage] = useState<string | null>(null);
  const skip = async () => { if (pendingRef.current) return; pendingRef.current = true; setPending(true); setError(null); setMessage(null); try { const result = await resolveImportIssue(importId, issueId, false); if (result.error) { setError(mutationError(result)); return; } setMessage(result.success ?? "Episode record skipped."); notifyResolutionRefresh(importId); } catch { setError(unexpectedMutationError); } finally { pendingRef.current = false; setPending(false); } };
  return <div className="space-y-2"><button disabled={pending} className={secondaryButton} onClick={() => void skip()}>{pending ? "Skipping episode record…" : "Skip this episode record"}</button><p className="text-sm text-[var(--muted)]">This skips only this unmatched episode record. The show and all other successfully matched episode history can still be imported.</p>{message ? <p role="status" className="text-sm">{message}</p> : null}{error ? <p role="alert" className="text-sm text-[var(--danger)]">{error}</p> : null}</div>;
}

export function DeleteImportButton({ importId }: { importId: string }) {
  const router = useRouter(); const [pending, setPending] = useState(false); const pendingRef = useRef(false); const [error, setError] = useState<string | null>(null);
  const remove = async () => { if (pendingRef.current || !window.confirm("Delete this import session? Imported library data and reusable mappings remain.")) return; pendingRef.current = true; setPending(true); setError(null); try { const result = await deleteImportSession(importId); if (shouldNavigateAfterDelete(result)) router.push("/profile/import"); else setError(mutationError(result) ?? unexpectedMutationError); } catch { setError(unexpectedMutationError); } finally { pendingRef.current = false; setPending(false); } };
  return <div className="space-y-2"><button disabled={pending} className={dangerButton} onClick={() => void remove()}>{pending ? "Deleting import…" : "Delete import session"}</button>{error ? <p role="alert" className="text-sm text-[var(--danger)]">{error}</p> : null}</div>;
}

export function SkipAllUnresolvedButton({ importId, count }: { importId: string; count: number }) {
  const router = useRouter(); const [error, setError] = useState<string | null>(null); const [pending, setPending] = useState(false);
  return <div className="space-y-2"><button disabled={pending || count === 0} className={dangerButton} onClick={async () => { if (!window.confirm(`Skip all ${count} unresolved media items? Confirmed, pending, matching, applied, and non-media decisions will not be changed.`)) return; setPending(true); setError(null); const result = await skipAllUnresolvedImportItems(importId); setPending(false); setError(mutationError(result)); if (!result.error) router.refresh(); }}>{pending ? "Skipping unresolved media…" : `Skip all unresolved media (${count})`}</button>{error ? <p role="alert" className="text-sm text-[var(--danger)]">{error}</p> : null}</div>;
}

export function PauseResumeButton({ importId, paused }: { importId: string; paused: boolean }) {
  const router = useRouter(); const [pending, setPending] = useState(false); const pendingRef = useRef(false); const [error, setError] = useState<string | null>(null); const [message, setMessage] = useState<string | null>(null);
  const toggle = async () => { if (pendingRef.current) return; pendingRef.current = true; setPending(true); setError(null); setMessage(null); try { const result = await setImportPaused(importId, !paused); if (result.error) { setError(mutationError(result)); return; } setMessage(result.success ?? (paused ? "Import ready to resume." : "Import paused.")); router.refresh(); } catch { setError(unexpectedMutationError); } finally { pendingRef.current = false; setPending(false); } };
  return <div className="space-y-2"><button disabled={pending} className={secondaryButton} onClick={() => void toggle()}>{pending ? (paused ? "Resuming import…" : "Pausing import…") : paused ? "Resume import" : "Pause import"}</button>{message ? <p role="status" className="text-sm">{message}</p> : null}{error ? <p role="alert" className="text-sm text-[var(--danger)]">{error}</p> : null}</div>;
}

export function ForgetTvTimeButton() {
  const router = useRouter(); const [pending, setPending] = useState(false); const pendingRef = useRef(false); const [error, setError] = useState<string | null>(null); const [message, setMessage] = useState<string | null>(null);
  const forget = async () => { if (pendingRef.current || !window.confirm("Forget all TV Time import sessions and reusable mappings? Imported TrackTV data remains.")) return; pendingRef.current = true; setPending(true); setError(null); setMessage(null); try { const result = await forgetAllTvTimeImportData(); if (result.error) { setError(mutationError(result)); return; } setMessage(result.success ?? "TV Time import data forgotten."); router.refresh(); } catch { setError(unexpectedMutationError); } finally { pendingRef.current = false; setPending(false); } };
  return <div className="space-y-2"><button disabled={pending} className={dangerButton} onClick={() => void forget()}>{pending ? "Forgetting TV Time data…" : "Forget all TV Time import data"}</button>{message ? <p role="status" className="text-sm">{message}</p> : null}{error ? <p role="alert" className="text-sm text-[var(--danger)]">{error}</p> : null}</div>;
}
