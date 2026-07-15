export const EPISODE_METADATA_STALE_HOURS = 24;
export const UPCOMING_SHOW_REFRESH_CONCURRENCY = 2;

const HOUR_MS = 60 * 60 * 1000;

export function isEpisodeMetadataStale(
  episodesSyncedAt: string | null,
  now: Date,
): boolean {
  if (episodesSyncedAt === null) return true;
  const synchronizedAt = Date.parse(episodesSyncedAt);
  if (!Number.isFinite(synchronizedAt)) return true;
  return synchronizedAt <= now.getTime() - EPISODE_METADATA_STALE_HOURS * HOUR_MS;
}

export function shouldAutomaticallyRefreshEpisodes(
  trackingStatus: ShowTrackingStatus,
  tmdbStatus: string | null,
  episodesSyncedAt: string | null,
  now: Date,
): boolean {
  return trackingStatus === "active" &&
    !isShowEnded(tmdbStatus) &&
    isEpisodeMetadataStale(episodesSyncedAt, now);
}

export function regularSeasonSyncSucceeded(failedSeasons: readonly number[]): boolean {
  return failedSeasons.every((season) => season === 0);
}

export async function settleWithConcurrency<T, R>(
  items: readonly T[],
  concurrency: number,
  task: (item: T) => Promise<R>,
): Promise<PromiseSettledResult<R>[]> {
  const results: PromiseSettledResult<R>[] = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      try {
        results[index] = { status: "fulfilled", value: await task(items[index]) };
      } catch (reason) {
        results[index] = { status: "rejected", reason };
      }
    }
  }
  const workerCount = Math.min(Math.max(1, concurrency), items.length);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return results;
}
import { isShowEnded } from "@/lib/shows/status";
import type { ShowTrackingStatus } from "@/types/database";
