import type { Episode, MediaItem, UserShow } from "@/types/database";

export type UpcomingMembership = Pick<UserShow, "media_item_id" | "status">;
export type UpcomingMedia = Pick<MediaItem, "id" | "tmdb_id" | "title" | "poster_path" | "tmdb_status" | "episodes_synced_at">;
export type UpcomingEpisode = Pick<Episode, "id" | "media_item_id" | "season_number" | "episode_number" | "title" | "air_date" | "tmdb_episode_id">;

export type UpcomingSnapshot = {
  membership: UpcomingMembership;
  media: UpcomingMedia;
  episodes: UpcomingEpisode[];
};

export type UpcomingSingleItem = {
  kind: "episode";
  key: string;
  media: UpcomingMedia;
  episode: UpcomingEpisode;
};

export type UpcomingSeasonItem = {
  kind: "season";
  key: string;
  media: UpcomingMedia;
  seasonNumber: number;
  episodes: UpcomingEpisode[];
};

export type UpcomingItem = UpcomingSingleItem | UpcomingSeasonItem;
export type UpcomingDateGroup = { airDate: string; items: UpcomingItem[] };

function validTimeZone(timeZone: string): string {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone }).format(new Date(0));
    return timeZone;
  } catch {
    return "UTC";
  }
}

export function dateInTimeZone(now: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: validTimeZone(timeZone),
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((candidate) => candidate.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function addCalendarDays(date: string, days: number): string {
  const [year, month, day] = date.split("-").map(Number);
  const value = new Date(Date.UTC(year, month - 1, day + days));
  return value.toISOString().slice(0, 10);
}

export function upcomingDateLabel(airDate: string, today: string): string {
  if (airDate === addCalendarDays(today, -1)) return "Yesterday";
  if (airDate === today) return "Today";
  if (airDate === addCalendarDays(today, 1)) return "Tomorrow";
  const [year, month, day] = airDate.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: year === Number(today.slice(0, 4)) ? undefined : "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

const titleCompare = (left: UpcomingMedia, right: UpcomingMedia) =>
  left.title.localeCompare(right.title, undefined, { sensitivity: "base" }) ||
  left.tmdb_id - right.tmdb_id;

function itemCompare(left: UpcomingItem, right: UpcomingItem): number {
  const byTitle = titleCompare(left.media, right.media);
  if (byTitle !== 0) return byTitle;
  const leftSeason = left.kind === "episode" ? left.episode.season_number : left.seasonNumber;
  const rightSeason = right.kind === "episode" ? right.episode.season_number : right.seasonNumber;
  if (leftSeason !== rightSeason) return leftSeason - rightSeason;
  const leftEpisode = left.kind === "episode" ? left.episode.episode_number : left.episodes[0]?.episode_number ?? 0;
  const rightEpisode = right.kind === "episode" ? right.episode.episode_number : right.episodes[0]?.episode_number ?? 0;
  return leftEpisode - rightEpisode || left.key.localeCompare(right.key);
}

export function deriveUpcoming(
  snapshots: readonly UpcomingSnapshot[],
  today: string,
): UpcomingDateGroup[] {
  const earliestDate = addCalendarDays(today, -2);
  const releases = new Map<string, { airDate: string; media: UpcomingMedia; seasonNumber: number; episodes: UpcomingEpisode[] }>();

  for (const snapshot of snapshots) {
    if (snapshot.membership.status !== "active") continue;
    for (const episode of snapshot.episodes) {
      if (episode.season_number === 0 || episode.air_date === null || episode.air_date < earliestDate) continue;
      const key = `${episode.air_date}:${snapshot.media.id}:${episode.season_number}`;
      const release = releases.get(key) ?? {
        airDate: episode.air_date,
        media: snapshot.media,
        seasonNumber: episode.season_number,
        episodes: [],
      };
      release.episodes.push(episode);
      releases.set(key, release);
    }
  }

  const byDate = new Map<string, UpcomingItem[]>();
  for (const [key, release] of releases) {
    release.episodes.sort((left, right) =>
      left.episode_number - right.episode_number ||
      left.tmdb_episode_id - right.tmdb_episode_id ||
      left.id.localeCompare(right.id));
    const item: UpcomingItem = release.episodes.length > 1
      ? { kind: "season", key, media: release.media, seasonNumber: release.seasonNumber, episodes: release.episodes }
      : { kind: "episode", key, media: release.media, episode: release.episodes[0] };
    const items = byDate.get(release.airDate) ?? [];
    items.push(item);
    byDate.set(release.airDate, items);
  }
  if (!byDate.has(today)) byDate.set(today, []);

  return [...byDate.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([airDate, items]) => ({ airDate, items: items.sort(itemCompare) }));
}
