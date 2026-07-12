import { describe, expect, it } from "vitest";

import {
  libraryKey,
  mapTmdbMovieDetailsToCacheRow,
  mapTmdbMovieListItem,
  mapTmdbTvDetailsToCacheRow,
  mapTmdbTvListItem,
  withLibraryFlags,
} from "@/lib/tmdb/mappers";

describe("mapTmdbTvListItem", () => {
  it("maps list fields into a domain explore item", () => {
    expect(
      mapTmdbTvListItem({
        id: 1396,
        name: "Breaking Bad",
        overview: "A chemistry teacher.",
        poster_path: "/poster.jpg",
        backdrop_path: "/back.jpg",
        first_air_date: "2008-01-20",
      }),
    ).toEqual({
      tmdbId: 1396,
      mediaType: "tv",
      title: "Breaking Bad",
      year: 2008,
      overview: "A chemistry teacher.",
      posterPath: "/poster.jpg",
      backdropPath: "/back.jpg",
      inLibrary: false,
    });
  });
});

describe("mapTmdbMovieListItem", () => {
  it("maps list fields into a domain explore item", () => {
    expect(
      mapTmdbMovieListItem({
        id: 550,
        title: "Fight Club",
        overview: "An insomniac.",
        poster_path: null,
        backdrop_path: null,
        release_date: "1999-10-15",
      }),
    ).toMatchObject({
      tmdbId: 550,
      mediaType: "movie",
      title: "Fight Club",
      year: 1999,
      posterPath: null,
    });
  });
});

describe("mapTmdbTvDetailsToCacheRow", () => {
  it("stores IMDb only from external_ids and averages episode runtimes", () => {
    const row = mapTmdbTvDetailsToCacheRow({
      id: 1396,
      name: "Breaking Bad",
      original_name: "Breaking Bad",
      overview: "A chemistry teacher.",
      poster_path: "/poster.jpg",
      backdrop_path: "/back.jpg",
      first_air_date: "2008-01-20",
      status: "Ended",
      episode_run_time: [47, 45],
      external_ids: { imdb_id: "tt0903747" },
    });

    expect(row.media_type).toBe("tv");
    expect(row.imdb_id).toBe("tt0903747");
    expect(row.runtime_minutes).toBeNull();
    expect(row.average_episode_runtime_minutes).toBe(46);
    expect(row.tmdb_status).toBe("Ended");
  });

  it("leaves imdb_id null when external_ids are absent", () => {
    const row = mapTmdbTvDetailsToCacheRow({
      id: 1,
      name: "Show",
      overview: "",
      poster_path: null,
      backdrop_path: null,
    });

    expect(row.imdb_id).toBeNull();
    expect(row.average_episode_runtime_minutes).toBeNull();
  });
});

describe("mapTmdbMovieDetailsToCacheRow", () => {
  it("maps movie runtime and imdb_id", () => {
    const row = mapTmdbMovieDetailsToCacheRow({
      id: 550,
      title: "Fight Club",
      original_title: "Fight Club",
      overview: "An insomniac.",
      poster_path: "/p.jpg",
      backdrop_path: null,
      release_date: "1999-10-15",
      status: "Released",
      runtime: 139,
      imdb_id: "tt0137523",
    });

    expect(row.media_type).toBe("movie");
    expect(row.runtime_minutes).toBe(139);
    expect(row.average_episode_runtime_minutes).toBeNull();
    expect(row.imdb_id).toBe("tt0137523");
  });
});

describe("withLibraryFlags", () => {
  it("marks items present in the library key set", () => {
    const items = [
      mapTmdbTvListItem({
        id: 1,
        name: "A",
        overview: "",
        poster_path: null,
        backdrop_path: null,
      }),
      mapTmdbMovieListItem({
        id: 2,
        title: "B",
        overview: "",
        poster_path: null,
        backdrop_path: null,
      }),
    ];

    const flagged = withLibraryFlags(
      items,
      new Set([libraryKey("tv", 1)]),
    );

    expect(flagged[0].inLibrary).toBe(true);
    expect(flagged[1].inLibrary).toBe(false);
  });
});
