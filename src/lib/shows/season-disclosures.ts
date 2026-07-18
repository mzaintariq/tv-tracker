import type { Episode } from "@/types/database";

export function defaultOpenRegularSeason(
  seasons: ReadonlyMap<number, readonly Episode[]>,
  watchedEpisodeIds: ReadonlySet<string>,
  today: string,
): number | null {
  const regularSeasons = [...seasons.entries()]
    .filter(([season]) => season > 0)
    .sort(([left], [right]) => left - right);

  if (regularSeasons.length === 0) return null;

  for (const [season, episodes] of regularSeasons) {
    const hasUnwatchedReleasedEpisode = episodes.some((episode) =>
      episode.air_date !== null && episode.air_date <= today && !watchedEpisodeIds.has(episode.id));
    if (hasUnwatchedReleasedEpisode) return season;
  }

  let latest: { season: number; airDate: string } | null = null;
  for (const [season, episodes] of regularSeasons) {
    for (const episode of episodes) {
      if (episode.air_date === null || episode.air_date > today) continue;
      if (!latest || episode.air_date > latest.airDate || (episode.air_date === latest.airDate && season > latest.season)) {
        latest = { season, airDate: episode.air_date };
      }
    }
  }

  return latest?.season ?? regularSeasons[0][0];
}
