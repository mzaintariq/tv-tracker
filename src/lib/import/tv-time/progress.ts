export type ImportApplyProgress = {
  status: string;
  applyPhase: "applying" | "completed" | "paused" | "cancelled" | null;
  tvTotalEligible: number;
  tvApplied: number;
  tvBlocked: number;
  tvRemaining: number;
  movieTotalEligible: number;
  movieApplied: number;
  movieRemaining: number;
  tvSkipped: number;
  movieSkipped: number;
  lastErrorCode: string | null;
  updatedAt: string;
};

const TERMINAL_STATUSES = new Set(["completed", "paused", "cancelled", "failed"]);

export function isApplyTerminal(status: string): boolean {
  return TERMINAL_STATUSES.has(status);
}

export function progressPercent(completed: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((completed / total) * 100)));
}

export function applyingProgress(progress: ImportApplyProgress, updatedAt = new Date().toISOString()): ImportApplyProgress {
  return { ...progress, status: "applying", applyPhase: "applying", lastErrorCode: null, updatedAt };
}

export function reconcileApplyProgress(current: ImportApplyProgress, incoming: ImportApplyProgress): ImportApplyProgress {
  if (Date.parse(incoming.updatedAt) < Date.parse(current.updatedAt) || incoming.tvApplied < current.tvApplied || incoming.movieApplied < current.movieApplied) return current;
  return incoming;
}

export function applyPhaseLabel(progress: ImportApplyProgress): string {
  if (progress.status === "completed") return "Completed";
  if (progress.status === "paused") return "Paused";
  if (progress.status === "cancelled") return "Cancelled";
  if (progress.status === "applying") return "Applying TV and movie history";
  return "Ready to apply";
}

export function pausedApplyMessage(code: string | null): string {
  if (code === "tv_metadata_episode_identity_conflict") return "TV episode metadata could not be reconciled safely.";
  if (code === "apply_resume_transition_failed") return "The import could not resume safely.";
  return code ? `The import paused safely (${code}).` : "The import paused safely.";
}

type PollOptions = {
  fetchProgress: () => Promise<ImportApplyProgress>;
  onProgress: (progress: ImportApplyProgress) => void;
  onError?: () => void;
  shouldContinue: (progress: ImportApplyProgress) => boolean;
  intervalMs?: number;
  schedule?: (callback: () => void, delay: number) => ReturnType<typeof setTimeout>;
  cancel?: (timer: ReturnType<typeof setTimeout>) => void;
};

export function startImportProgressPolling(options: PollOptions): () => void {
  const schedule = options.schedule ?? setTimeout;
  const cancel = options.cancel ?? clearTimeout;
  let stopped = false;
  let inFlight = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let finalFetch = false;

  const tick = async () => {
    if (stopped || inFlight) return;
    inFlight = true;
    try {
      const progress = await options.fetchProgress();
      if (stopped) return;
      options.onProgress(progress);
      if (isApplyTerminal(progress.status)) { if (finalFetch) stopped = true; else finalFetch = true; }
      else if (!options.shouldContinue(progress)) stopped = true;
    } catch {
      if (!stopped) options.onError?.();
    } finally {
      inFlight = false;
    }
    if (!stopped) timer = schedule(() => void tick(), options.intervalMs ?? 1500);
  };

  void tick();
  return () => {
    stopped = true;
    if (timer !== undefined) cancel(timer);
  };
}
