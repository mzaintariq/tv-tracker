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

export type TmdbNamedEntity = { id: number; name: string };
export type TmdbCreator = TmdbNamedEntity & { profile_path?: TmdbImagePath };

export type TmdbTvDetails = TmdbTvListItem & {
  status?: string;
  episode_run_time?: number[];
  external_ids?: TmdbExternalIds;
  seasons?: TmdbSeasonSummary[];
  genres?: TmdbNamedEntity[];
  vote_count?: number;
  original_language?: string;
  last_air_date?: string | null;
  networks?: TmdbNamedEntity[];
  created_by?: TmdbCreator[];
  origin_country?: string[];
  homepage?: string | null;
};

export type TmdbSeasonSummary = {
  id: number;
  season_number: number;
  episode_count: number;
  name: string;
  air_date?: string | null;
  poster_path: TmdbImagePath;
};

export type TmdbEpisode = {
  id: number;
  episode_number: number;
  season_number: number;
  name: string;
  air_date?: string | null;
  runtime?: number | null;
  overview?: string;
};

export type TmdbSeasonDetails = TmdbSeasonSummary & { episodes: TmdbEpisode[] };

export type TmdbMovieDetails = TmdbMovieListItem & {
  status?: string;
  runtime?: number | null;
  imdb_id?: string | null;
  genres?: TmdbNamedEntity[];
  vote_count?: number;
  original_language?: string;
  production_companies?: TmdbNamedEntity[];
  homepage?: string | null;
};

export type TmdbCastMember = {
  id: number; name: string; character?: string; profile_path?: TmdbImagePath;
  order?: number; roles?: { character?: string; episode_count?: number }[];
};
export type TmdbCrewMember = { id: number; name: string; job?: string };
export type TmdbCreditsResponse = { id: number; cast?: TmdbCastMember[]; crew?: TmdbCrewMember[] };
export type TmdbVideo = { id: string; key: string; site: string; type: string; name: string; official?: boolean; iso_639_1?: string; published_at?: string };
export type TmdbVideosResponse = { id: number; results?: TmdbVideo[] };
export type TmdbWatchProvider = { provider_id: number; provider_name: string; logo_path?: TmdbImagePath; display_priority?: number };
export type TmdbWatchProviderRegion = { link?: string; flatrate?: TmdbWatchProvider[]; free?: TmdbWatchProvider[]; ads?: TmdbWatchProvider[]; rent?: TmdbWatchProvider[]; buy?: TmdbWatchProvider[] };
export type TmdbWatchProvidersResponse = { id: number; results?: Record<string, TmdbWatchProviderRegion> };
export type TmdbTvContentRating = { iso_3166_1: string; rating: string };
export type TmdbTvContentRatingsResponse = { id: number; results?: TmdbTvContentRating[] };

export type TmdbMovieReleaseDate = {
  certification: string;
  descriptors?: string[];
  iso_639_1?: string | null;
  note: string;
  release_date: string;
  type: number;
};

export type TmdbMovieReleaseDateRegion = {
  iso_3166_1: string;
  release_dates: TmdbMovieReleaseDate[];
};

export type TmdbMovieReleaseDatesResponse = {
  id: number;
  results: TmdbMovieReleaseDateRegion[];
};
