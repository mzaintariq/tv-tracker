import { describe, expect, it } from "vitest";
import {
  MovieReleaseType,
  normalizeTmdbMovieReleaseDates,
  selectRegionalDigitalDate,
  selectRegionalTheatricalDate,
  selectUnambiguousRegionalCertification,
  type RegionalReleaseSelection,
} from "@/lib/movies/release-dates";

describe("movie release-date normalization", () => {
  it("normalizes all types and regions, preserves language, and deduplicates", () => {
    const release_dates = [1, 2, 3, 4, 5, 6].map((type) => ({
      certification: type === 1 ? "PG" : "",
      iso_639_1: "EN",
      note: "",
      release_date: `2026-0${type}-01T00:00:00.000Z`,
      type,
    }));
    release_dates.push({ ...release_dates[0] });
    const rows = normalizeTmdbMovieReleaseDates({
      id: 1,
      results: [
        { iso_3166_1: " us ", release_dates },
        {
          iso_3166_1: "PK",
          release_dates: [{ ...release_dates[3], certification: "" }],
        },
      ],
    });
    expect(rows).toHaveLength(7);
    expect(rows.map((row) => row.release_type).slice(0, 6)).toEqual([
      1, 2, 3, 4, 5, 6,
    ]);
    expect(rows[0]).toMatchObject({
      region: "US",
      certification: "PG",
      note: null,
      language: "en",
    });
  });

  it("drops invalid dates, malformed types, regions, and languages", () => {
    expect(
      normalizeTmdbMovieReleaseDates({
        id: 1,
        results: [
          {
            iso_3166_1: "USA",
            release_dates: [{ certification: "", note: "", release_date: "2026-01-01", type: 3 }],
          },
          {
            iso_3166_1: "US",
            release_dates: [
              { certification: "", note: "", release_date: "2026-02-30", type: 3 },
              { certification: "", note: "", release_date: "2026-01-01", type: 7 },
              { certification: "", note: "", iso_639_1: "eng", release_date: "2026-01-01", type: 3 },
            ],
          },
        ],
      }),
    ).toEqual([]);
    expect(normalizeTmdbMovieReleaseDates({ id: 1, results: [] })).toEqual([]);
  });

  it("keeps the same date when release types differ", () => {
    const rows = normalizeTmdbMovieReleaseDates({
      id: 1,
      results: [{
        iso_3166_1: "US",
        release_dates: [2, 3].map((type) => ({ certification: "", note: "", release_date: "2026-01-01", type })),
      }],
    });
    expect(rows).toHaveLength(2);
  });
});

describe("regional movie release selection", () => {
  const row = (
    release_type: MovieReleaseType,
    release_date: string,
    region = "PK",
    certification: string | null = null,
  ): RegionalReleaseSelection => ({
    region, release_type, release_date, certification, note: null, language: null,
  });

  it("selects the earliest theatrical calendar date and preserves its type", () => {
    const selected = selectRegionalTheatricalDate([
      row(MovieReleaseType.Theatrical, "2026-05-02"),
      row(MovieReleaseType.LimitedTheatrical, "2026-05-01"),
      row(MovieReleaseType.LimitedTheatrical, "2026-05-01"),
    ], "pk");
    expect(selected).toMatchObject({ release_date: "2026-05-01", release_type: 2 });
  });

  it("selects only regional digital and never falls back", () => {
    const rows = [
      row(MovieReleaseType.Physical, "2020-01-01"),
      row(MovieReleaseType.Television, "2020-01-02"),
      row(MovieReleaseType.Digital, "2027-01-02"),
      row(MovieReleaseType.Digital, "2027-01-01"),
      row(MovieReleaseType.Digital, "2019-01-01", "US"),
    ];
    expect(selectRegionalDigitalDate(rows, "PK")?.release_date).toBe("2027-01-01");
    expect(selectRegionalDigitalDate(rows, "CH")).toBeNull();
  });

  it("handles historical, today, future, invalid, and missing dates lexically", () => {
    const rows = [
      row(MovieReleaseType.Theatrical, "2026-08-04"),
      row(MovieReleaseType.Theatrical, "1999-12-31"),
      row(MovieReleaseType.Theatrical, "2027-01-01"),
      row(MovieReleaseType.Theatrical, "not-a-date"),
    ];
    expect(selectRegionalTheatricalDate(rows, "PK")?.release_date).toBe("1999-12-31");
    expect(selectRegionalTheatricalDate([], "PK")).toBeNull();
  });

  it("returns certification only when the selected region is unambiguous", () => {
    expect(selectUnambiguousRegionalCertification([
      row(MovieReleaseType.Theatrical, "2026-01-01", "PK", "U"),
      row(MovieReleaseType.Digital, "2026-02-01", "US", "R"),
    ], "PK")).toBe("U");
    expect(selectUnambiguousRegionalCertification([
      row(MovieReleaseType.Theatrical, "2026-01-01", "PK", "U"),
      row(MovieReleaseType.Digital, "2026-02-01", "PK", "PG"),
    ], "PK")).toBeNull();
  });
});
