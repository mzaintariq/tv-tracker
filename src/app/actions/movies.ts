"use server";

import { revalidatePath } from "next/cache";
import { parseTmdbId } from "@/lib/media/types";
import { parseManualWatchedAt, parseUuid } from "@/lib/shows/validation";
import { createClient } from "@/lib/supabase/server";

export type MovieActionResult = { error?: string; success?: string };

async function ownedMovie(tmdbIdRaw: unknown, mediaIdRaw: unknown) {
  const tmdbId = parseTmdbId(tmdbIdRaw);
  const mediaId = parseUuid(mediaIdRaw);
  if (tmdbId === null || !mediaId) return { error: "Invalid movie request." } as const;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in." } as const;
  const { data: media, error: mediaError } = await supabase.from("media_items").select("id").eq("id", mediaId).eq("tmdb_id", tmdbId).eq("media_type", "movie").maybeSingle();
  if (mediaError) return { error: "Could not verify this movie." } as const;
  if (!media) return { error: "Movie not found." } as const;
  const { data: membership, error: membershipError } = await supabase.from("user_movies").select("id,watched_at").eq("user_id", user.id).eq("media_item_id", media.id).maybeSingle();
  if (membershipError) return { error: "Could not verify your movie library." } as const;
  if (!membership) return { error: "This movie is not in your library." } as const;
  return { supabase, user, media, membership, tmdbId } as const;
}

function refresh(tmdbId: number) {
  revalidatePath("/movies");
  revalidatePath(`/movies/${tmdbId}`);
  revalidatePath("/explore");
  revalidatePath("/profile");
}

export async function setMovieWatched(tmdbIdRaw: unknown, mediaIdRaw: unknown, watched: unknown, watchedAtRaw?: unknown): Promise<MovieActionResult> {
  if (typeof watched !== "boolean") return { error: "Invalid watched state." };
  const owned = await ownedMovie(tmdbIdRaw, mediaIdRaw);
  if ("error" in owned) return { error: owned.error };
  const watchedAt = watchedAtRaw === undefined ? new Date().toISOString() : parseManualWatchedAt(watchedAtRaw);
  if (watched && !watchedAt) return { error: "Choose a valid watched date that is not in the future." };
  const { data, error } = await owned.supabase.from("user_movies").update({ watched_at: watched ? watchedAt : null }).eq("id", owned.membership.id).eq("user_id", owned.user.id).select("id").maybeSingle();
  if (error) return { error: error.message };
  if (!data) return { error: "This movie is no longer in your library." };
  refresh(owned.tmdbId);
  return { success: watched ? "Movie marked watched." : "Movie marked unwatched." };
}

export async function updateMovieWatchedAt(tmdbIdRaw: unknown, mediaIdRaw: unknown, watchedAtRaw: unknown): Promise<MovieActionResult> {
  const watchedAt = parseManualWatchedAt(watchedAtRaw);
  if (!watchedAt) return { error: "Choose a valid historical watched date." };
  const owned = await ownedMovie(tmdbIdRaw, mediaIdRaw);
  if ("error" in owned) return { error: owned.error };
  if (!owned.membership.watched_at) return { error: "Mark this movie watched before editing its watched date." };
  const { data, error } = await owned.supabase.from("user_movies").update({ watched_at: watchedAt }).eq("id", owned.membership.id).eq("user_id", owned.user.id).select("id").maybeSingle();
  if (error) return { error: error.message };
  if (!data) return { error: "This movie is no longer in your library." };
  refresh(owned.tmdbId);
  return { success: "Watched date updated." };
}

export async function toggleMovieFavourite(tmdbIdRaw: unknown, mediaIdRaw: unknown, isFavouriteRaw: unknown): Promise<MovieActionResult> {
  if (typeof isFavouriteRaw !== "boolean") return { error: "Invalid favourite state." };
  const owned = await ownedMovie(tmdbIdRaw, mediaIdRaw);
  if ("error" in owned) return { error: owned.error };
  const { data, error } = await owned.supabase.from("user_movies").update({ is_favourite: isFavouriteRaw }).eq("id", owned.membership.id).eq("user_id", owned.user.id).select("id").maybeSingle();
  if (error) return { error: error.message };
  if (!data) return { error: "This movie is no longer in your library." };
  refresh(owned.tmdbId);
  return { success: isFavouriteRaw ? "Added to favourites." : "Removed from favourites." };
}

export async function removeMovie(tmdbIdRaw: unknown, mediaIdRaw: unknown): Promise<MovieActionResult> {
  const owned = await ownedMovie(tmdbIdRaw, mediaIdRaw);
  if ("error" in owned) return { error: owned.error };
  const { data, error } = await owned.supabase.from("user_movies").delete().eq("id", owned.membership.id).eq("user_id", owned.user.id).select("id").maybeSingle();
  if (error) return { error: error.message };
  if (!data) return { error: "This movie is no longer in your library." };
  refresh(owned.tmdbId);
  return { success: "Movie removed from your library." };
}
