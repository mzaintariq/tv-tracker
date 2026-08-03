import "server-only";

import { calculateShowProgress, type ShowProgress } from "@/lib/shows/progress";
import {
  mapWatchListProjection,
  type WatchListCategories,
  type WatchListMedia,
  type WatchListProjection,
} from "@/lib/shows/watch-list";
import { createClient } from "@/lib/supabase/server";
import { logSafeReadFailure } from "@/lib/supabase/read-diagnostics";
import type {
  Episode,
  MediaItem,
  UserShow,
  WatchedEpisode,
} from "@/types/database";
import { dateInTimeZone } from "@/lib/date-time";

export type ShowCardData = {
  membership: UserShow;
  media: WatchListMedia;
  progress: ShowProgress;
};
export type ShowDetailData = {
  membership: UserShow | null;
  media: MediaItem;
  episodes: Episode[];
  watched: WatchedEpisode[];
};
const today = () => new Date().toISOString().slice(0, 10);

export async function loadShows(userId: string): Promise<ShowCardData[]> {
  const supabase = await createClient();
  const { data: memberships, error } = await supabase
    .from("user_shows")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);
  if (!memberships?.length) return [];
  const mediaIds = memberships.map((row) => row.media_item_id);
  const [mediaResult, episodeResult] = await Promise.all([
    supabase
      .from("media_items")
      .select("*")
      .in("id", mediaIds)
      .eq("media_type", "tv"),
    supabase.from("episodes").select("*").in("media_item_id", mediaIds),
  ]);
  if (mediaResult.error || episodeResult.error)
    throw new Error(mediaResult.error?.message ?? episodeResult.error?.message);
  const episodes = episodeResult.data ?? [];
  const episodeIds = episodes.map((episode) => episode.id);
  const watchedResult = episodeIds.length
    ? await supabase
        .from("watched_episodes")
        .select("episode_id")
        .eq("user_id", userId)
        .in("episode_id", episodeIds)
    : { data: [], error: null };
  if (watchedResult.error) throw new Error(watchedResult.error.message);
  const watchedIds = new Set(
    (watchedResult.data ?? []).map((row) => row.episode_id),
  );
  const mediaMap = new Map(
    (mediaResult.data ?? []).map((row) => [row.id, row]),
  );
  const episodeMap = new Map<string, Episode[]>();
  for (const episode of episodes) {
    const list = episodeMap.get(episode.media_item_id) ?? [];
    list.push(episode);
    episodeMap.set(episode.media_item_id, list);
  }
  return memberships.flatMap((membership) => {
    const media = mediaMap.get(membership.media_item_id);
    return media
      ? [
          {
            membership,
            media,
            progress: calculateShowProgress(
              episodeMap.get(media.id) ?? [],
              watchedIds,
              media.tmdb_status,
              today(),
            ),
          },
        ]
      : [];
  });
}

export type WatchListPageData = WatchListCategories & { timeZone: string };

export async function loadWatchList(
  userId: string,
  now = new Date(),
): Promise<WatchListPageData> {
  const supabase = await createClient();
  const profileResult = await supabase
    .from("profiles")
    .select("timezone")
    .eq("id", userId)
    .maybeSingle();
  if (profileResult.error) {
    const code = logSafeReadFailure(
      "shows",
      "watch_list_profile_timezone",
      profileResult.error,
      profileResult.status,
    );
    throw new Error(`Could not load your timezone. [${code}]`);
  }
  const timeZone = profileResult.data?.timezone ?? "UTC";
  const currentDate = dateInTimeZone(now, timeZone);
  const cutoff = new Date(
    now.getTime() - 30 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const projectionResult = await supabase.rpc("load_watch_list_projection", {
    p_today: currentDate,
    p_recent_cutoff: cutoff,
    p_recent_cutoff_date: cutoff.slice(0, 10),
  });
  if (projectionResult.error) {
    const code = logSafeReadFailure(
      "shows",
      "load_watch_list_projection",
      projectionResult.error,
      projectionResult.status,
    );
    throw new Error(`Could not load show metadata. [${code}]`);
  }
  const raw = projectionResult.data as Partial<WatchListProjection> | null;
  const projection: WatchListProjection = {
    shows: Array.isArray(raw?.shows) ? raw.shows : [],
    recently_watched: Array.isArray(raw?.recently_watched)
      ? raw.recently_watched
      : [],
  };
  return { ...mapWatchListProjection(projection), timeZone };
}

export async function loadShowDetail(
  userId: string,
  tmdbId: number,
): Promise<ShowDetailData | null> {
  const supabase = await createClient();
  const { data: media, error } = await supabase
    .from("media_items")
    .select("*")
    .eq("tmdb_id", tmdbId)
    .eq("media_type", "tv")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!media) return null;
  const [memberResult, episodeResult] = await Promise.all([
    supabase
      .from("user_shows")
      .select("*")
      .eq("user_id", userId)
      .eq("media_item_id", media.id)
      .maybeSingle(),
    supabase
      .from("episodes")
      .select("*")
      .eq("media_item_id", media.id)
      .order("season_number")
      .order("episode_number"),
  ]);
  if (memberResult.error || episodeResult.error)
    throw new Error(
      memberResult.error?.message ?? episodeResult.error?.message,
    );
  const episodes = episodeResult.data ?? [];
  const episodeIds = episodes.map((episode) => episode.id);
  const watchedResult = episodeIds.length
    ? await supabase
        .from("watched_episodes")
        .select("*")
        .eq("user_id", userId)
        .in("episode_id", episodeIds)
    : { data: [], error: null };
  if (watchedResult.error) throw new Error(watchedResult.error.message);
  return {
    membership: memberResult.data,
    media,
    episodes,
    watched: watchedResult.data ?? [],
  };
}
