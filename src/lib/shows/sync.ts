import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { getTvDetails, getTvSeason } from "@/lib/tmdb/endpoints";
import { mapTmdbTvDetailsToCacheRow } from "@/lib/tmdb/mappers";
import { mapTmdbEpisode } from "@/lib/shows/episode-mapper";
import { regularSeasonSyncSucceeded, settleWithConcurrency } from "@/lib/shows/freshness";
import type { Database } from "@/types/database";
import type { Json } from "@/types/database";
import { ShowEpisodeReconciliationError } from "@/lib/import/tv-time/apply-error";

const CONCURRENCY = 4;
type EpisodeInsert = Database["public"]["Tables"]["episodes"]["Insert"];
export type SyncResult = { mediaItemId: string; failedSeasons: number[]; synchronizedSeasons: number[] };
function reconciliationPayload(rows: EpisodeInsert[]): Json {
  return rows.map((row) => ({ tmdb_episode_id: row.tmdb_episode_id, season_number: row.season_number, episode_number: row.episode_number, title: row.title, air_date: row.air_date ?? null, runtime_minutes: row.runtime_minutes ?? null, last_synced_at: row.last_synced_at })) as unknown as Json;
}

export async function synchronizeShow(tmdbId: number, forceRefresh = false): Promise<SyncResult> {
  const details = await getTvDetails(tmdbId, forceRefresh); const admin = createAdminClient();
  const { data: media, error: mediaError } = await admin.from("media_items").upsert(mapTmdbTvDetailsToCacheRow(details), { onConflict: "tmdb_id,media_type" }).select("id").single();
  if (mediaError || !media) throw new Error(mediaError?.message ?? "Could not cache show metadata.");
  const seasons = (details.seasons ?? []).map((season) => season.season_number).filter((number) => Number.isInteger(number) && number >= 0);
  const settled = await settleWithConcurrency(seasons, CONCURRENCY, (season) => getTvSeason(tmdbId, season, forceRefresh));
  const failedSeasons: number[] = []; const synchronizedSeasons: number[] = []; const regularRows: EpisodeInsert[] = []; const specialRows: EpisodeInsert[] = []; const now = new Date().toISOString();
  settled.forEach((result, index) => { const season = seasons[index]; if (result.status === "rejected") { failedSeasons.push(season); return; } synchronizedSeasons.push(season); for (const episode of result.value.episodes) { const row = mapTmdbEpisode(media.id, episode, now); if (row) (season === 0 ? specialRows : regularRows).push(row); } });
  const regularResult = await admin.rpc("reconcile_show_episodes", { p_media_item_id: media.id, p_episodes: reconciliationPayload(regularRows) });
  if (regularResult.error) throw new ShowEpisodeReconciliationError();
  try {
    const specialResult = await admin.rpc("reconcile_show_episodes", { p_media_item_id: media.id, p_episodes: reconciliationPayload(specialRows) });
    if (specialResult.error) throw new ShowEpisodeReconciliationError();
  } catch {
    if (!failedSeasons.includes(0)) failedSeasons.push(0);
    const index = synchronizedSeasons.indexOf(0);
    if (index >= 0) synchronizedSeasons.splice(index, 1);
  }
  if (regularSeasonSyncSucceeded(failedSeasons)) {
    const { error } = await admin.from("media_items").update({ episodes_synced_at: now }).eq("id", media.id);
    if (error) throw new Error(error.message);
  }
  return { mediaItemId: media.id, failedSeasons, synchronizedSeasons };
}
