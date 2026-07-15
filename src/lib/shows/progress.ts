import type { Episode } from "@/types/database";
import { isShowEnded } from "@/lib/shows/status";

export type ProgressState = "none" | "partial" | "caught-up" | "complete";
export type ShowProgress = { watched: number; total: number; percentage: number; state: ProgressState };

export function isReleasedRegularEpisode(episode: Pick<Episode, "season_number" | "air_date">, today: string): boolean {
  return episode.season_number > 0 && episode.air_date !== null && episode.air_date <= today;
}

export function calculateShowProgress(
  episodes: readonly Pick<Episode, "id" | "season_number" | "air_date">[],
  watchedEpisodeIds: ReadonlySet<string>,
  tmdbStatus: string | null,
  today: string,
): ShowProgress {
  const released = episodes.filter((episode) => isReleasedRegularEpisode(episode, today));
  const watched = released.reduce((count, episode) => count + (watchedEpisodeIds.has(episode.id) ? 1 : 0), 0);
  const total = released.length;
  const percentage = total === 0 ? 0 : Math.round((watched / total) * 100);
  if (watched === 0) return { watched, total, percentage, state: "none" };
  if (watched < total) return { watched, total, percentage, state: "partial" };
  return { watched, total, percentage, state: isShowEnded(tmdbStatus) ? "complete" : "caught-up" };
}
