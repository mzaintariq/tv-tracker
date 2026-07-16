export type MediaType = "tv" | "movie";

export type ExploreMediaFilter = "all" | MediaType;

export type ExploreMediaItem = {
  tmdbId: number;
  mediaType: MediaType;
  title: string;
  year: number | null;
  overview: string;
  posterPath: string | null;
  backdropPath: string | null;
  inLibrary: boolean;
};

export type MediaItemCacheRow = {
  tmdb_id: number;
  media_type: MediaType;
  title: string;
  original_title: string | null;
  overview: string | null;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string | null;
  imdb_id: string | null;
  runtime_minutes: number | null;
  average_episode_runtime_minutes: number | null;
  tmdb_status: string | null;
  last_synced_at: string;
};

export const MAX_SEARCH_QUERY_LENGTH = 100;

export function isMediaType(value: string): value is MediaType {
  return value === "tv" || value === "movie";
}

export function isExploreMediaFilter(value: string): value is ExploreMediaFilter {
  return value === "all" || isMediaType(value);
}

export function parseTmdbId(value: unknown): number | null {
  const numeric =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number.parseInt(value, 10)
        : Number.NaN;

  if (!Number.isInteger(numeric) || numeric <= 0) {
    return null;
  }

  return numeric;
}

export function normalizeSearchQuery(raw: string): string | null {
  const trimmed = raw.trim();

  if (trimmed.length === 0) {
    return null;
  }

  if (trimmed.length > MAX_SEARCH_QUERY_LENGTH) {
    return trimmed.slice(0, MAX_SEARCH_QUERY_LENGTH);
  }

  return trimmed;
}

export function posterUrl(
  posterPath: string | null,
  size: "w92" | "w185" | "w342" | "w500" = "w342",
): string | null {
  if (!posterPath) {
    return null;
  }

  return `https://image.tmdb.org/t/p/${size}${posterPath}`;
}

export function yearFromDate(date: string | null | undefined): number | null {
  if (!date || date.length < 4) {
    return null;
  }

  const year = Number.parseInt(date.slice(0, 4), 10);
  return Number.isInteger(year) && year > 0 ? year : null;
}

export function mergeExploreResults(
  tvItems: ExploreMediaItem[],
  movieItems: ExploreMediaItem[],
): ExploreMediaItem[] {
  const merged: ExploreMediaItem[] = [];
  const maxLength = Math.max(tvItems.length, movieItems.length);

  for (let index = 0; index < maxLength; index += 1) {
    const tvItem = tvItems[index];
    const movieItem = movieItems[index];

    if (tvItem) {
      merged.push(tvItem);
    }

    if (movieItem) {
      merged.push(movieItem);
    }
  }

  return merged;
}

export function titleInitials(title: string): string {
  const words = title.trim().split(/\s+/).filter(Boolean);

  if (words.length === 0) {
    return "?";
  }

  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }

  return `${words[0][0] ?? ""}${words[1][0] ?? ""}`.toUpperCase();
}
