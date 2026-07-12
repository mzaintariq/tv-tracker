import { describe, expect, it } from "vitest";

import {
  isExploreMediaFilter,
  isMediaType,
  mergeExploreResults,
  normalizeSearchQuery,
  parseTmdbId,
  posterUrl,
  titleInitials,
  yearFromDate,
  type ExploreMediaItem,
} from "@/lib/media/types";

describe("isMediaType", () => {
  it("accepts tv and movie only", () => {
    expect(isMediaType("tv")).toBe(true);
    expect(isMediaType("movie")).toBe(true);
    expect(isMediaType("all")).toBe(false);
    expect(isMediaType("TV")).toBe(false);
  });
});

describe("isExploreMediaFilter", () => {
  it("accepts all, tv, and movie", () => {
    expect(isExploreMediaFilter("all")).toBe(true);
    expect(isExploreMediaFilter("tv")).toBe(true);
    expect(isExploreMediaFilter("movie")).toBe(true);
    expect(isExploreMediaFilter("person")).toBe(false);
  });
});

describe("parseTmdbId", () => {
  it("accepts positive integers", () => {
    expect(parseTmdbId(42)).toBe(42);
    expect(parseTmdbId("99")).toBe(99);
  });

  it("rejects zero, negatives, and non-integers", () => {
    expect(parseTmdbId(0)).toBeNull();
    expect(parseTmdbId(-1)).toBeNull();
    expect(parseTmdbId(1.5)).toBeNull();
    expect(parseTmdbId("abc")).toBeNull();
    expect(parseTmdbId(undefined)).toBeNull();
  });
});

describe("normalizeSearchQuery", () => {
  it("returns null for empty or whitespace input", () => {
    expect(normalizeSearchQuery("")).toBeNull();
    expect(normalizeSearchQuery("   ")).toBeNull();
  });

  it("trims and truncates to 100 characters", () => {
    expect(normalizeSearchQuery("  breaking bad  ")).toBe("breaking bad");
    expect(normalizeSearchQuery("a".repeat(120))).toBe("a".repeat(100));
  });
});

describe("posterUrl", () => {
  it("builds a TMDB image URL", () => {
    expect(posterUrl("/abc.jpg")).toBe(
      "https://image.tmdb.org/t/p/w342/abc.jpg",
    );
  });

  it("returns null when path is missing", () => {
    expect(posterUrl(null)).toBeNull();
  });
});

describe("yearFromDate", () => {
  it("parses a year from an ISO date", () => {
    expect(yearFromDate("2008-01-20")).toBe(2008);
    expect(yearFromDate("")).toBeNull();
    expect(yearFromDate(undefined)).toBeNull();
  });
});

describe("mergeExploreResults", () => {
  it("interleaves tv and movie results", () => {
    const tv: ExploreMediaItem[] = [
      {
        tmdbId: 1,
        mediaType: "tv",
        title: "A",
        year: 2020,
        overview: "",
        posterPath: null,
        backdropPath: null,
        inLibrary: false,
      },
    ];
    const movies: ExploreMediaItem[] = [
      {
        tmdbId: 2,
        mediaType: "movie",
        title: "B",
        year: 2021,
        overview: "",
        posterPath: null,
        backdropPath: null,
        inLibrary: false,
      },
      {
        tmdbId: 3,
        mediaType: "movie",
        title: "C",
        year: 2022,
        overview: "",
        posterPath: null,
        backdropPath: null,
        inLibrary: false,
      },
    ];

    expect(mergeExploreResults(tv, movies).map((item) => item.title)).toEqual([
      "A",
      "B",
      "C",
    ]);
  });
});

describe("titleInitials", () => {
  it("builds initials from a title", () => {
    expect(titleInitials("Breaking Bad")).toBe("BB");
    expect(titleInitials("Severance")).toBe("SE");
    expect(titleInitials("")).toBe("?");
  });
});
