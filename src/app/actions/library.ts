"use server";

import { revalidatePath } from "next/cache";

import {
  isMediaType,
  parseTmdbId,
  type MediaType,
} from "@/lib/media/types";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { TmdbApiError } from "@/lib/tmdb/client";
import { getMovieDetails, getTvDetails } from "@/lib/tmdb/endpoints";
import {
  mapTmdbMovieDetailsToCacheRow,
  mapTmdbTvDetailsToCacheRow,
} from "@/lib/tmdb/mappers";

export type LibraryActionState = {
  error?: string;
  success?: string;
};

function uniqueViolation(error: { code?: string; message?: string }): boolean {
  return error.code === "23505" || Boolean(error.message?.includes("duplicate"));
}

async function upsertMediaItem(mediaType: MediaType, tmdbId: number) {
  if (mediaType === "tv") {
    const details = await getTvDetails(tmdbId);
    return mapTmdbTvDetailsToCacheRow(details);
  }

  const details = await getMovieDetails(tmdbId);
  return mapTmdbMovieDetailsToCacheRow(details);
}

export async function addToLibrary(
  mediaTypeRaw: string,
  tmdbIdRaw: string | number,
): Promise<LibraryActionState> {
  if (!isMediaType(mediaTypeRaw)) {
    return { error: "Media type must be tv or movie." };
  }

  const tmdbId = parseTmdbId(tmdbIdRaw);
  if (tmdbId === null) {
    return { error: "TMDB ID must be a positive integer." };
  }

  const mediaType: MediaType = mediaTypeRaw;

  if (mediaType === "tv") {
    return {
      error:
        "TV shows must be added through the show progress setup workflow.",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { error: "You must be signed in to update your library." };
  }

  try {
    const cacheRow = await upsertMediaItem(mediaType, tmdbId);
    const admin = createAdminClient();

    const { data: mediaItem, error: upsertError } = await admin
      .from("media_items")
      .upsert(cacheRow, { onConflict: "tmdb_id,media_type" })
      .select("id")
      .single();

    if (upsertError || !mediaItem) {
      return {
        error: upsertError?.message ?? "Could not cache media metadata.",
      };
    }

    const { error } = await supabase.from("user_movies").insert({
      user_id: user.id,
      media_item_id: mediaItem.id,
    });

    if (error) {
      if (uniqueViolation(error)) {
        return { error: "This movie is already in your watchlist." };
      }

      return { error: error.message };
    }

    revalidatePath("/explore");
    revalidatePath("/shows");
    revalidatePath("/movies");

    return { success: "Added to your watchlist." };
  } catch (error) {
    if (error instanceof TmdbApiError) {
      return { error: "Could not fetch media details from TMDB." };
    }

    return { error: "Could not add this title to your library." };
  }
}

export async function removeFromLibrary(
  mediaTypeRaw: string,
  tmdbIdRaw: string | number,
): Promise<LibraryActionState> {
  if (!isMediaType(mediaTypeRaw)) {
    return { error: "Media type must be tv or movie." };
  }

  const tmdbId = parseTmdbId(tmdbIdRaw);
  if (tmdbId === null) {
    return { error: "TMDB ID must be a positive integer." };
  }

  const mediaType: MediaType = mediaTypeRaw;
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { error: "You must be signed in to update your library." };
  }

  const { data: mediaItem, error: mediaError } = await supabase
    .from("media_items")
    .select("id")
    .eq("tmdb_id", tmdbId)
    .eq("media_type", mediaType)
    .maybeSingle();

  if (mediaError) {
    return { error: mediaError.message };
  }

  if (!mediaItem) {
    return { error: "That title is not in your library." };
  }

  if (mediaType === "tv") {
    const { error } = await supabase
      .from("user_shows")
      .delete()
      .eq("user_id", user.id)
      .eq("media_item_id", mediaItem.id);

    if (error) {
      return { error: error.message };
    }
  } else {
    const { data, error } = await supabase
      .from("user_movies")
      .delete()
      .eq("user_id", user.id)
      .eq("media_item_id", mediaItem.id)
      .select("id")
      .maybeSingle();

    if (error) {
      return { error: error.message };
    }

    if (!data) {
      return { error: "That movie is not in your library." };
    }
  }

  revalidatePath("/explore");
  revalidatePath("/shows");
  revalidatePath("/movies");

  return {
    success:
      mediaType === "tv"
        ? "Removed from your library."
        : "Removed from your watchlist.",
  };
}
