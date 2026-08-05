import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { getMovieDetails, getMovieReleaseDates } from "@/lib/tmdb/endpoints";
import { mapTmdbMovieDetailsToCacheRow } from "@/lib/tmdb/mappers";
import { normalizeTmdbMovieReleaseDates } from "@/lib/movies/release-dates";
import type { Json } from "@/types/database";

export type MovieSyncResult = {
  mediaItemId: string;
  releaseDatesSynchronized: boolean;
};

export async function synchronizeMovie(
  tmdbId: number,
  forceRefresh = false,
): Promise<MovieSyncResult> {
  const details = await getMovieDetails(tmdbId, forceRefresh);
  const admin = createAdminClient();
  const { data: media, error: mediaError } = await admin
    .from("media_items")
    .upsert(mapTmdbMovieDetailsToCacheRow(details), {
      onConflict: "tmdb_id,media_type",
    })
    .select("id")
    .single();
  if (mediaError || !media)
    throw new Error(mediaError?.message ?? "Could not cache movie metadata.");

  try {
    const response = await getMovieReleaseDates(tmdbId, forceRefresh);
    const releases = normalizeTmdbMovieReleaseDates(response);
    const { error } = await admin.rpc("reconcile_movie_release_dates", {
      p_media_item_id: media.id,
      p_release_dates: releases as unknown as Json,
    });
    if (error) throw new Error("Release date reconciliation failed.");
    return { mediaItemId: media.id, releaseDatesSynchronized: true };
  } catch {
    console.warn("Movie supplemental metadata synchronization failed.", {
      category: "movie_release_dates",
      tmdbId,
    });
    return { mediaItemId: media.id, releaseDatesSynchronized: false };
  }
}
