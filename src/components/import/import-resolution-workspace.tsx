"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ImportIssueForDisplay } from "@/lib/import/tv-time/issues-ui";
import { acceptResolutionSnapshot, createResolutionSnapshotLoader, type ResolutionSnapshot } from "@/lib/import/tv-time/resolution-snapshot";
import { ImportIssuesDisclosure } from "./import-issues-disclosure";
import { ImportResolutionSections } from "./import-resolution-sections";
import { RESOLUTION_REFRESH_EVENT } from "./resolution-events";

export function ImportResolutionWorkspace({ importId, initialItems, initialIssues, initialRevision }: { importId: string; initialItems: ResolutionSnapshot["items"]; initialIssues: ImportIssueForDisplay[]; initialRevision: string }) {
  const initial: ResolutionSnapshot = { revision: initialRevision, sequence: 0, items: initialItems, issues: initialIssues, counts: { tv: { ambiguous: 0, unmatched: 0, failed: 0 }, movie: { ambiguous: 0, unmatched: 0, failed: 0 }, openBlocking: 0, openInformational: 0 } };
  const [snapshot, setSnapshot] = useState(initial); const snapshotRef = useRef(initial); const sequenceRef = useRef(0); const resolvedIdsRef = useRef(new Set<string>()); const [warning, setWarning] = useState(false);
  const accept = useCallback((incoming: ResolutionSnapshot) => { const next = acceptResolutionSnapshot(snapshotRef.current, incoming, sequenceRef.current, resolvedIdsRef.current); if (next === snapshotRef.current) return; sequenceRef.current = incoming.sequence; snapshotRef.current = next; setSnapshot(next); setWarning(false); }, []);
  const fetchSnapshot = useCallback(async (signal: AbortSignal) => { const response = await fetch(`/api/imports/${importId}/resolution-snapshot`, { cache: "no-store", signal }); if (!response.ok) throw new Error("resolution_snapshot_request_failed"); return response.json() as Promise<ResolutionSnapshot>; }, [importId]);
  useEffect(() => { const loader = createResolutionSnapshotLoader({ fetchSnapshot, onSnapshot: accept, onError: () => setWarning(true) }); const listener = (event: Event) => { const detail = (event as CustomEvent<{ importId: string; resolvedItemId?: string }>).detail; if (detail?.importId !== importId) return; if (detail.resolvedItemId) { resolvedIdsRef.current.add(detail.resolvedItemId); const next = { ...snapshotRef.current, items: snapshotRef.current.items.filter((item) => item.id !== detail.resolvedItemId) }; snapshotRef.current = next; setSnapshot(next); } loader.refresh(); }; window.addEventListener(RESOLUTION_REFRESH_EVENT, listener); return () => { loader.stop(); window.removeEventListener(RESOLUTION_REFRESH_EVENT, listener); }; }, [accept, fetchSnapshot, importId]);
  return <div className="space-y-8">{warning ? <p className="text-sm text-[var(--muted)]" role="status">Resolution status could not be refreshed. The last saved list remains visible.</p> : null}<ImportResolutionSections importId={importId} items={snapshot.items} /><ImportIssuesDisclosure importId={importId} issues={snapshot.issues} /></div>;
}
