import type {
  ExploreMediaItem,
  MediaItemCacheRow,
} from "@/lib/media/types";
import { yearFromDate } from "@/lib/media/types";
import type {
  TmdbMovieDetails,
  TmdbMovieListItem,
  TmdbTvDetails,
  TmdbTvListItem,
} from "@/lib/tmdb/types";

function averageEpisodeRuntime(
  episodeRunTimes: number[] | undefined,
): number | null {
  if (!episodeRunTimes || episodeRunTimes.length === 0) {
    return null;
  }

  const valid = episodeRunTimes.filter(
    (value) => Number.isFinite(value) && value > 0,
  );

  if (valid.length === 0) {
    return null;
  }

  return Math.round(
    valid.reduce((sum, value) => sum + value, 0) / valid.length,
  );
}

export function mapTmdbTvListItem(
  item: TmdbTvListItem,
  inLibrary = false,
): ExploreMediaItem {
  return {
    tmdbId: item.id,
    mediaType: "tv",
    title: item.name,
    year: yearFromDate(item.first_air_date),
    overview: item.overview ?? "",
    posterPath: item.poster_path,
    backdropPath: item.backdrop_path,
    inLibrary,
  };
}

export function mapTmdbMovieListItem(
  item: TmdbMovieListItem,
  inLibrary = false,
): ExploreMediaItem {
  return {
    tmdbId: item.id,
    mediaType: "movie",
    title: item.title,
    year: yearFromDate(item.release_date),
    overview: item.overview ?? "",
    posterPath: item.poster_path,
    backdropPath: item.backdrop_path,
    inLibrary,
  };
}

export function mapTmdbTvDetailsToCacheRow(
  details: TmdbTvDetails,
): MediaItemCacheRow {
  const imdbId = details.external_ids?.imdb_id?.trim() || null;

  return {
    tmdb_id: details.id,
    media_type: "tv",
    title: details.name,
    original_title: details.original_name ?? null,
    overview: details.overview || null,
    poster_path: details.poster_path,
    backdrop_path: details.backdrop_path,
    release_date: details.first_air_date?.slice(0, 10) || null,
    imdb_id: imdbId,
    runtime_minutes: null,
    average_episode_runtime_minutes: averageEpisodeRuntime(
      details.episode_run_time,
    ),
    tmdb_status: details.status ?? null,
    last_synced_at: new Date().toISOString(),
  };
}

export function mapTmdbMovieDetailsToCacheRow(
  details: TmdbMovieDetails,
): MediaItemCacheRow {
  const imdbId = details.imdb_id?.trim() || null;
  const runtime =
    typeof details.runtime === "number" && details.runtime > 0
      ? details.runtime
      : null;

  return {
    tmdb_id: details.id,
    media_type: "movie",
    title: details.title,
    original_title: details.original_title ?? null,
    overview: details.overview || null,
    poster_path: details.poster_path,
    backdrop_path: details.backdrop_path,
    release_date: details.release_date?.slice(0, 10) || null,
    imdb_id: imdbId,
    runtime_minutes: runtime,
    average_episode_runtime_minutes: null,
    tmdb_status: details.status ?? null,
    last_synced_at: new Date().toISOString(),
  };
}

export function withLibraryFlags(
  items: ExploreMediaItem[],
  libraryKeys: ReadonlySet<string>,
): ExploreMediaItem[] {
  return items.map((item) => ({
    ...item,
    inLibrary: libraryKeys.has(`${item.mediaType}:${item.tmdbId}`),
  }));
}

export function libraryKey(mediaType: "tv" | "movie", tmdbId: number): string {
  return `${mediaType}:${tmdbId}`;
}
