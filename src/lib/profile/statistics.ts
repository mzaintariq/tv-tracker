export type ProfileStatistics = {
  trackedShows: number; episodesWatched: number; moviesInLibrary: number; moviesWatched: number;
  favouriteShows: number; favouriteMovies: number; completedShows: number; caughtUpShows: number;
  tvMinutes: number; movieMinutes: number; totalMinutes: number;
};

export type ProfileFavourite = {
  membershipId: string;
  mediaItemId: string;
  tmdbId: number;
  mediaType: "tv" | "movie";
  title: string;
  posterPath: string | null;
};

export type ProfileStatisticsRow = {
  tracked_shows: number;
  episodes_watched: number;
  movies_in_library: number;
  movies_watched: number;
  favourite_shows: number;
  favourite_movies: number;
  completed_shows: number;
  caught_up_shows: number;
  tv_minutes: number;
  movie_minutes: number;
};

export type ProfileFavouriteRow = {
  membership_id: string;
  media_item_id: string;
  tmdb_id: number;
  media_type: string;
  title: string;
  poster_path: string | null;
};

export function mapProfileStatistics(row: ProfileStatisticsRow): ProfileStatistics {
  const tvMinutes = row.tv_minutes;
  const movieMinutes = row.movie_minutes;

  return {
    trackedShows: row.tracked_shows,
    episodesWatched: row.episodes_watched,
    moviesInLibrary: row.movies_in_library,
    moviesWatched: row.movies_watched,
    favouriteShows: row.favourite_shows,
    favouriteMovies: row.favourite_movies,
    completedShows: row.completed_shows,
    caughtUpShows: row.caught_up_shows,
    tvMinutes,
    movieMinutes,
    totalMinutes: tvMinutes + movieMinutes,
  };
}

export function mapProfileFavourites(rows: readonly ProfileFavouriteRow[]): {
  favouriteShows: ProfileFavourite[];
  favouriteMovies: ProfileFavourite[];
} {
  const favourites = rows.flatMap((row) => {
    if (row.media_type !== "tv" && row.media_type !== "movie") return [];

    const favourite: ProfileFavourite = {
      membershipId: row.membership_id,
      mediaItemId: row.media_item_id,
      tmdbId: row.tmdb_id,
      mediaType: row.media_type,
      title: row.title,
      posterPath: row.poster_path,
    };
    return [favourite];
  });
  const compareTitle = (left: ProfileFavourite, right: ProfileFavourite) =>
    left.title.localeCompare(right.title, undefined, { sensitivity: "base" }) ||
    left.tmdbId - right.tmdbId;

  return {
    favouriteShows: favourites
      .filter((item) => item.mediaType === "tv")
      .sort(compareTitle),
    favouriteMovies: favourites
      .filter((item) => item.mediaType === "movie")
      .sort(compareTitle),
  };
}

export function formatDuration(minutes: number): { minutes: string; hours: string; daysAndHours: string } {
  const safe = Math.max(0, Math.floor(minutes));
  const totalHours = Math.floor(safe / 60);
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  return {
    minutes: `${safe.toLocaleString("en-US")} ${safe === 1 ? "minute" : "minutes"}`,
    hours: `${totalHours.toLocaleString("en-US")} ${totalHours === 1 ? "hour" : "hours"}`,
    daysAndHours: days ? `${days.toLocaleString("en-US")} ${days === 1 ? "day" : "days"} ${hours} ${hours === 1 ? "hour" : "hours"}` : `${hours} ${hours === 1 ? "hour" : "hours"}`,
  };
}
