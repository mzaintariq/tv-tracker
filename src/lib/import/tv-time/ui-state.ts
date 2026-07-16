export type MatchingUiItem = { match_status: string };
export type MatchingAutoStart = { importId: string; controller: AbortController };
export type MatchingAutoStartRef = { current: MatchingAutoStart | null };

type MatchingCoordinatorOptions = {
  continueWhilePending?: boolean;
  signal?: AbortSignal;
  yieldBetweenRuns?: () => Promise<void>;
  retryDelay?: (milliseconds: number) => Promise<void>;
  onBatchComplete?: () => void;
};

export class MatchingCoordinatorError extends Error {
  constructor(readonly code: string) {
    super("Matching paused because a request failed. Select Continue matching to retry.");
    this.name = "MatchingCoordinatorError";
  }
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

async function requestMatchingBatch(
  importId: string,
  request: typeof fetch,
  signal: AbortSignal | undefined,
  retryDelay: (milliseconds: number) => Promise<void>,
): Promise<{ claimed?: number; status?: string }> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await request(`/api/imports/${importId}/match`, { method: "POST", signal });
      if (response.ok) return await response.json() as { claimed?: number; status?: string };
      const transient = response.status === 429 || response.status >= 500;
      if (!transient || attempt === 2) throw new MatchingCoordinatorError(`matching_http_${response.status}`);
    } catch (error) {
      if (isAbortError(error) || signal?.aborted) throw error;
      if (error instanceof MatchingCoordinatorError && attempt === 2) throw error;
      if (error instanceof MatchingCoordinatorError && !error.code.match(/^matching_http_(429|5\d\d)$/)) throw error;
      if (attempt === 2) throw new MatchingCoordinatorError("matching_network");
    }
    await retryDelay(250 * (attempt + 1));
  }
  throw new MatchingCoordinatorError("matching_failed");
}

export async function runMatchingCoordinator(
  importId: string,
  request: typeof fetch = fetch,
  options: MatchingCoordinatorOptions = {},
): Promise<void> {
  const yieldBetweenRuns = options.yieldBetweenRuns ?? (() => new Promise<void>((resolve) => setTimeout(resolve, 0)));
  const retryDelay = options.retryDelay ?? ((milliseconds) => new Promise<void>((resolve) => setTimeout(resolve, milliseconds)));
  do {
    for (let batch = 0; batch < 20; batch += 1) {
      if (options.signal?.aborted) return;
      let result: { claimed?: number; status?: string };
      try {
        result = await requestMatchingBatch(importId, request, options.signal, retryDelay);
        options.onBatchComplete?.();
      } catch (error) {
        if (isAbortError(error) || options.signal?.aborted) return;
        throw error;
      }
      if (!result.claimed || (result.status !== undefined && result.status !== "matching")) return;
    }
    if (!options.continueWhilePending || options.signal?.aborted) return;
    await yieldBetweenRuns();
  } while (!options.signal?.aborted);
}

export type ImportMutationResult = { error?: string; success?: string; code?: string };

export function mutationError(result: ImportMutationResult): string | null {
  return result.error ?? null;
}

export function shouldNavigateAfterDelete(result: ImportMutationResult): boolean {
  return Boolean(result.success) && !result.error;
}

export function classifyMatchingItems<T extends MatchingUiItem>(items: T[]): {
  pending: T[];
  needsResolution: T[];
} {
  return {
    pending: items.filter((item) => ["pending", "matching"].includes(item.match_status)),
    needsResolution: items.filter((item) => ["ambiguous", "unmatched", "failed"].includes(item.match_status)),
  };
}

export function shouldAutoStartMatching(status: string, pendingCount = 0): boolean {
  return status === "matching" || pendingCount > 0;
}

export function claimMatchingAutoStart(
  attemptedImport: MatchingAutoStartRef,
  importId: string,
  enabled: boolean,
): AbortController | null {
  const current = attemptedImport.current;
  if (!enabled || (current?.importId === importId && !current.controller.signal.aborted)) return null;
  const controller = new AbortController();
  attemptedImport.current = { importId, controller };
  return controller;
}
