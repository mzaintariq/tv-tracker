import "server-only";

import type {
  ExportEpisodeRow,
  ExportMediaRow,
  ExportMovieMembershipRow,
  ExportProfileRow,
  ExportShowMembershipRow,
  ExportSourceData,
  ExportWatchedRow,
} from "@/lib/export/build";
import { EXPORT_METADATA_CONCURRENCY, loadExportPages, mapWithConcurrency, uniqueChunks } from "@/lib/export/pagination";
import { createClient } from "@/lib/supabase/server";

type ExportClient = Awaited<ReturnType<typeof createClient>>;
export type ExportLoadStage = "profile" | "show_memberships" | "movie_memberships" | "watched_history" | "episode_metadata" | "media_metadata";

export class ExportLoadError extends Error {
  readonly stage: ExportLoadStage;
  constructor(stage: ExportLoadStage) { super("Export data could not be loaded."); this.name = "ExportLoadError"; this.stage = stage; }
}

async function atStage<T>(stage: ExportLoadStage, work: () => Promise<T>): Promise<T> {
  try { return await work(); } catch { throw new ExportLoadError(stage); }
}

async function loadEpisodeMetadata(client: ExportClient, episodeIds: readonly string[]): Promise<ExportEpisodeRow[]> {
  const chunks = uniqueChunks(episodeIds);
  const pages = await mapWithConcurrency(chunks, EXPORT_METADATA_CONCURRENCY, async (ids) => {
    const result = await client.from("episodes")
      .select("id,media_item_id,tmdb_episode_id,season_number,episode_number,title,air_date")
      .in("id", ids).order("id", { ascending: true });
    if (result.error) throw new Error("Episode metadata query failed.");
    return (result.data ?? []) as ExportEpisodeRow[];
  });
  return pages.flat();
}

async function loadMediaMetadata(client: ExportClient, mediaIds: readonly string[]): Promise<ExportMediaRow[]> {
  const chunks = uniqueChunks(mediaIds);
  const pages = await mapWithConcurrency(chunks, EXPORT_METADATA_CONCURRENCY, async (ids) => {
    const result = await client.from("media_items")
      .select("id,tmdb_id,media_type,title,release_date,runtime_minutes")
      .in("id", ids).order("id", { ascending: true });
    if (result.error) throw new Error("Media metadata query failed.");
    return (result.data ?? []) as ExportMediaRow[];
  });
  return pages.flat();
}

export async function loadExportSourceData(client: ExportClient, userId: string): Promise<ExportSourceData> {
  const profile = await atStage("profile", async () => {
    const result = await client.from("profiles").select("display_name,avatar_url,timezone,theme").eq("id", userId).maybeSingle();
    if (result.error || !result.data) throw new Error("Profile unavailable.");
    return result.data as ExportProfileRow;
  });

  const [showMemberships, movieMemberships, watched] = await Promise.all([
    atStage("show_memberships", () => loadExportPages<ExportShowMembershipRow>((from, to) => client.from("user_shows")
      .select("id,media_item_id,status,is_favourite,created_at").eq("user_id", userId).order("id", { ascending: true }).range(from, to))),
    atStage("movie_memberships", () => loadExportPages<ExportMovieMembershipRow>((from, to) => client.from("user_movies")
      .select("id,media_item_id,watched_at,is_favourite,created_at").eq("user_id", userId).order("id", { ascending: true }).range(from, to))),
    atStage("watched_history", () => loadExportPages<ExportWatchedRow>((from, to) => client.from("watched_episodes")
      .select("id,episode_id,watched_at").eq("user_id", userId).order("id", { ascending: true }).range(from, to))),
  ]);

  const episodes = await atStage("episode_metadata", () => loadEpisodeMetadata(client, watched.map((row) => row.episode_id)));
  const mediaIds = [
    ...showMemberships.map((row) => row.media_item_id),
    ...movieMemberships.map((row) => row.media_item_id),
    ...episodes.map((row) => row.media_item_id),
  ];
  const media = await atStage("media_metadata", () => loadMediaMetadata(client, mediaIds));
  return { profile, showMemberships, movieMemberships, watched, episodes, media };
}
