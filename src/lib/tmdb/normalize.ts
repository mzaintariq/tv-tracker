import type { TmdbNamedEntity } from "@/lib/tmdb/types";

// Display-only lists are deliberately bounded before persistence.
export const STABLE_LIMITS = { genres: 20, networks: 20, creators: 10, companies: 20, countries: 10 } as const;

export function normalizeNamedEntities(value: unknown, limit: number): TmdbNamedEntity[] {
  if (!Array.isArray(value)) return [];
  const unique = new Map<number, TmdbNamedEntity>();
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const id = Reflect.get(item, "id");
    const rawName = Reflect.get(item, "name");
    const name = typeof rawName === "string" ? rawName.trim() : "";
    if (Number.isInteger(id) && id > 0 && name && !unique.has(id)) unique.set(id, { id, name: name.slice(0, 200) });
  }
  return [...unique.values()].sort((a, b) => a.id - b.id).slice(0, limit);
}

export function normalizeVote(value: unknown, maximum: number): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= maximum ? value : null;
}
export function normalizeCount(value: unknown): number | null {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : null;
}
export function normalizeLanguage(value: unknown): string | null {
  const language = typeof value === "string" ? value.trim().toLowerCase() : "";
  return /^[a-z]{2,3}$/.test(language) ? language : null;
}
export function normalizeDate(value: unknown): string | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value.slice(0, 10))) return null;
  const date = value.slice(0, 10); return Number.isNaN(Date.parse(`${date}T00:00:00Z`)) ? null : date;
}
export function normalizeCountries(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((item): item is string => typeof item === "string").map((item) => item.trim().toUpperCase()).filter((item) => /^[A-Z]{2}$/.test(item)))].sort().slice(0, STABLE_LIMITS.countries);
}
