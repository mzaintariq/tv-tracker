import "server-only";

import {
  deriveMovieSections,
  type MovieLibraryMedia,
  type MovieSections,
  type MovieSnapshot,
} from "@/lib/movies/movies";
import { createClient } from "@/lib/supabase/server";
import { logSafeReadFailure } from "@/lib/supabase/read-diagnostics";
import { dateInTimeZone, validTimeZone } from "@/lib/date-time";
import { isRichMetadataStale } from "@/lib/media/rich-metadata-freshness";
import { synchronizeMovie } from "@/lib/movies/sync";

export async function loadMovies(_userId: string): Promise<MovieSections> {
  void _userId;
  const supabase = await createClient();
  const [result, profile] = await Promise.all([
    supabase.rpc("load_movie_library_data"),
    supabase.from("profiles").select("timezone").eq("id", _userId).single(),
  ]);
  if (result.error) {
    const code = logSafeReadFailure(
      "movies",
      "load_movie_library_data",
      result.error,
      result.status,
    );
    throw new Error(`Could not load movie metadata. [${code}]`);
  }
  if (profile.error) throw new Error("Could not load movie timezone.");
  const payload = result.data as {
    movies?: MovieSnapshot<MovieLibraryMedia>[];
  } | null;
  return deriveMovieSections(
    Array.isArray(payload?.movies) ? payload.movies : [],
    dateInTimeZone(new Date(), validTimeZone(profile.data.timezone)),
  );
}

async function loadCachedMovieDetail(
  userId: string,
  tmdbId: number,
): Promise<MovieSnapshot | null> {
  const supabase = await createClient();
  const { data: media, error } = await supabase
    .from("media_items")
    .select("*")
    .eq("tmdb_id", tmdbId)
    .eq("media_type", "movie")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!media) return null;
  const { data: membership, error: membershipError } = await supabase
    .from("user_movies")
    .select(
      "id,user_id,media_item_id,watched_at,is_favourite,created_at,updated_at",
    )
    .eq("user_id", userId)
    .eq("media_item_id", media.id)
    .maybeSingle();
  if (membershipError) throw new Error(membershipError.message);
  return membership ? { membership, media } : null;
}

type MovieDetailDependencies = {
  load: typeof loadCachedMovieDetail;
  synchronize: typeof synchronizeMovie;
};

export async function loadMovieDetail(
  userId: string,
  tmdbId: number,
  overrides: Partial<MovieDetailDependencies> = {},
  now = new Date(),
): Promise<MovieSnapshot | null> {
  const dependencies: MovieDetailDependencies = {
    load: loadCachedMovieDetail,
    synchronize: synchronizeMovie,
    ...overrides,
  };
  let detail = await dependencies.load(userId, tmdbId);
  if (!detail || !isRichMetadataStale(detail.media.rich_metadata_synced_at, now))
    return detail;
  try {
    await dependencies.synchronize(tmdbId);
    detail = await dependencies.load(userId, tmdbId);
  } catch {
    // Rich metadata is supplemental to a usable cached library detail.
    // Keep the legacy row and leave its freshness null/stale for a later retry.
  }
  return detail;
}
