import type { TmdbEpisode } from "@/lib/tmdb/types";
import type { Database } from "@/types/database";

type EpisodeInsert = Database["public"]["Tables"]["episodes"]["Insert"];

export function mapTmdbEpisode(mediaItemId: string, episode: TmdbEpisode, syncedAt: string): EpisodeInsert | null {
  if (!Number.isInteger(episode.id) || episode.id <= 0 || !Number.isInteger(episode.season_number) || episode.season_number < 0 || !Number.isInteger(episode.episode_number) || episode.episode_number <= 0) return null;
  const runtime = typeof episode.runtime === "number" && episode.runtime > 0 ? episode.runtime : null;
  const airDate = /^\d{4}-\d{2}-\d{2}$/.test(episode.air_date ?? "") ? episode.air_date : null;
  return { media_item_id: mediaItemId, tmdb_episode_id: episode.id, season_number: episode.season_number, episode_number: episode.episode_number, title: episode.name.trim() || `Episode ${episode.episode_number}`, air_date: airDate, runtime_minutes: runtime, last_synced_at: syncedAt };
}
