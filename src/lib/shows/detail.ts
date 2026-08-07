import { languageDisplayName, parseNamedFacts } from "@/lib/movies/detail";
import type { MediaItem } from "@/types/database";

export { languageDisplayName, parseNamedFacts };

export function showStatusSummary(media: MediaItem): string | null {
  const status = media.tmdb_status?.trim() || null;
  if (status) return status;
  if (media.last_air_date) return `Last aired on ${formatDate(media.last_air_date)}`;
  return null;
}

export function formatDate(value: string | null): string | null {
  if (!value) return null;
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "long",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

export function parseCountries(value: MediaItem["origin_countries"]): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (country): country is string =>
      typeof country === "string" && /^[A-Z]{2}$/.test(country),
  );
}
