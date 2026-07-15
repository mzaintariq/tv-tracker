import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { getTvDetails, getTvSeason } from "@/lib/tmdb/endpoints";
import { mapTmdbTvDetailsToCacheRow } from "@/lib/tmdb/mappers";
import { mapTmdbEpisode } from "@/lib/shows/episode-mapper";
import type { Database } from "@/types/database";

const CONCURRENCY = 4;
const UPSERT_BATCH_SIZE = 300;
type EpisodeInsert = Database["public"]["Tables"]["episodes"]["Insert"];
export type SyncResult = { mediaItemId: string; failedSeasons: number[]; synchronizedSeasons: number[] };

async function mapWithConcurrency<T, R>(items: readonly T[], task: (item: T) => Promise<R>): Promise<PromiseSettledResult<R>[]> {
  const results: PromiseSettledResult<R>[] = new Array(items.length); let cursor = 0;
  async function worker() { while (cursor < items.length) { const index = cursor; cursor += 1; try { results[index] = { status: "fulfilled", value: await task(items[index]) }; } catch (reason) { results[index] = { status: "rejected", reason }; } } }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, items.length) }, () => worker())); return results;
}

export async function synchronizeShow(tmdbId: number, forceRefresh = false): Promise<SyncResult> {
  const details = await getTvDetails(tmdbId, forceRefresh); const admin = createAdminClient();
  const { data: media, error: mediaError } = await admin.from("media_items").upsert(mapTmdbTvDetailsToCacheRow(details), { onConflict: "tmdb_id,media_type" }).select("id").single();
  if (mediaError || !media) throw new Error(mediaError?.message ?? "Could not cache show metadata.");
  const seasons = (details.seasons ?? []).map((season) => season.season_number).filter((number) => Number.isInteger(number) && number >= 0);
  const settled = await mapWithConcurrency(seasons, (season) => getTvSeason(tmdbId, season, forceRefresh));
  const failedSeasons: number[] = []; const synchronizedSeasons: number[] = []; const rows: EpisodeInsert[] = []; const now = new Date().toISOString();
  settled.forEach((result, index) => { const season = seasons[index]; if (result.status === "rejected") { failedSeasons.push(season); return; } synchronizedSeasons.push(season); for (const episode of result.value.episodes) { const row = mapTmdbEpisode(media.id, episode, now); if (row) rows.push(row); } });
  for (let start = 0; start < rows.length; start += UPSERT_BATCH_SIZE) { const { error } = await admin.from("episodes").upsert(rows.slice(start, start + UPSERT_BATCH_SIZE), { onConflict: "media_item_id,season_number,episode_number" }); if (error) throw new Error(error.message); }
  return { mediaItemId: media.id, failedSeasons, synchronizedSeasons };
}
