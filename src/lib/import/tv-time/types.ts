export const TV_TIME_SOURCE_KEY_VERSION = 1;
export const MAX_COMPRESSED_UPLOAD_BYTES = 3_500_000;
export const MAX_TV_COORDINATES = 2_000;
export const MAX_MATCH_CONTEXT_BYTES = 524_288;

export type TvCoordinate = {
  seasonNumber: number;
  episodeNumber: number;
};

export type TvMatchContext = {
  version: 1;
  kind: "tv";
  coordinates: TvCoordinate[];
};

export type MovieMatchContext = {
  version: 1;
  kind: "movie";
  releaseDate: string | null;
};

export type MatchContext = TvMatchContext | MovieMatchContext;

export type NormalizedTimestamp = {
  instant: string;
  source: "legacy_watch_date_epoch" | "created_at_assumed_utc";
};

export type NormalizedEpisodeEvent = TvCoordinate & {
  sourceEventKey: string;
  tvTimeEpisodeId: string;
  watchedAt: NormalizedTimestamp;
  sourceEventCount: number;
};

export type NormalizedTvShow = {
  sourceKey: string;
  tvTimeShowId: string;
  title: string;
  currentlyActive: boolean;
  isFavourite: boolean;
  importMode: "active_membership" | "history_only";
  episodeEvents: NormalizedEpisodeEvent[];
  sourceRecordCount: number;
};

export type NormalizedMovie = {
  sourceKey: string;
  title: string;
  releaseDate: string;
  state: "watched" | "watch_next";
  watchedAt: NormalizedTimestamp | null;
  sourceEventCount: number;
  sourceRecordCount: number;
};

export type NormalizedImportSummary = {
  sourceFiles: Record<string, number>;
  shows: number;
  activeShows: number;
  historyOnlyShows: number;
  episodeEvents: number;
  collapsedEpisodeEvents: number;
  movies: number;
  watchedMovies: number;
  watchNextMovies: number;
  possibleMovieFavourites: number;
  detailedMovieCount: number;
  cachedMovieCount: number | null;
};

export type NormalizedTvTimeImport = {
  shows: NormalizedTvShow[];
  movies: NormalizedMovie[];
  possibleMovieFavouriteKeys: string[];
  summary: NormalizedImportSummary;
};
