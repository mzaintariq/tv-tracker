import { parseCsv, type CsvRow } from "./csv";
import { sha256Hex } from "./fingerprint";
import { ALLOWED_TV_TIME_FILES, type AllowedTvTimeFile } from "./schemas";
import { parseTvTimeTimestamp } from "./timestamps";
import { TV_TIME_SOURCE_KEY_VERSION, type MatchContext, type NormalizedEpisodeEvent, type NormalizedMovie, type NormalizedTvShow, type NormalizedTvTimeImport } from "./types";

function rows(files: Partial<Record<AllowedTvTimeFile, string>>, name: AllowedTvTimeFile): CsvRow[] {
  const value = files[name];
  return value === undefined ? [] : parseCsv(value, ALLOWED_TV_TIME_FILES[name]);
}

export function normalizeNumericSourceId(value: string): string {
  const trimmed = value.trim();
  const match = /^(\d+)(?:\.(\d+))?(?:e\+?(\d+))?$/i.exec(trimmed);
  if (!match) return trimmed;
  const integer = match[1];
  const fraction = match[2] ?? "";
  const exponent = Number.parseInt(match[3] ?? "0", 10);
  if (!Number.isSafeInteger(exponent) || exponent > 10_000) return trimmed;
  const digits = `${integer}${fraction}`;
  const decimalPosition = integer.length + exponent;
  if (decimalPosition < digits.length && /[1-9]/.test(digits.slice(decimalPosition))) return trimmed;
  const expanded = decimalPosition >= digits.length ? `${digits}${"0".repeat(decimalPosition - digits.length)}` : digits.slice(0, decimalPosition);
  return BigInt(expanded || "0").toString();
}

export function normalizeTitle(value: string): string {
  return value.normalize("NFKC").trim().toLocaleLowerCase("en-US").replace(/[’']/g, "'").replace(/[^\p{L}\p{N}']+/gu, " ").replace(/\s+/g, " ").trim();
}

function isTvTimeTrue(value: string): boolean {
  return value === "1" || value.toLocaleLowerCase("en-US") === "true";
}

export function sourceKey(mediaType: "tv" | "movie", identity: string): string {
  return `v${TV_TIME_SOURCE_KEY_VERSION}:${mediaType}:${identity}`;
}

export function itemDigest(value: unknown): string {
  return sha256Hex(canonicalJson(value));
}

export function canonicalJson(value: unknown): string {
  if (value === null || typeof value === "boolean" || typeof value === "string") return JSON.stringify(value);
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new TypeError("Canonical JSON does not support non-finite numbers.");
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`).join(",")}}`;
  }
  throw new TypeError("Canonical JSON does not support this value.");
}

export function matchContext(item: NormalizedTvShow | NormalizedMovie): MatchContext {
  if ("episodeEvents" in item) return { version: 1, kind: "tv", coordinates: item.episodeEvents.map(({ seasonNumber, episodeNumber }) => ({ seasonNumber, episodeNumber })) };
  return { version: 1, kind: "movie", releaseDate: item.releaseDate || null };
}

export function normalizeTvTimeExport(files: Partial<Record<AllowedTvTimeFile, string>>): NormalizedTvTimeImport {
  const v1 = rows(files, "tracking-prod-records.csv");
  const v2 = rows(files, "tracking-prod-records-v2.csv");
  const showData = rows(files, "user_tv_show_data.csv");
  const followed = rows(files, "followed_tv_show.csv");
  const special = rows(files, "user_show_special_status.csv");
  const lists = rows(files, "lists-prod-lists.csv");
  const titles = new Map(showData.map((row) => [normalizeNumericSourceId(row.tv_show_id), row.tv_show_name.trim()]));
  const v2ShowStates = new Map(v2
    .filter((row) => row.s_id && row.key.startsWith("user-series-"))
    .map((row) => [normalizeNumericSourceId(row.s_id), { followed: isTvTimeTrue(row.is_followed), archived: isTvTimeTrue(row.is_archived) }]));
  const active = new Set([
    ...followed.filter((row) => isTvTimeTrue(row.active) && !isTvTimeTrue(row.archived)).map((row) => normalizeNumericSourceId(row.tv_show_id)),
    ...showData.filter((row) => {
      if (!isTvTimeTrue(row.is_followed)) return false;
      const v2State = v2ShowStates.get(normalizeNumericSourceId(row.tv_show_id));
      return !v2State || (v2State.followed && !v2State.archived);
    }).map((row) => normalizeNumericSourceId(row.tv_show_id)),
    ...[...v2ShowStates].filter(([, state]) => state.followed && !state.archived).map(([showId]) => showId),
  ]);
  const favourites = new Set([
    ...showData.filter((row) => row.is_favorited === "1").map((row) => normalizeNumericSourceId(row.tv_show_id)),
    ...special.filter((row) => row.status === "favorite").map((row) => normalizeNumericSourceId(row.tv_show_id)),
  ]);
  const eventsByShow = new Map<string, NormalizedEpisodeEvent[]>();
  for (const row of v2) {
    if (!row.key.startsWith("watch-episode-") && !row.key.startsWith("rewatch-episode-")) continue;
    const showId = normalizeNumericSourceId(row.s_id); const seasonNumber = Number(row.s_no); const episodeNumber = Number(row.ep_no);
    if (!Number.isInteger(seasonNumber) || !Number.isInteger(episodeNumber) || seasonNumber < 0 || episodeNumber < 1) continue;
    const event: NormalizedEpisodeEvent = { sourceEventKey: row.key, tvTimeEpisodeId: normalizeNumericSourceId(row.ep_id), seasonNumber, episodeNumber, watchedAt: parseTvTimeTimestamp("", row.created_at), sourceEventCount: 1 };
    eventsByShow.set(showId, [...(eventsByShow.get(showId) ?? []), event]);
    if (row.series_name.trim()) titles.set(showId, row.series_name.trim());
  }
  for (const row of v1) {
    if (row.type !== "watch" || row.entity_type !== "episode") continue;
    const showId = normalizeNumericSourceId(row.series_id); const seasonNumber = Number(row.season_number); const episodeNumber = Number(row.episode_number);
    if (!showId || !Number.isInteger(seasonNumber) || !Number.isInteger(episodeNumber) || seasonNumber < 0 || episodeNumber < 1) continue;
    const event: NormalizedEpisodeEvent = { sourceEventKey: `legacy:${row.uuid}`, tvTimeEpisodeId: normalizeNumericSourceId(row.episode_id), seasonNumber, episodeNumber, watchedAt: parseTvTimeTimestamp(row.watch_date, row.created_at), sourceEventCount: 1 };
    eventsByShow.set(showId, [...(eventsByShow.get(showId) ?? []), event]);
    if (row.series_name.trim()) titles.set(showId, row.series_name.trim());
  }
  const showIds = new Set([...eventsByShow.keys(), ...active]);
  const shows: NormalizedTvShow[] = [...showIds].map((showId) => {
    const sourceEvents = eventsByShow.get(showId) ?? [];
    const byCoordinate = new Map<string, NormalizedEpisodeEvent[]>();
    for (const event of sourceEvents) { const key = `${event.seasonNumber}:${event.episodeNumber}`; byCoordinate.set(key, [...(byCoordinate.get(key) ?? []), event]); }
    const episodeEvents = [...byCoordinate.values()].map((group) => {
      const distinct = [...new Map(group.map((event) => [`${event.tvTimeEpisodeId}:${event.watchedAt.instant}`, event])).values()];
      const latest = [...distinct].sort((a, b) => b.watchedAt.instant.localeCompare(a.watchedAt.instant))[0];
      return { ...latest, sourceEventCount: distinct.length };
    }).sort((a, b) => a.seasonNumber - b.seasonNumber || a.episodeNumber - b.episodeNumber);
    return { sourceKey: sourceKey("tv", showId), tvTimeShowId: showId, title: titles.get(showId)?.trim() || "Unknown TV Time show", currentlyActive: active.has(showId), isFavourite: favourites.has(showId), importMode: active.has(showId) ? "active_membership" as const : "history_only" as const, episodeEvents, sourceRecordCount: sourceEvents.length };
  }).sort((a, b) => a.sourceKey.localeCompare(b.sourceKey));

  const movieGroups = new Map<string, CsvRow[]>();
  for (const row of v1) {
    if (row.entity_type !== "movie" || !["watch", "follow", "towatch"].includes(row.type) || !row.movie_name.trim() || !row.release_date) continue;
    const releaseDate = row.release_date.slice(0, 10); const key = sourceKey("movie", `${normalizeTitle(row.movie_name)}:${releaseDate}`);
    movieGroups.set(key, [...(movieGroups.get(key) ?? []), row]);
  }
  const movies: NormalizedMovie[] = [...movieGroups].map(([key, group]) => {
    const watched = group.filter((row) => row.type === "watch").sort((a, b) => b.created_at.localeCompare(a.created_at));
    return { sourceKey: key, title: group[0].movie_name.trim(), releaseDate: group[0].release_date.slice(0, 10), state: watched.length ? "watched" as const : "watch_next" as const, watchedAt: watched[0] ? parseTvTimeTimestamp(watched[0].watch_date, watched[0].created_at) : null, sourceEventCount: watched.length, sourceRecordCount: group.length };
  }).sort((a, b) => a.sourceKey.localeCompare(b.sourceKey));
  const possibleMovieFavourites = lists.find((row) => row.name.toLocaleLowerCase("en-US").includes("fav"));
  const possibleMovieFavouriteCount = possibleMovieFavourites?.objects.match(/map\[/g)?.length ?? 0;
  const favouriteUuids = new Set((possibleMovieFavourites?.objects.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi) ?? []).map((value) => value.toLocaleLowerCase("en-US")));
  const possibleMovieFavouriteKeys = [...movieGroups].filter(([, group]) => group.some((row) => favouriteUuids.has(row.uuid.toLocaleLowerCase("en-US")))).map(([key]) => key);
  const cachedMovieCount = Number(v2.find((row) => row.movie_watch_count)?.movie_watch_count || NaN);
  return {
    shows, movies, possibleMovieFavouriteKeys,
    summary: {
      sourceFiles: Object.fromEntries(Object.entries(files).map(([name, content]) => [name, content ? content.split("\n").length - 1 : 0])),
      shows: shows.length, activeShows: shows.filter((show) => show.currentlyActive).length, historyOnlyShows: shows.filter((show) => !show.currentlyActive).length,
      episodeEvents: shows.reduce((sum, show) => sum + show.sourceRecordCount, 0), collapsedEpisodeEvents: shows.reduce((sum, show) => sum + show.sourceRecordCount - show.episodeEvents.length, 0),
      movies: movies.length, watchedMovies: movies.filter((movie) => movie.state === "watched").length, watchNextMovies: movies.filter((movie) => movie.state === "watch_next").length,
      possibleMovieFavourites: possibleMovieFavouriteCount, detailedMovieCount: movies.filter((movie) => movie.state === "watched").length, cachedMovieCount: Number.isFinite(cachedMovieCount) ? cachedMovieCount : null,
    },
  };
}
