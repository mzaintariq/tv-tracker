import "server-only";

import { fetchTmdb } from "@/lib/tmdb/client";
import type {
  TmdbMovieDetails,
  TmdbMovieListItem,
  TmdbPaginatedResponse,
  TmdbTvDetails,
  TmdbTvListItem,
} from "@/lib/tmdb/types";

const PAGE = 1;

function excludeAdultParams() {
  return { include_adult: false, page: PAGE } as const;
}

export async function getTrendingTv(): Promise<TmdbTvListItem[]> {
  const data = await fetchTmdb<TmdbPaginatedResponse<TmdbTvListItem>>({
    path: "/trending/tv/week",
    searchParams: { page: PAGE },
  });

  return data.results.filter((item) => !item.adult);
}

export async function getTrendingMovies(): Promise<TmdbMovieListItem[]> {
  const data = await fetchTmdb<TmdbPaginatedResponse<TmdbMovieListItem>>({
    path: "/trending/movie/week",
    searchParams: { page: PAGE },
  });

  return data.results.filter((item) => !item.adult);
}

export async function searchTv(query: string): Promise<TmdbTvListItem[]> {
  const data = await fetchTmdb<TmdbPaginatedResponse<TmdbTvListItem>>({
    path: "/search/tv",
    searchParams: {
      query,
      ...excludeAdultParams(),
    },
  });

  return data.results.filter((item) => !item.adult);
}

export async function searchMovies(
  query: string,
): Promise<TmdbMovieListItem[]> {
  const data = await fetchTmdb<TmdbPaginatedResponse<TmdbMovieListItem>>({
    path: "/search/movie",
    searchParams: {
      query,
      ...excludeAdultParams(),
    },
  });

  return data.results.filter((item) => !item.adult);
}

export async function getTvDetails(tmdbId: number): Promise<TmdbTvDetails> {
  return fetchTmdb<TmdbTvDetails>({
    path: `/tv/${tmdbId}`,
    searchParams: {
      append_to_response: "external_ids",
    },
  });
}

export async function getMovieDetails(
  tmdbId: number,
): Promise<TmdbMovieDetails> {
  return fetchTmdb<TmdbMovieDetails>({
    path: `/movie/${tmdbId}`,
  });
}
