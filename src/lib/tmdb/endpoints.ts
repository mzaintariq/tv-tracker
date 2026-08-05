import "server-only";

import { fetchTmdb } from "@/lib/tmdb/client";
import type {
  TmdbMovieDetails,
  TmdbMovieListItem,
  TmdbPaginatedResponse,
  TmdbTvDetails,
  TmdbTvListItem,
  TmdbSeasonDetails,
  TmdbMovieReleaseDatesResponse,
  TmdbCreditsResponse,
  TmdbVideosResponse,
  TmdbWatchProvidersResponse,
  TmdbTvContentRatingsResponse,
} from "@/lib/tmdb/types";

const PAGE = 1;

function excludeAdultParams() {
  return { include_adult: false, page: PAGE } as const;
}

export function getTvAggregateCredits(tmdbId: number): Promise<TmdbCreditsResponse> {
  return fetchTmdb({ path: `/tv/${tmdbId}/aggregate_credits`, revalidateSeconds: 86400 });
}
export function getMovieCredits(tmdbId: number): Promise<TmdbCreditsResponse> {
  return fetchTmdb({ path: `/movie/${tmdbId}/credits`, revalidateSeconds: 86400 });
}
export function getVideos(mediaType: "tv" | "movie", tmdbId: number): Promise<TmdbVideosResponse> {
  return fetchTmdb({ path: `/${mediaType}/${tmdbId}/videos`, revalidateSeconds: 43200 });
}
export function getWatchProviders(mediaType: "tv" | "movie", tmdbId: number): Promise<TmdbWatchProvidersResponse> {
  return fetchTmdb({ path: `/${mediaType}/${tmdbId}/watch/providers`, revalidateSeconds: 21600 });
}
export function getTvContentRatings(tmdbId: number): Promise<TmdbTvContentRatingsResponse> {
  return fetchTmdb({ path: `/tv/${tmdbId}/content_ratings`, revalidateSeconds: 86400 });
}

export async function getTvSeason(
  tmdbId: number,
  seasonNumber: number,
  forceRefresh = false,
): Promise<TmdbSeasonDetails> {
  return fetchTmdb<TmdbSeasonDetails>({
    path: `/tv/${tmdbId}/season/${seasonNumber}`,
    forceRefresh,
  });
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

export async function searchTv(
  query: string,
  firstAirYear?: number,
): Promise<TmdbTvListItem[]> {
  const data = await fetchTmdb<TmdbPaginatedResponse<TmdbTvListItem>>({
    path: "/search/tv",
    searchParams: {
      query,
      first_air_date_year: firstAirYear,
      ...excludeAdultParams(),
    },
  });

  return data.results.filter((item) => !item.adult);
}

export async function searchMovies(
  query: string,
  primaryReleaseYear?: number,
): Promise<TmdbMovieListItem[]> {
  const data = await fetchTmdb<TmdbPaginatedResponse<TmdbMovieListItem>>({
    path: "/search/movie",
    searchParams: {
      query,
      primary_release_year: primaryReleaseYear,
      ...excludeAdultParams(),
    },
  });

  return data.results.filter((item) => !item.adult);
}

export async function getTvDetails(
  tmdbId: number,
  forceRefresh = false,
): Promise<TmdbTvDetails> {
  return fetchTmdb<TmdbTvDetails>({
    path: `/tv/${tmdbId}`,
    searchParams: {
      append_to_response: "external_ids",
    },
    forceRefresh,
  });
}

export async function getMovieDetails(
  tmdbId: number,
  forceRefresh = false,
): Promise<TmdbMovieDetails> {
  return fetchTmdb<TmdbMovieDetails>({
    path: `/movie/${tmdbId}`,
    forceRefresh,
  });
}

export async function getMovieReleaseDates(
  tmdbId: number,
  forceRefresh = false,
): Promise<TmdbMovieReleaseDatesResponse> {
  return fetchTmdb<TmdbMovieReleaseDatesResponse>({
    path: `/movie/${tmdbId}/release_dates`,
    forceRefresh,
  });
}
