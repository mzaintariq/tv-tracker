import { addCalendarDays, parseDateOnly } from "@/lib/date-time";
import { MovieReleaseType } from "@/lib/movies/release-dates";

export const MOVIE_RELEASE_METADATA_STALE_HOURS = 24;

export type MovieUpcomingRow = {
  membership_id: string; media_item_id: string; tmdb_id: number; title: string;
  poster_path: string | null; watched_at: string | null; is_favourite: boolean;
  theatrical_date: string | null; theatrical_type: number | null;
  digital_date: string | null; release_dates_synced_at: string | null;
};

export type MovieReleaseProximity = {
  visiblePrimary: string;
  visibleSecondary: string | null;
  accessibleLabel: string;
  primaryDate: string | null;
};

export function calendarDayDifference(today: string, date: string): number | null {
  if (!parseDateOnly(today) || !parseDateOnly(date)) return null;
  if (date === today) return 0;
  let low = -36600, high = 36600;
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const value = addCalendarDays(today, mid);
    if (value === date) return mid;
    if (value < date) low = mid + 1; else high = mid - 1;
  }
  return null;
}

export function theatricalStatus(date: string | null, type: number | null, today: string): string {
  if (!date) return "Theatrical date not announced";
  const days = calendarDayDifference(today, date);
  const limited = type === MovieReleaseType.LimitedTheatrical;
  if (days === null) return "Theatrical date not announced";
  if (days < 0) return limited ? "Limited theatrical release has begun" : "Released in theatres";
  if (days === 0) return limited ? "Limited theatrical release today" : "In theatres today";
  if (days === 1) return limited ? "Limited theatrical release tomorrow" : "In theatres tomorrow";
  return limited ? `Limited theatrical release in ${days} days` : `In theatres in ${days} days`;
}

export function digitalStatus(date: string | null, today: string): string {
  if (!date) return "Digital date not announced";
  const days = calendarDayDifference(today, date);
  if (days === null) return "Digital date not announced";
  if (days < 0) return "Released digitally";
  if (days === 0) return "Digital release today";
  if (days === 1) return "Digital release tomorrow";
  return `Digital release in ${days} days`;
}

export function movieReleaseProximity(
  movie: Pick<MovieUpcomingRow, "theatrical_date" | "digital_date">,
  today: string,
  section: "out-now" | "coming-soon" | "tba",
): MovieReleaseProximity {
  if (section === "tba") {
    return {
      visiblePrimary: "TBA",
      visibleSecondary: null,
      accessibleLabel: "Release date to be announced",
      primaryDate: null,
    };
  }
  const dates = [movie.theatrical_date, movie.digital_date].filter(
    (date): date is string => date !== null && parseDateOnly(date) !== null,
  );
  const primaryDate =
    section === "coming-soon"
      ? dates.filter((date) => date >= today).sort()[0] ?? null
      : dates.filter((date) => date <= today).sort().at(-1) ?? null;
  if (!primaryDate) {
    return {
      visiblePrimary: "TBA",
      visibleSecondary: null,
      accessibleLabel: "Release date to be announced",
      primaryDate: null,
    };
  }
  const difference = calendarDayDifference(today, primaryDate);
  if (difference === null) {
    return {
      visiblePrimary: "TBA",
      visibleSecondary: null,
      accessibleLabel: "Release date to be announced",
      primaryDate: null,
    };
  }
  if (difference === 0) {
    return {
      visiblePrimary: "TODAY",
      visibleSecondary: null,
      accessibleLabel:
        section === "coming-soon"
          ? "The next release is today"
          : "The latest release is today",
      primaryDate,
    };
  }
  const days = Math.abs(difference);
  return section === "coming-soon"
    ? {
        visiblePrimary: String(days),
        visibleSecondary: days === 1 ? "DAY" : "DAYS",
        accessibleLabel: `${days} ${days === 1 ? "day" : "days"} until the next release`,
        primaryDate,
      }
    : {
        visiblePrimary: String(days),
        visibleSecondary: days === 1 ? "DAY AGO" : "DAYS AGO",
        accessibleLabel: `${days} ${days === 1 ? "day" : "days"} since the latest release`,
        primaryDate,
      };
}

export function isMovieReleaseMetadataStale(value: string | null, now: Date): boolean {
  const timestamp = value ? Date.parse(value) : Number.NaN;
  return !Number.isFinite(timestamp) || timestamp <= now.getTime() - MOVIE_RELEASE_METADATA_STALE_HOURS * 3600000;
}

export function partitionUpcomingMovies(rows: readonly MovieUpcomingRow[], today: string) {
  const oldestOutNow = addCalendarDays(today, -30);
  const titleCompare = (left: MovieUpcomingRow, right: MovieUpcomingRow) =>
    left.title.localeCompare(right.title, undefined, { sensitivity: "base" }) ||
    left.tmdb_id - right.tmdb_id || left.membership_id.localeCompare(right.membership_id);
  const futureDate = (row: MovieUpcomingRow) =>
    [row.theatrical_date, row.digital_date].filter((date): date is string => date !== null && date > today).sort()[0] ?? null;
  const recentDate = (row: MovieUpcomingRow) =>
    [row.theatrical_date, row.digital_date].filter((date): date is string => date !== null && date >= oldestOutNow && date <= today).sort().at(-1) ?? null;
  const comingSoon = rows.filter((row) => futureDate(row) !== null).sort((left, right) =>
    (futureDate(left) ?? "").localeCompare(futureDate(right) ?? "") || titleCompare(left, right));
  const comingIds = new Set(comingSoon.map((row) => row.membership_id));
  const outNow = rows.filter((row) => !comingIds.has(row.membership_id) && recentDate(row) !== null).sort((left, right) =>
    (recentDate(right) ?? "").localeCompare(recentDate(left) ?? "") || titleCompare(left, right));
  return {
    outNow,
    comingSoon,
    datesNotAnnounced: rows.filter((row) => row.watched_at === null && !row.theatrical_date && !row.digital_date).sort(titleCompare),
  };
}
