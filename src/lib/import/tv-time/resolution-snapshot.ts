import type { ImportIssueForDisplay } from "./issues-ui";
import type { CandidateDisplay } from "./matching-quality";

export type ResolutionSnapshotItem = {
  id: string;
  mediaType: "tv" | "movie";
  sourceTitle: string;
  matchStatus: "ambiguous" | "unmatched" | "failed";
  importMode: string;
  candidates: number[];
  candidateMetadata: CandidateDisplay[];
};

export type ResolutionSnapshot = {
  revision: string;
  sequence: number;
  items: ResolutionSnapshotItem[];
  issues: ImportIssueForDisplay[];
  counts: {
    tv: Record<"ambiguous" | "unmatched" | "failed", number>;
    movie: Record<"ambiguous" | "unmatched" | "failed", number>;
    openBlocking: number;
    openInformational: number;
  };
};

export function acceptResolutionSnapshot(current: ResolutionSnapshot, incoming: ResolutionSnapshot, latestSequence: number, resolvedIds: ReadonlySet<string>) {
  if (incoming.sequence < latestSequence) return current;
  return { ...incoming, items: incoming.items.filter((item) => !resolvedIds.has(item.id)) };
}

export function resolutionRevision(input: { itemUpdatedAt?: string | null; issueUpdatedAt?: string | null; unresolvedCount: number; openIssueCount: number }) {
  return [input.itemUpdatedAt ?? "", input.issueUpdatedAt ?? "", input.unresolvedCount, input.openIssueCount].join(":");
}

export function createResolutionSnapshotLoader(options: { fetchSnapshot: (signal: AbortSignal) => Promise<ResolutionSnapshot>; onSnapshot: (snapshot: ResolutionSnapshot) => void; onError: () => void }) {
  let running = false;
  let queued = false;
  let stopped = false;
  let sequence = 0;
  let controller: AbortController | null = null;
  const run = async () => {
    if (stopped) return;
    if (running) { queued = true; return; }
    running = true; controller = new AbortController(); const requestSequence = ++sequence;
    try { const snapshot = await options.fetchSnapshot(controller.signal); if (!stopped) options.onSnapshot({ ...snapshot, sequence: requestSequence }); }
    catch (error) { if (!stopped && !(error instanceof DOMException && error.name === "AbortError")) options.onError(); }
    finally { running = false; controller = null; if (!stopped && queued) { queued = false; void run(); } }
  };
  return { refresh: () => void run(), stop: () => { stopped = true; queued = false; controller?.abort(); }, isRunning: () => running };
}

export type EtaSample = { at: number; processed: number };
export function matchingEta(samples: EtaSample[], remaining: number): string | null {
  if (remaining <= 0 || samples.length < 2) return null;
  const recent = samples.filter((sample) => sample.at >= samples[samples.length - 1].at - 120_000);
  const first = recent[0]; const last = recent[recent.length - 1];
  if (!first || !last || last.at - first.at < 20_000 || last.processed - first.processed < 30) return null;
  const perMinute = ((last.processed - first.processed) * 60_000) / (last.at - first.at);
  if (!Number.isFinite(perMinute) || perMinute < 1) return null;
  const minutes = Math.max(1, Math.ceil(remaining / perMinute));
  return `About ${minutes} minute${minutes === 1 ? "" : "s"} remaining`;
}
