export type TmdbImagePath = string | null;

export type TmdbPaginatedResponse<T> = {
  page: number;
  results: T[];
  total_pages: number;
  total_results: number;
};

export type TmdbTvListItem = {
  id: number;
  name: string;
  original_name?: string;
  overview: string;
  poster_path: TmdbImagePath;
  backdrop_path: TmdbImagePath;
  first_air_date?: string;
  popularity?: number;
  vote_average?: number;
  adult?: boolean;
};

export type TmdbMovieListItem = {
  id: number;
  title: string;
  original_title?: string;
  overview: string;
  poster_path: TmdbImagePath;
  backdrop_path: TmdbImagePath;
  release_date?: string;
  popularity?: number;
  vote_average?: number;
  adult?: boolean;
};

export type TmdbExternalIds = {
  imdb_id?: string | null;
  tvdb_id?: number | null;
  freebase_mid?: string | null;
  freebase_id?: string | null;
  tvrage_id?: number | null;
  wikidata_id?: string | null;
  facebook_id?: string | null;
  instagram_id?: string | null;
  twitter_id?: string | null;
};

export type TmdbTvDetails = TmdbTvListItem & {
  status?: string;
  episode_run_time?: number[];
  external_ids?: TmdbExternalIds;
  seasons?: TmdbSeasonSummary[];
};

export type TmdbSeasonSummary = {
  id: number; season_number: number; episode_count: number; name: string;
  air_date?: string | null; poster_path: TmdbImagePath;
};

export type TmdbEpisode = {
  id: number; episode_number: number; season_number: number; name: string;
  air_date?: string | null; runtime?: number | null; overview?: string;
};

export type TmdbSeasonDetails = TmdbSeasonSummary & { episodes: TmdbEpisode[] };

export type TmdbMovieDetails = TmdbMovieListItem & {
  status?: string;
  runtime?: number | null;
  imdb_id?: string | null;
};
