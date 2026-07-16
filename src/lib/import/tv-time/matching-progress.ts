export type PersistedMatchingItem = { match_status: string };

export type AutomaticMatchingProgress = {
  status: string;
  total: number;
  processed: number;
  remaining: number;
  confirmed: number;
  needsReview: number;
  skipped: number;
  percentage: number;
  complete: boolean;
};

export type MatchingProgressSnapshot = AutomaticMatchingProgress;

export function matchingProgressFromCounts(input: { status: string; total: number; unfinished: number; confirmed: number; needsReview: number; skipped: number }): MatchingProgressSnapshot {
  const total = Math.max(0, input.total);
  const remaining = Math.max(0, Math.min(total, input.unfinished));
  const processed = total - remaining;
  const percentage = total === 0 ? 100 : Math.max(0, Math.min(100, Math.floor((processed / total) * 100)));
  return { status: input.status, total, processed, remaining, confirmed: Math.max(0, input.confirmed), needsReview: Math.max(0, input.needsReview), skipped: Math.max(0, input.skipped), percentage, complete: remaining === 0 };
}

export function automaticMatchingProgress(items: PersistedMatchingItem[]): AutomaticMatchingProgress {
  const total = items.length;
  const remaining = items.filter((item) => item.match_status === "pending" || item.match_status === "matching").length;
  const confirmed = items.filter((item) => item.match_status === "confirmed").length;
  const needsReview = items.filter((item) => ["ambiguous", "unmatched", "failed"].includes(item.match_status)).length;
  const skipped = items.filter((item) => item.match_status === "skipped").length;
  const processed = Math.max(0, Math.min(total, total - remaining));
  const percentage = total === 0 ? 100 : Math.max(0, Math.min(100, Math.floor((processed / total) * 100)));

  return { status: remaining ? "matching" : "awaiting_resolution", total, processed, remaining, confirmed, needsReview, skipped, percentage, complete: remaining === 0 };
}

export function reconcileMatchingProgress(current: MatchingProgressSnapshot, incoming: MatchingProgressSnapshot): MatchingProgressSnapshot {
  if (incoming.total !== current.total || incoming.processed < current.processed) return current;
  return incoming;
}

export function startMatchingProgressPolling(options: { fetchProgress: () => Promise<MatchingProgressSnapshot>; onProgress: (progress: MatchingProgressSnapshot) => void; onError?: () => void; shouldContinue: (progress: MatchingProgressSnapshot) => boolean; schedule?: (callback: () => void, delay: number) => ReturnType<typeof setTimeout>; intervalMs?: number }) {
  let stopped=false; let running=false; let queued=false; let continuePolling=true; let timer: ReturnType<typeof setTimeout> | undefined;
  const schedule=options.schedule ?? ((callback,delay)=>setTimeout(callback,delay)); const interval=options.intervalMs ?? 1500;
  const run=async()=>{ if(stopped)return; if(running){queued=true;return;} if(timer!==undefined){clearTimeout(timer);timer=undefined;} running=true; try { const progress=await options.fetchProgress(); if(stopped)return; options.onProgress(progress); continuePolling=options.shouldContinue(progress); } catch { if(!stopped){options.onError?.();continuePolling=true;} } finally { running=false; if(stopped)return; if(queued){queued=false;void run();}else if(continuePolling)timer=schedule(()=>void run(),interval); } };
  void run();
  return { refresh:()=>void run(), stop:()=>{ stopped=true; if(timer!==undefined)clearTimeout(timer); } };
}
