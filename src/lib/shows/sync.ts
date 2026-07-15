import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { getTvDetails, getTvSeason } from "@/lib/tmdb/endpoints";
import { mapTmdbTvDetailsToCacheRow } from "@/lib/tmdb/mappers";
import { mapTmdbEpisode } from "@/lib/shows/episode-mapper";
import { regularSeasonSyncSucceeded, settleWithConcurrency } from "@/lib/shows/freshness";
import type { Database } from "@/types/database";

const CONCURRENCY = 4;
const UPSERT_BATCH_SIZE = 300;
type EpisodeInsert = Database["public"]["Tables"]["episodes"]["Insert"];
export type SyncResult = { mediaItemId: string; failedSeasons: number[]; synchronizedSeasons: number[] };

export async function synchronizeShow(tmdbId: number, forceRefresh = false): Promise<SyncResult> {
  const details = await getTvDetails(tmdbId, forceRefresh); const admin = createAdminClient();
  const { data: media, error: mediaError } = await admin.from("media_items").upsert(mapTmdbTvDetailsToCacheRow(details), { onConflict: "tmdb_id,media_type" }).select("id").single();
  if (mediaError || !media) throw new Error(mediaError?.message ?? "Could not cache show metadata.");
  const seasons = (details.seasons ?? []).map((season) => season.season_number).filter((number) => Number.isInteger(number) && number >= 0);
  const settled = await settleWithConcurrency(seasons, CONCURRENCY, (season) => getTvSeason(tmdbId, season, forceRefresh));
  const failedSeasons: number[] = []; const synchronizedSeasons: number[] = []; const regularRows: EpisodeInsert[] = []; const specialRows: EpisodeInsert[] = []; const now = new Date().toISOString();
  settled.forEach((result, index) => { const season = seasons[index]; if (result.status === "rejected") { failedSeasons.push(season); return; } synchronizedSeasons.push(season); for (const episode of result.value.episodes) { const row = mapTmdbEpisode(media.id, episode, now); if (row) (season === 0 ? specialRows : regularRows).push(row); } });
  for (let start = 0; start < regularRows.length; start += UPSERT_BATCH_SIZE) { const { error } = await admin.from("episodes").upsert(regularRows.slice(start, start + UPSERT_BATCH_SIZE), { onConflict: "media_item_id,season_number,episode_number" }); if (error) throw new Error(error.message); }
  try {
    for (let start = 0; start < specialRows.length; start += UPSERT_BATCH_SIZE) { const { error } = await admin.from("episodes").upsert(specialRows.slice(start, start + UPSERT_BATCH_SIZE), { onConflict: "media_item_id,season_number,episode_number" }); if (error) throw new Error(error.message); }
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
