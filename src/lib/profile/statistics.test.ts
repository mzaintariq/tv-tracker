import { describe, expect, it } from "vitest";

import {
  formatDuration,
  mapProfileFavourites,
  mapProfileStatistics,
} from "@/lib/profile/statistics";

describe("profile statistics", () => {
  it("maps the scalar RPC row and calculates combined time", () => {
    expect(
      mapProfileStatistics({
        tracked_shows: 7,
        episodes_watched: 8,
        movies_in_library: 2,
        movies_watched: 1,
        favourite_shows: 2,
        favourite_movies: 2,
        completed_shows: 2,
        caught_up_shows: 1,
        tv_minutes: 185,
        movie_minutes: 120,
      }),
    ).toEqual({
      trackedShows: 7,
      episodesWatched: 8,
      moviesInLibrary: 2,
      moviesWatched: 1,
      favouriteShows: 2,
      favouriteMovies: 2,
      completedShows: 2,
      caughtUpShows: 1,
      tvMinutes: 185,
      movieMinutes: 120,
      totalMinutes: 305,
    });
  });

  it("maps only valid favourite projections and preserves title ordering", () => {
    expect(
      mapProfileFavourites([
        {
          membership_id: "show-z",
          media_item_id: "media-z",
          tmdb_id: 3,
          media_type: "tv",
          title: "zulu",
          poster_path: null,
        },
        {
          membership_id: "movie-a",
          media_item_id: "media-a",
          tmdb_id: 2,
          media_type: "movie",
          title: "Alpha",
          poster_path: "/alpha.jpg",
        },
        {
          membership_id: "show-a",
          media_item_id: "media-b",
          tmdb_id: 1,
          media_type: "tv",
          title: "alpha",
          poster_path: "/show.jpg",
        },
        {
          membership_id: "invalid",
          media_item_id: "invalid",
          tmdb_id: 4,
          media_type: "person",
          title: "Ignored",
          poster_path: null,
        },
      ]),
    ).toEqual({
      favouriteShows: [
        {
          membershipId: "show-a",
          mediaItemId: "media-b",
          tmdbId: 1,
          mediaType: "tv",
          title: "alpha",
          posterPath: "/show.jpg",
        },
        {
          membershipId: "show-z",
          mediaItemId: "media-z",
          tmdbId: 3,
          mediaType: "tv",
          title: "zulu",
          posterPath: null,
        },
      ],
      favouriteMovies: [
        {
          membershipId: "movie-a",
          mediaItemId: "media-a",
          tmdbId: 2,
          mediaType: "movie",
          title: "Alpha",
          posterPath: "/alpha.jpg",
        },
      ],
    });
  });

  it("formats minutes, hours, and days without artificial months", () => {
    expect(formatDuration(2460)).toEqual({
      minutes: "2,460 minutes",
      hours: "41 hours",
      daysAndHours: "1 day 17 hours",
    });
    expect(formatDuration(60 * 24 * 40).daysAndHours).toBe(
      "40 days 0 hours",
    );
  });
});
