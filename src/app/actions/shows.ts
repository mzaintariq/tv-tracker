"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { synchronizeShow } from "@/lib/shows/sync";
import { regularSeasonSyncSucceeded, settleWithConcurrency, shouldAutomaticallyRefreshEpisodes, UPCOMING_SHOW_REFRESH_CONCURRENCY } from "@/lib/shows/freshness";
import { isShowStatus, parseInitialProgress, parseNonNegativeInteger, parsePositiveInteger, parseTmdbId, parseUuid, parseManualWatchedAt, type ValidInitialProgress } from "@/lib/shows/validation";
import { logSafeReadFailure } from "@/lib/supabase/read-diagnostics";
import { initializeProgress } from "@/lib/shows/initialize-progress";

export type ShowActionResult = { error?: string; success?: string; warning?: string };
async function authenticated() { const supabase = await createClient(); const { data: { user } } = await supabase.auth.getUser(); return { supabase, user }; }
function refresh(tmdbId: number) { revalidatePath("/shows"); revalidatePath("/shows/upcoming"); revalidatePath(`/shows/${tmdbId}`); revalidatePath("/explore"); }

export type UpcomingRefreshResult = { attempted: number; failed: number; partial: number };

function parseTmdbIds(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.flatMap((item) => {
    const parsed = parseTmdbId(item);
    return parsed === null ? [] : [parsed];
  }))].slice(0, 100);
}

export async function refreshStaleUpcoming(tmdbIdsRaw: unknown): Promise<UpcomingRefreshResult> {
  const requestedIds = parseTmdbIds(tmdbIdsRaw);
  const empty = { attempted: 0, failed: 0, partial: 0 };
  if (!requestedIds.length) return empty;
  const { supabase, user } = await authenticated();
  if (!user) return { ...empty, failed: requestedIds.length };

  const mediaResult = await supabase.rpc("load_upcoming_refresh_candidates", { p_tmdb_ids: requestedIds });
  if (mediaResult.error) {
    logSafeReadFailure("shows", "load_upcoming_refresh_candidates", mediaResult.error, mediaResult.status);
    return { ...empty, failed: requestedIds.length };
  }

  const now = new Date();
  const rows = Array.isArray(mediaResult.data) ? mediaResult.data as Array<{ tmdb_id: number; tmdb_status: string | null; episodes_synced_at: string | null }> : [];
  const candidates = rows.filter((media) =>
    shouldAutomaticallyRefreshEpisodes("active", media.tmdb_status, media.episodes_synced_at, now));
  let failed = 0;
  let partial = 0;
  const settled = await settleWithConcurrency(candidates, UPCOMING_SHOW_REFRESH_CONCURRENCY, (candidate) => synchronizeShow(candidate.tmdb_id, true));
  for (const result of settled) {
    if (result.status === "rejected") failed += 1;
    else if (!regularSeasonSyncSucceeded(result.value.failedSeasons)) partial += 1;
  }
  revalidatePath("/shows/upcoming");
  return { attempted: candidates.length, failed, partial };
}

export async function syncShowMetadata(tmdbIdRaw: unknown): Promise<ShowActionResult> {
  const tmdbId = parseTmdbId(tmdbIdRaw); if (tmdbId === null) return { error: "Invalid TMDB show ID." };
  const { user } = await authenticated(); if (!user) return { error: "You must be signed in." };
  try { const result = await synchronizeShow(tmdbId, true); refresh(tmdbId); const failedRegular = result.failedSeasons.filter((season) => season > 0); const synchronizedRegular = result.synchronizedSeasons.some((season) => season > 0); if (failedRegular.length && !synchronizedRegular) return { error: "Episode information could not be loaded. Please try again." }; return result.failedSeasons.length ? { success: "Available metadata was refreshed.", warning: `Could not refresh season${result.failedSeasons.length === 1 ? "" : "s"} ${result.failedSeasons.join(", ")}. Cached data was kept.` } : { success: "Metadata refreshed." }; }
  catch { return { error: "Could not refresh metadata. Cached episodes are still available." }; }
}

export type InitialMode = ValidInitialProgress;
export async function initializeShow(tmdbIdRaw: unknown, selectionRaw: unknown): Promise<ShowActionResult> {
  const tmdbId = parseTmdbId(tmdbIdRaw); if (tmdbId === null) return { error: "Invalid TMDB show ID." };
  const selection = parseInitialProgress(selectionRaw); if (!selection) return { error: "Invalid initial progress selection." };
  const { supabase, user } = await authenticated(); if (!user) return { error: "You must be signed in." };
  try {
    const existing = selection.mode === "start" ? await supabase.from("media_items").select("id").eq("tmdb_id", tmdbId).eq("media_type", "tv").maybeSingle() : { data: null, error: null };
    if (existing.error) return { error: "Could not verify this show." };
    const result = await initializeProgress(selection, existing.data?.id ?? null, () => synchronizeShow(tmdbId, true), async (mediaItemId) => {
      const args = { p_media_item_id: mediaItemId, p_mode: selection.mode, p_season_number: selection.mode === "before_episode" ? selection.seasonNumber : null, p_episode_number: selection.mode === "before_episode" ? selection.episodeNumber : null, p_season_numbers: selection.mode === "seasons" ? selection.seasonNumbers : null };
      const initialized = await supabase.rpc("initialize_user_show", args);
      return { error: initialized.error ? "The show could not be updated. Please try again." : null };
    });
    if (result.error) return { error: result.error };
    refresh(tmdbId); return { success: "Show added to your library.", warning: result.failedSeasons?.includes(0) ? "Season 0 could not be synchronized, but regular progress was initialized." : undefined };
  } catch { return { error: "Could not synchronize this show. It was not added." }; }
}

export async function setEpisodeWatched(tmdbIdRaw: unknown, mediaIdRaw: unknown, episodeIdRaw: unknown, watched: boolean, watchedAtRaw?: unknown): Promise<ShowActionResult> {
  const tmdbId = parseTmdbId(tmdbIdRaw), mediaId = parseUuid(mediaIdRaw), episodeId = parseUuid(episodeIdRaw); if (tmdbId === null || !mediaId || !episodeId) return { error: "Invalid episode request." };
  const { supabase, user } = await authenticated(); if (!user) return { error: "You must be signed in." };
  const watchedAt = watchedAtRaw === undefined ? new Date().toISOString() : parseManualWatchedAt(watchedAtRaw); if (watched && !watchedAt) return { error: "Choose a valid watched date that is not in the future." };
  const result = watched ? await supabase.rpc("mark_episode_watched", { p_media_item_id: mediaId, p_episode_id: episodeId, p_watched_at: watchedAt ?? undefined }) : await supabase.rpc("mark_episode_unwatched", { p_media_item_id: mediaId, p_episode_id: episodeId });
  if (result.error) return { error: "The show could not be updated. Please try again." }; refresh(tmdbId); return { success: watched ? "Episode marked watched." : "Episode marked unwatched." };
}

export async function updateWatchedDate(tmdbIdRaw: unknown, mediaIdRaw: unknown, episodeIdRaw: unknown, watchedAtRaw: unknown): Promise<ShowActionResult> {
  const tmdbId = parseTmdbId(tmdbIdRaw), mediaId = parseUuid(mediaIdRaw), episodeId = parseUuid(episodeIdRaw), watchedAt = parseManualWatchedAt(watchedAtRaw); if (tmdbId === null || !mediaId || !episodeId || !watchedAt) return { error: "Choose a valid historical watched date." };
  const { supabase, user } = await authenticated(); if (!user) return { error: "You must be signed in." }; const { error } = await supabase.rpc("update_episode_watched_at", { p_media_item_id: mediaId, p_episode_id: episodeId, p_watched_at: watchedAt }); if (error) return { error: "The show could not be updated. Please try again." }; refresh(tmdbId); return { success: "Watched date updated." };
}

export async function setSeasonWatched(tmdbIdRaw: unknown, mediaIdRaw: unknown, seasonRaw: unknown, watched: boolean): Promise<ShowActionResult> {
  const tmdbId = parseTmdbId(tmdbIdRaw), mediaId = parseUuid(mediaIdRaw), season = parseNonNegativeInteger(seasonRaw); if (tmdbId === null || !mediaId || season === null) return { error: "Invalid season request." }; const { supabase, user } = await authenticated(); if (!user) return { error: "You must be signed in." }; const { error } = await supabase.rpc("set_season_watched", { p_media_item_id: mediaId, p_season_number: season, p_watched: watched }); if (error) return { error: "The show could not be updated. Please try again." }; refresh(tmdbId); return { success: watched ? "Season marked watched." : "Season marked unwatched." };
}

export async function markPreviousEpisodes(tmdbIdRaw: unknown, mediaIdRaw: unknown, seasonRaw: unknown, episodeRaw: unknown): Promise<ShowActionResult> {
  const tmdbId = parseTmdbId(tmdbIdRaw), mediaId = parseUuid(mediaIdRaw), season = parsePositiveInteger(seasonRaw), episode = parsePositiveInteger(episodeRaw); if (tmdbId === null || !mediaId || season === null || episode === null) return { error: "Choose a valid regular episode." }; const { supabase, user } = await authenticated(); if (!user) return { error: "You must be signed in." }; const { error } = await supabase.rpc("mark_episodes_before", { p_media_item_id: mediaId, p_season_number: season, p_episode_number: episode }); if (error) return { error: "The show could not be updated. Please try again." }; refresh(tmdbId); return { success: "Previous released episodes marked watched." };
}

export async function updateShowSettings(tmdbIdRaw: unknown, mediaIdRaw: unknown, values: { status?: unknown; isFavourite?: unknown }): Promise<ShowActionResult> {
  const tmdbId = parseTmdbId(tmdbIdRaw), mediaId = parseUuid(mediaIdRaw); if (tmdbId === null || !mediaId) return { error: "Invalid show request." }; const update: { status?: "active" | "paused" | "dropped"; is_favourite?: boolean } = {}; if (values.status !== undefined) { if (!isShowStatus(values.status)) return { error: "Invalid tracking status." }; update.status = values.status; } if (values.isFavourite !== undefined) { if (typeof values.isFavourite !== "boolean") return { error: "Invalid favourite state." }; update.is_favourite = values.isFavourite; } if (!Object.keys(update).length) return { error: "No settings to update." };
  const { supabase, user } = await authenticated(); if (!user) return { error: "You must be signed in." }; const { error } = await supabase.from("user_shows").update(update).eq("user_id", user.id).eq("media_item_id", mediaId); if (error) return { error: "The show could not be updated. Please try again." }; refresh(tmdbId); return { success: "Show settings updated." };
}
