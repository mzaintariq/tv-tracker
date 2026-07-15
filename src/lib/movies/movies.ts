import type { MediaItem, UserMovie } from "@/types/database";

export const RECENTLY_WATCHED_MOVIES_LIMIT = 10;

export type MovieSnapshot = { membership: UserMovie; media: MediaItem };
export type MovieSections = {
  movies: MovieSnapshot[];
  watchNext: MovieSnapshot[];
  recentlyWatched: MovieSnapshot[];
  watched: MovieSnapshot[];
  favourites: MovieSnapshot[];
};

const titleCompare = (left: MovieSnapshot, right: MovieSnapshot) =>
  left.media.title.localeCompare(right.media.title, undefined, { sensitivity: "base" }) ||
  left.media.tmdb_id - right.media.tmdb_id ||
  left.membership.id.localeCompare(right.membership.id);

const watchedCompare = (left: MovieSnapshot, right: MovieSnapshot) =>
  (right.membership.watched_at ?? "").localeCompare(left.membership.watched_at ?? "") || titleCompare(left, right);

export function deriveMovieSections(movies: readonly MovieSnapshot[]): MovieSections {
  const all = [...movies];
  const watchNext = all
    .filter((movie) => movie.membership.watched_at === null)
    .sort((left, right) => right.membership.created_at.localeCompare(left.membership.created_at) || titleCompare(left, right));
  const watched = all.filter((movie) => movie.membership.watched_at !== null).sort(watchedCompare);
  const favourites = all.filter((movie) => movie.membership.is_favourite).sort(titleCompare);
  return { movies: all, watchNext, recentlyWatched: watched.slice(0, RECENTLY_WATCHED_MOVIES_LIMIT), watched, favourites };
}
