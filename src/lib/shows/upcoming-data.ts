import "server-only";

import { shouldAutomaticallyRefreshEpisodes } from "@/lib/shows/freshness";
import { dateInTimeZone, deriveUpcoming, type UpcomingDateGroup, type UpcomingSnapshot } from "@/lib/shows/upcoming";
import { createClient } from "@/lib/supabase/server";
import type { Episode } from "@/types/database";

export type UpcomingPageData = {
  groups: UpcomingDateGroup[];
  staleTmdbIds: number[];
  today: string;
  timeZone: string;
  trackedShowCount: number;
};

export async function loadUpcoming(userId: string, now = new Date()): Promise<UpcomingPageData> {
  const supabase = await createClient();
  const [membershipResult, profileResult] = await Promise.all([
    supabase.from("user_shows").select("*").eq("user_id", userId).eq("status", "active"),
    supabase.from("profiles").select("timezone").eq("id", userId).maybeSingle(),
  ]);
  if (membershipResult.error) throw new Error("Could not load your tracked shows.");
  if (profileResult.error) throw new Error("Could not load your timezone.");

  const memberships = membershipResult.data ?? [];
  const timeZone = profileResult.data?.timezone ?? "UTC";
  const today = dateInTimeZone(now, timeZone);
  if (!memberships.length) return { groups: [], staleTmdbIds: [], today, timeZone, trackedShowCount: 0 };

  const mediaIds = memberships.map((membership) => membership.media_item_id);
  const mediaResult = await supabase.from("media_items").select("*").eq("media_type", "tv").in("id", mediaIds);
  if (mediaResult.error) throw new Error("Could not load show metadata.");
  const media = mediaResult.data ?? [];
  const loadedMediaIds = media.map((item) => item.id);
  const episodeResult = loadedMediaIds.length
    ? await supabase.from("episodes").select("*").in("media_item_id", loadedMediaIds)
    : { data: [] as Episode[], error: null };
  if (episodeResult.error) throw new Error("Could not load episode metadata.");

  const membershipByMediaId = new Map(memberships.map((membership) => [membership.media_item_id, membership]));
  const episodesByMediaId = new Map<string, Episode[]>();
  for (const episode of episodeResult.data ?? []) {
    const rows = episodesByMediaId.get(episode.media_item_id) ?? [];
    rows.push(episode);
    episodesByMediaId.set(episode.media_item_id, rows);
  }
  const snapshots: UpcomingSnapshot[] = media.flatMap((item) => {
    const membership = membershipByMediaId.get(item.id);
    return membership ? [{ membership, media: item, episodes: episodesByMediaId.get(item.id) ?? [] }] : [];
  });
  const staleTmdbIds = media
    .filter((item) => shouldAutomaticallyRefreshEpisodes("active", item.tmdb_status, item.episodes_synced_at, now))
    .map((item) => item.tmdb_id)
    .sort((left, right) => left - right);

  return {
    groups: deriveUpcoming(snapshots, today),
    staleTmdbIds,
    today,
    timeZone,
    trackedShowCount: snapshots.length,
  };
}
