import "server-only";

import {
  getMovieDetails,
  getMovieReleaseDates,
  getTvDetails,
} from "@/lib/tmdb/endpoints";
import {
  loadMovieCredits,
  loadPreferredTrailer,
  loadRegionalWatchProviders,
  loadTvRegionalCertification,
  loadTvTopCast,
} from "@/lib/tmdb/extras";
import {
  normalizeExternalLinks,
  type CastProjection,
  type DirectorProjection,
  type ProviderGroups,
  type TrailerProjection,
} from "@/lib/tmdb/extras-normalize";
import {
  mapTmdbMovieDetailsToCacheRow,
  mapTmdbTvDetailsToCacheRow,
} from "@/lib/tmdb/mappers";
import {
  normalizeTmdbMovieReleaseDates,
  selectRegionalDigitalDate,
  selectRegionalMovieCertification,
  selectRegionalTheatricalDate,
  type RegionalReleaseSelection,
} from "@/lib/movies/release-dates";
import type { MediaType, PreviewKey } from "@/lib/media/types";
export type { PreviewKey } from "@/lib/media/types";

export type PreviewCore = {
  mediaType: MediaType;
  tmdbId: number;
  title: string;
  posterPath: string | null;
  overview: string | null;
  date: string | null;
  runtimeMinutes: number | null;
  status: string | null;
  genres: Array<{ id: number; name: string }>;
  voteAverage: number | null;
  voteCount: number | null;
  originalLanguage: string | null;
  lastAirDate: string | null;
  creators: Array<{ id: number; name: string }>;
  networks: Array<{ id: number; name: string }>;
  links: { tmdb: string; imdb: string | null; homepage: string | null };
};

export type PreviewExtras = {
  cast: CastProjection[];
  directors: DirectorProjection[];
  trailer: TrailerProjection | null;
  providers: ProviderGroups | null;
  certification: string | null;
  theatrical: RegionalReleaseSelection | null;
  digital: RegionalReleaseSelection | null;
  failures: Array<"credits" | "trailer" | "providers" | "regional">;
};

export async function loadPreviewCore(key: PreviewKey): Promise<PreviewCore> {
  if (key.mediaType === "movie") {
    const details = await getMovieDetails(key.tmdbId);
    const row = mapTmdbMovieDetailsToCacheRow(details);
    return {
      mediaType: "movie",
      tmdbId: key.tmdbId,
      title: row.title,
      posterPath: row.poster_path,
      overview: row.overview,
      date: row.release_date,
      runtimeMinutes: row.runtime_minutes,
      status: row.tmdb_status,
      genres: row.genres,
      voteAverage: row.vote_average,
      voteCount: row.vote_count,
      originalLanguage: row.original_language,
      lastAirDate: null,
      creators: [],
      networks: [],
      links: normalizeExternalLinks("movie", key.tmdbId, details.imdb_id, details.homepage),
    };
  }
  const details = await getTvDetails(key.tmdbId);
  const row = mapTmdbTvDetailsToCacheRow(details);
  return {
    mediaType: "tv",
    tmdbId: key.tmdbId,
    title: row.title,
    posterPath: row.poster_path,
    overview: row.overview,
    date: row.release_date,
    runtimeMinutes: row.average_episode_runtime_minutes,
    status: row.tmdb_status,
    genres: row.genres,
    voteAverage: row.vote_average,
    voteCount: row.vote_count,
    originalLanguage: row.original_language,
    lastAirDate: row.last_air_date,
    creators: row.creators,
    networks: row.networks,
    links: normalizeExternalLinks("tv", key.tmdbId, details.external_ids?.imdb_id, details.homepage),
  };
}

async function optional<T>(promise: Promise<T>, category: PreviewExtras["failures"][number], fallback: T) {
  try { return { value: await promise, failure: null }; }
  catch { return { value: fallback, failure: category }; }
}

export async function loadPreviewExtras(key: PreviewKey, region: string | null, language = "en"): Promise<PreviewExtras> {
  const emptyCredits = { cast: [] as CastProjection[], directors: [] as DirectorProjection[] };
  const creditsPromise = key.mediaType === "movie"
    ? optional(loadMovieCredits(key.tmdbId), "credits", emptyCredits)
    : optional(loadTvTopCast(key.tmdbId).then((cast) => ({ cast, directors: [] })), "credits", emptyCredits);
  const trailerPromise = optional(loadPreferredTrailer(key.mediaType, key.tmdbId, language), "trailer", null);
  const providersPromise = region
    ? optional(loadRegionalWatchProviders(key.mediaType, key.tmdbId, region), "providers", null)
    : Promise.resolve({ value: null, failure: null });
  const regionalPromise = key.mediaType === "movie" && region
    ? optional(getMovieReleaseDates(key.tmdbId).then((response) => {
        const rows = normalizeTmdbMovieReleaseDates(response);
        return {
          theatrical: selectRegionalTheatricalDate(rows, region),
          digital: selectRegionalDigitalDate(rows, region),
          certification: selectRegionalMovieCertification(rows, region),
        };
      }), "regional", { theatrical: null, digital: null, certification: null })
    : key.mediaType === "tv" && region
      ? optional(loadTvRegionalCertification(key.tmdbId, region).then((certification) => ({ theatrical: null, digital: null, certification })), "regional", { theatrical: null, digital: null, certification: null })
      : Promise.resolve({ value: { theatrical: null, digital: null, certification: null }, failure: null });
  const [credits, trailer, providers, regional] = await Promise.all([creditsPromise, trailerPromise, providersPromise, regionalPromise]);
  return {
    cast: credits.value.cast.slice(0, 5),
    directors: credits.value.directors,
    trailer: trailer.value,
    providers: providers.value,
    certification: regional.value.certification,
    theatrical: regional.value.theatrical,
    digital: regional.value.digital,
    failures: [credits.failure, trailer.failure, providers.failure, regional.failure].filter((value): value is PreviewExtras["failures"][number] => value !== null),
  };
}
