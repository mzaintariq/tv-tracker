import type { Episode } from "@/types/database";

export type InitialProgressSeason = { seasonNumber: number; episodeCount: number };

export function deriveInitialProgressOptions(episodes: Episode[]): { episodes: Episode[]; seasons: InitialProgressSeason[] } {
  const regularEpisodes = episodes.filter((episode) => episode.season_number > 0);
  const counts = new Map<number, number>();
  for (const episode of regularEpisodes) counts.set(episode.season_number, (counts.get(episode.season_number) ?? 0) + 1);
  return { episodes: regularEpisodes, seasons: [...counts.entries()].map(([seasonNumber, episodeCount]) => ({ seasonNumber, episodeCount })) };
}
