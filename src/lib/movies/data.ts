import "server-only";

import { deriveMovieSections, type MovieLibraryMedia, type MovieSections, type MovieSnapshot } from "@/lib/movies/movies";
import { createClient } from "@/lib/supabase/server";
import { logSafeReadFailure } from "@/lib/supabase/read-diagnostics";

export async function loadMovies(_userId: string): Promise<MovieSections> {
  void _userId;
  const supabase = await createClient();
  const result = await supabase.rpc("load_movie_library_data");
  if (result.error) {
    const code = logSafeReadFailure("movies", "load_movie_library_data", result.error, result.status);
    throw new Error(`Could not load movie metadata. [${code}]`);
  }
  const payload = result.data as { movies?: MovieSnapshot<MovieLibraryMedia>[] } | null;
  return deriveMovieSections(Array.isArray(payload?.movies) ? payload.movies : []);
}

export async function loadMovieDetail(userId: string, tmdbId: number): Promise<MovieSnapshot | null> {
  const supabase = await createClient();
  const { data: media, error } = await supabase.from("media_items").select("*").eq("tmdb_id", tmdbId).eq("media_type", "movie").maybeSingle();
  if (error) throw new Error(error.message);
  if (!media) return null;
  const { data: membership, error: membershipError } = await supabase.from("user_movies").select("id,user_id,media_item_id,watched_at,is_favourite,created_at,updated_at").eq("user_id", userId).eq("media_item_id", media.id).maybeSingle();
  if (membershipError) throw new Error(membershipError.message);
  return membership ? { membership, media } : null;
}
