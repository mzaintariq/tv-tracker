import type { MediaItem, UserMovie } from "@/types/database";

export type MovieLibraryMedia = Pick<MediaItem, "id" | "tmdb_id" | "title" | "poster_path" | "release_date">;

export const RECENTLY_WATCHED_MOVIES_LIMIT = 10;

export type MovieSnapshot<TMedia extends MovieLibraryMedia = MediaItem> = { membership: UserMovie; media: TMedia };
export type MovieSections<TMedia extends MovieLibraryMedia = MovieLibraryMedia> = {
  movies: MovieSnapshot<TMedia>[];
  watchNext: MovieSnapshot<TMedia>[];
  recentlyWatched: MovieSnapshot<TMedia>[];
  watched: MovieSnapshot<TMedia>[];
  favourites: MovieSnapshot<TMedia>[];
};

const titleCompare = <TMedia extends MovieLibraryMedia>(left: MovieSnapshot<TMedia>, right: MovieSnapshot<TMedia>) =>
  left.media.title.localeCompare(right.media.title, undefined, { sensitivity: "base" }) ||
  left.media.tmdb_id - right.media.tmdb_id ||
  left.membership.id.localeCompare(right.membership.id);

const watchedCompare = <TMedia extends MovieLibraryMedia>(left: MovieSnapshot<TMedia>, right: MovieSnapshot<TMedia>) =>
  (right.membership.watched_at ?? "").localeCompare(left.membership.watched_at ?? "") || titleCompare(left, right);

export function deriveMovieSections<TMedia extends MovieLibraryMedia>(movies: readonly MovieSnapshot<TMedia>[]): MovieSections<TMedia> {
  const all = [...movies];
  const watchNext = all
    .filter((movie) => movie.membership.watched_at === null)
    .sort((left, right) => right.membership.created_at.localeCompare(left.membership.created_at) || titleCompare(left, right));
  const watched = all.filter((movie) => movie.membership.watched_at !== null).sort(watchedCompare);
  const favourites = all.filter((movie) => movie.membership.is_favourite).sort(titleCompare);
  return { movies: all, watchNext, recentlyWatched: watched.slice(0, RECENTLY_WATCHED_MOVIES_LIMIT), watched, favourites };
}
