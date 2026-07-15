import "server-only";

import { deriveMovieSections, type MovieSections, type MovieSnapshot } from "@/lib/movies/movies";
import { createClient } from "@/lib/supabase/server";

export async function loadMovies(userId: string): Promise<MovieSections> {
  const supabase = await createClient();
  const { data: memberships, error } = await supabase.from("user_movies").select("id,user_id,media_item_id,watched_at,is_favourite,created_at,updated_at").eq("user_id", userId);
  if (error) throw new Error("Could not load your movies.");
  if (!memberships?.length) return deriveMovieSections([]);
  const { data: media, error: mediaError } = await supabase.from("media_items").select("*").eq("media_type", "movie").in("id", memberships.map((row) => row.media_item_id));
  if (mediaError) throw new Error("Could not load movie metadata.");
  const mediaById = new Map((media ?? []).map((row) => [row.id, row]));
  return deriveMovieSections(memberships.flatMap((membership) => {
    const item = mediaById.get(membership.media_item_id);
    return item ? [{ membership, media: item }] : [];
  }));
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
