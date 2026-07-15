import type { MovieSnapshot } from "@/lib/movies/movies";
import type { DerivedShow } from "@/lib/shows/watch-list";
import type { Episode, MediaItem, WatchedEpisode } from "@/types/database";

export type HistoricalEpisode = { watched: WatchedEpisode; episode: Episode; media: MediaItem };
export type ProfileStatistics = {
  trackedShows: number; episodesWatched: number; moviesInLibrary: number; moviesWatched: number;
  favouriteShows: number; favouriteMovies: number; completedShows: number; caughtUpShows: number;
  tvMinutes: number; movieMinutes: number; totalMinutes: number;
};

export function deriveProfileStatistics(shows: readonly DerivedShow[], movies: readonly MovieSnapshot[], history: readonly HistoricalEpisode[]): ProfileStatistics {
  const tvMinutes = history.reduce((total, item) => total + (item.episode.runtime_minutes ?? item.media.average_episode_runtime_minutes ?? 0), 0);
  const watchedMovies = movies.filter((movie) => movie.membership.watched_at !== null);
  const movieMinutes = watchedMovies.reduce((total, movie) => total + (movie.media.runtime_minutes ?? 0), 0);
  return {
    trackedShows: shows.length,
    episodesWatched: history.length,
    moviesInLibrary: movies.length,
    moviesWatched: watchedMovies.length,
    favouriteShows: shows.filter((show) => show.membership.is_favourite).length,
    favouriteMovies: movies.filter((movie) => movie.membership.is_favourite).length,
    completedShows: shows.filter((show) => show.primaryState === "completed").length,
    caughtUpShows: shows.filter((show) => show.primaryState === "caught_up").length,
    tvMinutes, movieMinutes, totalMinutes: tvMinutes + movieMinutes,
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
