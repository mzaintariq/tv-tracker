import { parseDateOnly } from "@/lib/date-time";
import type { TmdbMovieReleaseDatesResponse } from "@/lib/tmdb/types";
import type { MovieReleaseDate } from "@/types/database";

export enum MovieReleaseType {
  Premiere = 1,
  LimitedTheatrical = 2,
  Theatrical = 3,
  Digital = 4,
  Physical = 5,
  Television = 6,
}

export type NormalizedMovieReleaseDate = {
  region: string;
  release_type: MovieReleaseType;
  release_date: string;
  certification: string | null;
  note: string | null;
  language: string | null;
};

export type RegionalReleaseSelection = Pick<
  MovieReleaseDate,
  "region" | "release_type" | "release_date" | "certification" | "note" | "language"
>;

function releaseType(value: number): MovieReleaseType | null {
  return Number.isInteger(value) && value >= 1 && value <= 6
    ? (value as MovieReleaseType)
    : null;
}

function optionalText(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function identity(row: NormalizedMovieReleaseDate): string {
  return [
    row.region,
    row.release_type,
    row.release_date,
    row.certification ?? "",
    row.note ?? "",
    row.language ?? "",
  ].join("\u0000");
}

export function normalizeTmdbMovieReleaseDates(
  response: TmdbMovieReleaseDatesResponse,
): NormalizedMovieReleaseDate[] {
  const rows = new Map<string, NormalizedMovieReleaseDate>();
  for (const result of Array.isArray(response.results) ? response.results : []) {
    const region = result.iso_3166_1?.trim().toUpperCase();
    if (!/^[A-Z]{2}$/.test(region)) continue;
    for (const raw of Array.isArray(result.release_dates)
      ? result.release_dates
      : []) {
      const type = releaseType(raw.type);
      const date = raw.release_date?.slice(0, 10);
      if (!type || !parseDateOnly(date)) continue;
      const language = optionalText(raw.iso_639_1)?.toLowerCase() ?? null;
      if (language !== null && !/^[a-z]{2}$/.test(language)) continue;
      const row: NormalizedMovieReleaseDate = {
        region,
        release_type: type,
        release_date: date,
        certification: optionalText(raw.certification),
        note: optionalText(raw.note),
        language,
      };
      rows.set(identity(row), row);
    }
  }
  return [...rows.values()];
}

function deduplicatedForRegion(
  releases: readonly RegionalReleaseSelection[],
  region: string,
): RegionalReleaseSelection[] {
  const selectedRegion = region.trim().toUpperCase();
  const rows = new Map<string, RegionalReleaseSelection>();
  for (const row of releases) {
    if (row.region !== selectedRegion || !parseDateOnly(row.release_date)) continue;
    const key = [row.region, row.release_type, row.release_date, row.certification ?? "", row.note ?? "", row.language ?? ""].join("\u0000");
    rows.set(key, row);
  }
  return [...rows.values()];
}

export function selectRegionalTheatricalDate(
  releases: readonly RegionalReleaseSelection[],
  region: string,
): RegionalReleaseSelection | null {
  return (
    deduplicatedForRegion(releases, region)
      .filter((row) =>
        row.release_type === MovieReleaseType.LimitedTheatrical ||
        row.release_type === MovieReleaseType.Theatrical,
      )
      .sort((left, right) =>
        left.release_date.localeCompare(right.release_date) ||
        left.release_type - right.release_type,
      )[0] ?? null
  );
}

export function selectRegionalDigitalDate(
  releases: readonly RegionalReleaseSelection[],
  region: string,
): RegionalReleaseSelection | null {
  return (
    deduplicatedForRegion(releases, region)
      .filter((row) => row.release_type === MovieReleaseType.Digital)
      .sort((left, right) => left.release_date.localeCompare(right.release_date))[0] ?? null
  );
}

export function selectUnambiguousRegionalCertification(
  releases: readonly RegionalReleaseSelection[],
  region: string,
): string | null {
  const values = new Set(
    deduplicatedForRegion(releases, region)
      .map((row) => row.certification?.trim())
      .filter((value): value is string => Boolean(value)),
  );
  return values.size === 1 ? [...values][0] : null;
}

export function selectRegionalMovieCertification(
  releases: readonly RegionalReleaseSelection[],
  region: string,
): string | null {
  const theatrical = selectRegionalTheatricalDate(releases, region);
  if (theatrical?.certification?.trim()) return theatrical.certification.trim();
  return selectUnambiguousRegionalCertification(releases, region);
}
