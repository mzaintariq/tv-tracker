import "server-only";

import {
  getTrendingMovies,
  getTrendingTv,
  searchMovies,
  searchTv,
} from "@/lib/tmdb/endpoints";
import {
  mapTmdbMovieListItem,
  mapTmdbTvListItem,
  withLibraryFlags,
} from "@/lib/tmdb/mappers";
import {
  isExploreMediaFilter,
  mergeExploreResults,
  normalizeSearchQuery,
  type ExploreMediaFilter,
  type ExploreMediaItem,
} from "@/lib/media/types";
import { createClient } from "@/lib/supabase/server";
import { TmdbApiError } from "@/lib/tmdb/client";
import { buildLibraryKeys, ExploreLibraryReadError, loadLibraryPages, mediaIdChunks, requireLibraryRows, type LibraryMediaRow, type MembershipMediaRow } from "@/lib/media/library-state";

export type ExplorePageData = {
  filter: ExploreMediaFilter;
  query: string | null;
  items: ExploreMediaItem[];
  error: string | null;
};

function parseFilter(raw: string | undefined): ExploreMediaFilter {
  if (raw && isExploreMediaFilter(raw)) {
    return raw;
  }

  return "all";
}

async function loadLibraryKeys(userId: string): Promise<Set<string>> {
  const supabase = await createClient();

  const [shows, movies] = await Promise.all([
    loadLibraryPages<MembershipMediaRow>("user_shows", (from, to) => supabase.from("user_shows").select("media_item_id").eq("user_id", userId).order("id").range(from, to)),
    loadLibraryPages<MembershipMediaRow>("user_movies", (from, to) => supabase.from("user_movies").select("media_item_id").eq("user_id", userId).order("id").range(from, to)),
  ]);

  const chunks = mediaIdChunks(shows, movies);
  if (!chunks.length) return new Set();
  const results = await Promise.all(chunks.map((ids) => supabase.from("media_items").select("id,tmdb_id,media_type").in("id", ids)));
  const media = results.flatMap((result) => requireLibraryRows(result, "media_items") as LibraryMediaRow[]);
  return buildLibraryKeys(shows, movies, media);
}

async function fetchExploreItems(
  filter: ExploreMediaFilter,
  query: string | null,
): Promise<ExploreMediaItem[]> {
  if (query) {
    if (filter === "tv") {
      const results = await searchTv(query);
      return results.map((item) => mapTmdbTvListItem(item));
    }

    if (filter === "movie") {
      const results = await searchMovies(query);
      return results.map((item) => mapTmdbMovieListItem(item));
    }

    const [tvResults, movieResults] = await Promise.all([
      searchTv(query),
      searchMovies(query),
    ]);

    return mergeExploreResults(
      tvResults.map((item) => mapTmdbTvListItem(item)),
      movieResults.map((item) => mapTmdbMovieListItem(item)),
    );
  }

  if (filter === "tv") {
    const results = await getTrendingTv();
    return results.map((item) => mapTmdbTvListItem(item));
  }

  if (filter === "movie") {
    const results = await getTrendingMovies();
    return results.map((item) => mapTmdbMovieListItem(item));
  }

  const [tvResults, movieResults] = await Promise.all([
    getTrendingTv(),
    getTrendingMovies(),
  ]);

  return mergeExploreResults(
    tvResults.map((item) => mapTmdbTvListItem(item)),
    movieResults.map((item) => mapTmdbMovieListItem(item)),
  );
}

export async function loadExplorePageData(options: {
  userId: string;
  type?: string;
  q?: string;
}): Promise<ExplorePageData> {
  const filter = parseFilter(options.type);
  const query = options.q ? normalizeSearchQuery(options.q) : null;

  try {
    const [items, libraryKeys] = await Promise.all([
      fetchExploreItems(filter, query),
      loadLibraryKeys(options.userId),
    ]);

    return {
      filter,
      query,
      items: withLibraryFlags(items, libraryKeys),
      error: null,
    };
  } catch (error) {
    if (error instanceof ExploreLibraryReadError) console.error(JSON.stringify({ event: "explore_library_load_failed", stage: error.stage, category: "database_error" }));
    const message =
      error instanceof TmdbApiError
        ? "Could not load media from TMDB. Please try again."
        : "Something went wrong while loading Explore.";

    return {
      filter,
      query,
      items: [],
      error: message,
    };
  }
}
