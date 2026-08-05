import "server-only";

import { cache } from "react";
import { getMovieCredits, getTvAggregateCredits, getTvContentRatings, getVideos, getWatchProviders } from "@/lib/tmdb/endpoints";
import { normalizeCast, normalizeDirectors, normalizeProviders, selectPreferredTrailer, selectTvCertification, type CastProjection, type DirectorProjection, type ProviderGroups, type TrailerProjection } from "@/lib/tmdb/extras-normalize";

export type OptionalMetadataFailure = "credits" | "videos" | "providers" | "content_ratings";
export type OptionalResult<T> = { data: T; failure: null } | { data: T; failure: OptionalMetadataFailure };
const failure = <T>(data: T, category: OptionalMetadataFailure): OptionalResult<T> => ({ data, failure: category });

export const loadTvTopCast = cache(async (tmdbId: number): Promise<CastProjection[]> => normalizeCast(await getTvAggregateCredits(tmdbId)));
export const loadMovieCredits = cache(async (tmdbId: number): Promise<{ cast: CastProjection[]; directors: DirectorProjection[] }> => { const response = await getMovieCredits(tmdbId); return { cast: normalizeCast(response), directors: normalizeDirectors(response) }; });
export const loadPreferredTrailer = cache(async (mediaType: "tv" | "movie", tmdbId: number, preferredLanguage = "en"): Promise<TrailerProjection | null> => selectPreferredTrailer((await getVideos(mediaType, tmdbId)).results ?? [], preferredLanguage));
export const loadRegionalWatchProviders = cache(async (mediaType: "tv" | "movie", tmdbId: number, region: string): Promise<ProviderGroups> => { const selected = region.trim().toUpperCase(); if (!/^[A-Z]{2}$/.test(selected)) return normalizeProviders(selected); const response = await getWatchProviders(mediaType, tmdbId); return normalizeProviders(selected, response.results?.[selected]); });
export const loadTvRegionalCertification = cache(async (tmdbId: number, region: string): Promise<string | null> => { const selected = region.trim().toUpperCase(); if (!/^[A-Z]{2}$/.test(selected)) return null; return selectTvCertification((await getTvContentRatings(tmdbId)).results ?? [], selected); });

// A future detail route can use this bundle without allowing any supplemental
// TMDB failure to make its core database-backed detail unavailable.
export async function loadTvExtras(tmdbId: number, region: string, language = "en") {
  const [cast, trailer, providers, certification] = await Promise.allSettled([loadTvTopCast(tmdbId), loadPreferredTrailer("tv", tmdbId, language), loadRegionalWatchProviders("tv", tmdbId, region), loadTvRegionalCertification(tmdbId, region)]);
  return {
    cast: cast.status === "fulfilled" ? { data: cast.value, failure: null } satisfies OptionalResult<CastProjection[]> : failure([], "credits"),
    trailer: trailer.status === "fulfilled" ? { data: trailer.value, failure: null } satisfies OptionalResult<TrailerProjection | null> : failure(null, "videos"),
    providers: providers.status === "fulfilled" ? { data: providers.value, failure: null } satisfies OptionalResult<ProviderGroups> : failure(normalizeProviders(region), "providers"),
    certification: certification.status === "fulfilled" ? { data: certification.value, failure: null } satisfies OptionalResult<string | null> : failure(null, "content_ratings"),
  };
}
