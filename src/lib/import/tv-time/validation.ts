import { MAX_MATCH_CONTEXT_BYTES, MAX_TV_COORDINATES, type MatchContext } from "./types";

function exactKeys(value: Record<string, unknown>, keys: string[]): boolean {
  return Object.keys(value).sort().join("\0") === [...keys].sort().join("\0");
}

export function isMatchContext(value: unknown): value is MatchContext {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const object = value as Record<string, unknown>;
  if (new TextEncoder().encode(JSON.stringify(value)).length > MAX_MATCH_CONTEXT_BYTES || object.version !== 1) return false;
  if (object.kind === "movie") {
    return exactKeys(object, ["version", "kind", "releaseDate"]) &&
      (object.releaseDate === null || (typeof object.releaseDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(object.releaseDate)));
  }
  if (object.kind !== "tv" || !exactKeys(object, ["version", "kind", "coordinates"]) || !Array.isArray(object.coordinates) || object.coordinates.length > MAX_TV_COORDINATES) return false;
  const seen = new Set<string>();
  let previous = "";
  for (const coordinate of object.coordinates) {
    if (!coordinate || typeof coordinate !== "object" || Array.isArray(coordinate)) return false;
    const item = coordinate as Record<string, unknown>;
    if (!exactKeys(item, ["seasonNumber", "episodeNumber"]) || !Number.isInteger(item.seasonNumber) || !Number.isInteger(item.episodeNumber)) return false;
    const season = item.seasonNumber as number; const episode = item.episodeNumber as number;
    if (season < 0 || season > 10_000 || episode < 1 || episode > 100_000) return false;
    const key = `${String(season).padStart(5, "0")}:${String(episode).padStart(6, "0")}`;
    if (seen.has(key) || (previous && key < previous)) return false;
    seen.add(key); previous = key;
  }
  return true;
}

export function isCandidateTmdbIds(value: unknown): value is number[] {
  return Array.isArray(value) && value.length <= 20 && value.every((id) => Number.isInteger(id) && id > 0) && new Set(value).size === value.length;
}
