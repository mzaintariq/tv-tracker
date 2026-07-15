import "server-only";

import { deriveMovieSections, type MovieSnapshot } from "@/lib/movies/movies";
import { deriveProfileStatistics, type HistoricalEpisode, type ProfileStatistics } from "@/lib/profile/statistics";
import { loadAllPages } from "@/lib/profile/pagination";
import { deriveWatchList, type DerivedShow, type TrackedShowSnapshot } from "@/lib/shows/watch-list";
import { createClient } from "@/lib/supabase/server";
import type { Episode, MediaItem, UserMovie, UserShow, WatchedEpisode } from "@/types/database";

const ID_CHUNK_SIZE = 200;
const chunks = <T,>(values: readonly T[], size = ID_CHUNK_SIZE): T[][] => Array.from({ length: Math.ceil(values.length / size) }, (_, index) => values.slice(index * size, (index + 1) * size));

async function loadEpisodesByMediaIds(mediaIds: readonly string[]): Promise<Episode[]> {
  const supabase = await createClient();
  const results = await Promise.all(chunks([...new Set(mediaIds)]).map((ids) => loadAllPages<Episode>((from, to) => supabase.from("episodes").select("id,media_item_id,season_number,episode_number,title,air_date,runtime_minutes,tmdb_episode_id,last_synced_at,created_at,updated_at").in("media_item_id", ids).order("id").range(from, to))));
  return results.flat();
}

async function loadEpisodesByIds(episodeIds: readonly string[]): Promise<Episode[]> {
  const supabase = await createClient();
  const results = await Promise.all(chunks([...new Set(episodeIds)]).map(async (ids) => {
    const { data, error } = await supabase.from("episodes").select("id,media_item_id,season_number,episode_number,title,air_date,runtime_minutes,tmdb_episode_id,last_synced_at,created_at,updated_at").in("id", ids);
    if (error) throw new Error(error.message);
    return data ?? [];
  }));
  return results.flat();
}

async function loadMedia(mediaIds: readonly string[]): Promise<MediaItem[]> {
  const supabase = await createClient();
  const results = await Promise.all(chunks([...new Set(mediaIds)]).map(async (ids) => {
    const { data, error } = await supabase.from("media_items").select("id,tmdb_id,media_type,title,poster_path,release_date,runtime_minutes,average_episode_runtime_minutes,tmdb_status").in("id", ids);
    if (error) throw new Error(error.message);
    return (data ?? []) as MediaItem[];
  }));
  return results.flat();
}

export type ProfilePageData = { statistics: ProfileStatistics; shows: DerivedShow[]; movies: MovieSnapshot[] };

export async function loadProfilePageData(userId: string, now = new Date()): Promise<ProfilePageData> {
  const supabase = await createClient();
  const [showResult, movieResult, watched] = await Promise.all([
    supabase.from("user_shows").select("id,user_id,media_item_id,status,is_favourite,created_at,updated_at").eq("user_id", userId),
    supabase.from("user_movies").select("id,user_id,media_item_id,watched_at,is_favourite,created_at,updated_at").eq("user_id", userId),
    loadAllPages<WatchedEpisode>((from, to) => supabase.from("watched_episodes").select("id,user_id,episode_id,watched_at,created_at,updated_at").eq("user_id", userId).order("id").range(from, to)),
  ]);
  if (showResult.error || movieResult.error) throw new Error(showResult.error?.message ?? movieResult.error?.message);
  const memberships = (showResult.data ?? []) as UserShow[];
  const movieMemberships = (movieResult.data ?? []) as UserMovie[];
  const currentEpisodes = await loadEpisodesByMediaIds(memberships.map((row) => row.media_item_id));
  const currentEpisodeIds = new Set(currentEpisodes.map((episode) => episode.id));
  const missingHistoryIds = [...new Set(watched.map((row) => row.episode_id))].filter((id) => !currentEpisodeIds.has(id));
  const historyEpisodes = await loadEpisodesByIds(missingHistoryIds);
  const episodes = [...currentEpisodes, ...historyEpisodes];
  const media = await loadMedia([
    ...memberships.map((row) => row.media_item_id),
    ...movieMemberships.map((row) => row.media_item_id),
    ...historyEpisodes.map((episode) => episode.media_item_id),
  ]);
  const mediaById = new Map(media.map((row) => [row.id, row]));
  const episodeById = new Map(episodes.map((row) => [row.id, row]));
  const watchedByMedia = new Map<string, WatchedEpisode[]>();
  const history: HistoricalEpisode[] = [];
  for (const row of watched) {
    const episode = episodeById.get(row.episode_id);
    const parent = episode ? mediaById.get(episode.media_item_id) : undefined;
    if (!episode || !parent) continue;
    history.push({ watched: row, episode, media: parent });
    const list = watchedByMedia.get(episode.media_item_id) ?? [];
    list.push(row); watchedByMedia.set(episode.media_item_id, list);
  }
  const episodesByMedia = new Map<string, Episode[]>();
  for (const episode of currentEpisodes) { const list = episodesByMedia.get(episode.media_item_id) ?? []; list.push(episode); episodesByMedia.set(episode.media_item_id, list); }
  const snapshots: TrackedShowSnapshot[] = memberships.flatMap((membership) => { const item = mediaById.get(membership.media_item_id); return item ? [{ membership, media: item, episodes: episodesByMedia.get(item.id) ?? [], watched: watchedByMedia.get(item.id) ?? [] }] : []; });
  const timestamp = now.toISOString();
  const shows = deriveWatchList(snapshots, timestamp.slice(0, 10), timestamp).shows;
  const movies = deriveMovieSections(movieMemberships.flatMap((membership) => { const item = mediaById.get(membership.media_item_id); return item?.media_type === "movie" ? [{ membership, media: item }] : []; })).movies;
  return { statistics: deriveProfileStatistics(shows, movies, history), shows, movies };
}
