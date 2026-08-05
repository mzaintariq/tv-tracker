import type { TmdbCreditsResponse, TmdbVideo, TmdbWatchProviderRegion } from "@/lib/tmdb/types";

export const TOP_CAST_LIMIT = 10;
export type CastProjection = { personId: number; name: string; character: string | null; profilePath: string | null; order: number };
export type DirectorProjection = { personId: number; name: string };
export type TrailerProjection = { key: string; site: "YouTube"; name: string; official: boolean; publishedAt: string | null };
export type ProviderCategory = "stream" | "free" | "ads" | "rent" | "buy";
export type ProviderProjection = { providerId: number; providerName: string; logoPath: string | null; displayPriority: number; category: ProviderCategory };
export type ProviderGroups = { region: string; attributionLink: string | null; groups: Record<ProviderCategory, ProviderProjection[]> };

function text(value: unknown, max = 200): string | null { return typeof value === "string" && value.trim() ? value.trim().slice(0, max) : null; }
function imagePath(value: unknown): string | null { const path = text(value, 300); return path && /^\/[A-Za-z0-9._/-]+$/.test(path) ? path : null; }
export function normalizeCast(response: TmdbCreditsResponse): CastProjection[] {
  const seen = new Set<number>(); const result: CastProjection[] = [];
  for (const [index, raw] of (Array.isArray(response.cast) ? response.cast : []).entries()) {
    const name = text(raw.name); if (!Number.isInteger(raw.id) || raw.id < 1 || !name || seen.has(raw.id)) continue;
    seen.add(raw.id); const character = text(raw.character) ?? text(raw.roles?.[0]?.character);
    result.push({ personId: raw.id, name, character, profilePath: imagePath(raw.profile_path), order: Number.isInteger(raw.order) && (raw.order ?? -1) >= 0 ? raw.order! : index });
    if (result.length === TOP_CAST_LIMIT) break;
  }
  return result;
}
export function normalizeDirectors(response: TmdbCreditsResponse): DirectorProjection[] {
  const directors = new Map<number, DirectorProjection>();
  for (const raw of Array.isArray(response.crew) ? response.crew : []) { const name = text(raw.name); if (raw.job === "Director" && Number.isInteger(raw.id) && raw.id > 0 && name) directors.set(raw.id, { personId: raw.id, name }); }
  return [...directors.values()].sort((a, b) => a.personId - b.personId).slice(0, 10);
}
function validPublished(value: unknown): string | null { if (typeof value !== "string" || Number.isNaN(Date.parse(value))) return null; return value; }
export function selectPreferredTrailer(videos: readonly TmdbVideo[], preferredLanguage?: string): TrailerProjection | null {
  const language = preferredLanguage?.toLowerCase();
  return videos.filter((v) => v.site === "YouTube" && /^[A-Za-z0-9_-]{6,20}$/.test(v.key) && text(v.name)).sort((a, b) =>
    Number(b.type === "Trailer") - Number(a.type === "Trailer") || Number(Boolean(b.official)) - Number(Boolean(a.official)) || Number(b.iso_639_1 === language) - Number(a.iso_639_1 === language) || (validPublished(b.published_at) ?? "").localeCompare(validPublished(a.published_at) ?? "") || a.id.localeCompare(b.id)
  ).map((v) => ({ key: v.key, site: "YouTube" as const, name: text(v.name)!, official: Boolean(v.official), publishedAt: validPublished(v.published_at) }))[0] ?? null;
}
export function normalizeProviders(region: string, value?: TmdbWatchProviderRegion): ProviderGroups {
  const selected = region.trim().toUpperCase(); const empty = (): ProviderProjection[] => []; const groups: Record<ProviderCategory, ProviderProjection[]> = { stream: empty(), free: empty(), ads: empty(), rent: empty(), buy: empty() };
  const sources: [ProviderCategory, unknown][] = [["stream", value?.flatrate], ["free", value?.free], ["ads", value?.ads], ["rent", value?.rent], ["buy", value?.buy]];
  for (const [category, rawList] of sources) { const seen = new Set<number>(); if (!Array.isArray(rawList)) continue; for (const raw of rawList) { if (!raw || typeof raw !== "object") continue; const id = Reflect.get(raw, "provider_id"), name = text(Reflect.get(raw, "provider_name")); if (!Number.isInteger(id) || id < 1 || !name || seen.has(id)) continue; seen.add(id); const priority = Reflect.get(raw, "display_priority"); groups[category].push({ providerId: id, providerName: name, logoPath: imagePath(Reflect.get(raw, "logo_path")), displayPriority: Number.isInteger(priority) && priority >= 0 ? priority : 9999, category }); } groups[category].sort((a,b) => a.displayPriority-b.displayPriority || a.providerId-b.providerId); }
  const link = text(value?.link, 1000); return { region: selected, attributionLink: link && isValidatedHttpsUrl(link) ? link : null, groups };
}
export function selectTvCertification(results: readonly { iso_3166_1: string; rating: string }[], region: string): string | null {
  const selected = region.trim().toUpperCase(); const values = new Set(results.filter((r) => r.iso_3166_1?.toUpperCase() === selected).map((r) => text(r.rating, 30)).filter((v): v is string => Boolean(v))); return values.size === 1 ? [...values][0] : null;
}
export function isValidatedHttpsUrl(value: string): boolean { try { const url = new URL(value); return url.protocol === "https:" && Boolean(url.hostname) && !url.username && !url.password; } catch { return false; } }
export function normalizeExternalLinks(mediaType: "tv" | "movie", tmdbId: number, imdbId?: string | null, homepage?: string | null) { return { tmdb: `https://www.themoviedb.org/${mediaType}/${tmdbId}`, imdb: imdbId && /^tt\d{7,10}$/.test(imdbId) ? `https://www.imdb.com/title/${imdbId}/` : null, homepage: homepage && isValidatedHttpsUrl(homepage) ? homepage : null }; }
