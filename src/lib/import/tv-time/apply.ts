import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { getMovieDetails } from "@/lib/tmdb/endpoints";
import { mapTmdbMovieDetailsToCacheRow } from "@/lib/tmdb/mappers";
import { synchronizeShow } from "@/lib/shows/sync";
import type { Json } from "@/types/database";
import { itemDigest } from "./normalize";
import { recalculateImportStatus } from "./store";
import type { NormalizedMovie, NormalizedTvShow, NormalizedTvTimeImport } from "./types";
import { ApplyLifecycleTransitionError } from "./apply-error";
import { atApplyStage } from "./apply-diagnostics";

type ApplyItem = { id: string; mapping_id: string | null; media_type: "tv" | "movie"; source_key: string; import_mode: string; match_status: string; application_status: string; source_item_digest: string };
type ApplyMapping = { id: string; tmdb_id: number | null; resolution_status: string };
export type ApplyResult = { applied: number; blocked: number; tvUnits: { applied: number; blocked: number }; movieItems: { applied: number; blocked: number } };

const APPLY_PAGE_SIZE = 500;

export async function loadAllApplyPages<T>(fetchPage: (from: number, to: number) => Promise<{ data: T[] | null; error: { message: string } | null }>): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += APPLY_PAGE_SIZE) {
    const result = await fetchPage(from, from + APPLY_PAGE_SIZE - 1);
    if (result.error) throw Object.assign(new Error(result.error.message), { code: "code" in result.error ? result.error.code : undefined });
    const page = result.data ?? [];
    rows.push(...page);
    if (page.length < APPLY_PAGE_SIZE) return rows;
  }
}

export function applyEligibilityFailure(item: Pick<ApplyItem, "match_status" | "mapping_id">, mapping: ApplyMapping | undefined): string | null {
  if (item.match_status !== "confirmed") return "apply_match_not_confirmed";
  if (!item.mapping_id || !mapping) return "apply_mapping_missing";
  if (!mapping.tmdb_id) return "apply_tmdb_id_missing";
  if (!mapping.resolution_status.includes("confirmed")) return "apply_mapping_not_confirmed";
  return null;
}

function emptyApplyResult(): ApplyResult { return { applied: 0, blocked: 0, tvUnits: { applied: 0, blocked: 0 }, movieItems: { applied: 0, blocked: 0 } }; }

export async function applyNormalizedImport(userId: string, importId: string, normalized: NormalizedTvTimeImport): Promise<ApplyResult> {
  const admin = createAdminClient();
  const session = await atApplyStage("apply_lifecycle_load", async () => await admin.from("imports").select("status").eq("id", importId).eq("user_id", userId).single());
  if (!session.error && session.data.status === "completed") return emptyApplyResult();
  if (session.error || !["ready", "paused", "applying"].includes(session.data.status)) throw new ApplyLifecycleTransitionError();
  const itemRows = await atApplyStage("tv_item_load", () => loadAllApplyPages<ApplyItem>(async (from, to) => admin.from("import_items").select("id,mapping_id,media_type,source_key,import_mode,match_status,application_status,source_item_digest").eq("import_id", importId).eq("user_id", userId).order("id").range(from, to)));
  const mappingRows = await atApplyStage("tv_mapping_load", () => loadAllApplyPages<ApplyMapping>(async (from, to) => admin.from("source_media_mappings").select("id,tmdb_id,resolution_status").eq("user_id", userId).eq("source_provider", "tv_time").order("id").range(from, to)));
  const mappings = new Map(mappingRows.map((mapping) => [mapping.id, mapping]));
  const normalizedByKey = new Map<string, NormalizedTvShow | NormalizedMovie>([...normalized.shows.map((show) => [show.sourceKey, show] as const), ...normalized.movies.map((movie) => [movie.sourceKey, movie] as const)]);
  for (const item of itemRows.filter((row) => !["applied", "skipped"].includes(row.application_status))) {
    const source = normalizedByKey.get(item.source_key);
    if (!source || itemDigest(source) !== item.source_item_digest || (item.media_type === "tv") !== ("episodeEvents" in source)) throw new Error("Import item digest mismatch.");
  }
  const started = await atApplyStage("apply_lifecycle_start", async () => await admin.rpc("start_tv_time_import_apply", { p_user_id: userId, p_import_id: importId }));
  if (started.error) throw new ApplyLifecycleTransitionError();
  const favouriteDecision = await admin.from("import_issues").select("status").eq("import_id", importId).eq("user_id", userId).eq("issue_type", "movie_favourites_confirmation").maybeSingle();
  const favouriteAccepted = favouriteDecision.data?.status === "accepted";
  const result = emptyApplyResult();
  const persistBlocked = async (item: ApplyItem, code: string) => {
    const update = await admin.from("import_items").update({ application_status: "blocked", last_error_code: code }).eq("id", item.id).eq("import_id", importId).eq("user_id", userId).in("application_status", ["pending", "blocked", "failed"]);
    if (update.error) throw new Error(update.error.message);
  };
  for (const item of itemRows.filter((row) => row.media_type === "tv" && !["applied", "skipped"].includes(row.application_status))) {
    const source = normalizedByKey.get(item.source_key); const mapping = item.mapping_id ? mappings.get(item.mapping_id) : undefined;
    if (!source || !("episodeEvents" in source)) throw new Error("TV import item is missing.");
    const eligibilityFailure = applyEligibilityFailure(item, mapping);
    if (eligibilityFailure) { await persistBlocked(item, eligibilityFailure); result.blocked += 1; result.tvUnits.blocked += 1; continue; }
    if (!mapping?.tmdb_id) throw new Error("Confirmed TV mapping is missing a TMDB ID."); const tmdbId = mapping.tmdb_id;
    const synchronized = await atApplyStage("tv_metadata_sync", () => synchronizeShow(tmdbId, true));
    const episodeRows = await atApplyStage("tv_episode_lookup", async () => { const value = await admin.from("episodes").select("season_number,episode_number").eq("media_item_id", synchronized.mediaItemId); if (value.error) throw value.error; return value; });
    const resolved = new Set((episodeRows.data ?? []).map((episode) => `${episode.season_number}:${episode.episode_number}`));
    const payload = await atApplyStage("tv_payload_build", async () => source.episodeEvents.filter((event) => resolved.has(`${event.seasonNumber}:${event.episodeNumber}`)).map((event) => ({ seasonNumber: event.seasonNumber, episodeNumber: event.episodeNumber, watchedAt: event.watchedAt.instant, sourceEventCount: event.sourceEventCount })) as unknown as Json);
    const tvApply = await atApplyStage("tv_apply_rpc", async () => { const value = await admin.rpc("apply_tv_time_show_import", { p_user_id: userId, p_import_id: importId, p_import_item_id: item.id, p_tmdb_id: tmdbId, p_is_favourite: source.isFavourite, p_episode_events: payload }); if (value.error) throw value.error; return value; });
    const value = tvApply.data as Record<string, Json | undefined>; if (value.blocked === true) { result.blocked += 1; result.tvUnits.blocked += 1; } else { result.applied += 1; result.tvUnits.applied += 1; }
  }
  const moviePayload: Json[] = [];
  for (const item of itemRows.filter((row) => row.media_type === "movie" && !["applied", "skipped"].includes(row.application_status))) {
    const source = normalizedByKey.get(item.source_key); const mapping = item.mapping_id ? mappings.get(item.mapping_id) : undefined;
    if (!source || "episodeEvents" in source) throw new Error("Movie import item is missing.");
    const eligibilityFailure = applyEligibilityFailure(item, mapping);
    if (eligibilityFailure) { await persistBlocked(item, eligibilityFailure); result.blocked += 1; result.movieItems.blocked += 1; continue; }
    if (!mapping?.tmdb_id) throw new Error("Confirmed movie mapping is missing a TMDB ID."); const tmdbId = mapping.tmdb_id;
    const details = await atApplyStage("movie_metadata_sync", () => getMovieDetails(tmdbId)); await atApplyStage("movie_metadata_cache", async () => { const value = await admin.from("media_items").upsert(mapTmdbMovieDetailsToCacheRow(details), { onConflict: "tmdb_id,media_type" }); if (value.error) throw value.error; });
    moviePayload.push({ importItemId: item.id, tmdbId: mapping.tmdb_id, watchedAt: source.watchedAt?.instant ?? null, isFavourite: favouriteAccepted && normalized.possibleMovieFavouriteKeys.includes(source.sourceKey) });
    if (moviePayload.length === 100) { await atApplyStage("movie_apply_rpc", async () => { const value = await admin.rpc("apply_tv_time_movie_import_batch", { p_user_id: userId, p_import_id: importId, p_items: moviePayload }); if (value.error) throw value.error; }); result.applied += moviePayload.length; result.movieItems.applied += moviePayload.length; moviePayload.length = 0; }
  }
  if (moviePayload.length) { await atApplyStage("movie_apply_rpc", async () => { const value = await admin.rpc("apply_tv_time_movie_import_batch", { p_user_id: userId, p_import_id: importId, p_items: moviePayload }); if (value.error) throw value.error; }); result.applied += moviePayload.length; result.movieItems.applied += moviePayload.length; }
  await atApplyStage("apply_progress_update", () => recalculateImportStatus(userId, importId));
  return result;
}
