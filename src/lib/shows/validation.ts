import { parseTmdbId } from "@/lib/media/types";
import type { ShowTrackingStatus } from "@/types/database";
import { dateTimeLocalToTimestamp } from "@/lib/date-time";

export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function parseUuid(value: unknown): string | null { return typeof value === "string" && UUID_PATTERN.test(value) ? value : null; }
export function parseNonNegativeInteger(value: unknown): number | null {
  const result = typeof value === "number" ? value : typeof value === "string" && value.trim() ? Number(value) : Number.NaN;
  return Number.isInteger(result) && result >= 0 ? result : null;
}
export function parsePositiveInteger(value: unknown): number | null { const parsed = parseNonNegativeInteger(value); return parsed !== null && parsed > 0 ? parsed : null; }
export function parseManualWatchedAt(value: unknown, now = new Date(), timeZone?: string): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const timestamp = timeZone && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)
    ? dateTimeLocalToTimestamp(value, timeZone)
    : value;
  if (!timestamp) return null;
  const date = new Date(timestamp); return Number.isNaN(date.getTime()) || date > now ? null : date.toISOString();
}
export function isShowStatus(value: unknown): value is ShowTrackingStatus { return value === "active" || value === "paused" || value === "dropped"; }

export const MAX_INITIAL_SEASONS = 100;
export type ValidInitialProgress =
  | { mode: "start" }
  | { mode: "before_episode"; seasonNumber: number; episodeNumber: number }
  | { mode: "seasons"; seasonNumbers: number[] };

function hasOwn(value: object, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(value, key);
}

export function parseInitialProgress(value: unknown): ValidInitialProgress | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;

  if (input.mode === "start") {
    return hasOwn(input, "seasonNumber") || hasOwn(input, "episodeNumber") || hasOwn(input, "seasonNumbers")
      ? null
      : { mode: "start" };
  }

  if (input.mode === "before_episode") {
    if (hasOwn(input, "seasonNumbers")) return null;
    const seasonNumber = parsePositiveInteger(input.seasonNumber);
    const episodeNumber = parsePositiveInteger(input.episodeNumber);
    return seasonNumber !== null && episodeNumber !== null
      ? { mode: "before_episode", seasonNumber, episodeNumber }
      : null;
  }

  if (input.mode === "seasons") {
    if (hasOwn(input, "seasonNumber") || hasOwn(input, "episodeNumber") || !Array.isArray(input.seasonNumbers)) return null;
    if (input.seasonNumbers.length === 0 || input.seasonNumbers.length > MAX_INITIAL_SEASONS) return null;
    const seasonNumbers = input.seasonNumbers.map(parsePositiveInteger);
    if (seasonNumbers.some((season) => season === null)) return null;
    const validSeasons = seasonNumbers.filter((season): season is number => season !== null);
    return new Set(validSeasons).size === validSeasons.length
      ? { mode: "seasons", seasonNumbers: validSeasons }
      : null;
  }

  return null;
}
export { parseTmdbId };
