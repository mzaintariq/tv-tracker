import { calculateShowProgress, isReleasedRegularEpisode, type ShowProgress } from "@/lib/shows/progress";
import type { MediaItem, UserShow } from "@/types/database";

export type WatchListMedia = Pick<MediaItem, "id" | "tmdb_id" | "title" | "poster_path" | "release_date" | "tmdb_status">;

export type WatchListEpisode = { id: string; media_item_id: string; season_number: number; episode_number: number; title: string; air_date: string | null };
export type WatchListWatchedEpisode = { id: string; episode_id: string; watched_at: string };

export const INACTIVITY_THRESHOLD_DAYS = 30;
export const RECENTLY_WATCHED_LIMIT = 10;

export type PrimaryShowState =
  | "dropped"
  | "paused"
  | "completed"
  | "caught_up"
  | "not_started"
  | "active_incomplete"
  | "needs_episode_data";

export type TrackedShowSnapshot = {
  membership: UserShow;
  media: WatchListMedia;
  episodes: WatchListEpisode[];
  watched: WatchListWatchedEpisode[];
};

export type DerivedShow = TrackedShowSnapshot & {
  primaryState: PrimaryShowState;
  progress: ShowProgress;
  latestRegularWatchedAt: string | null;
};

export type WatchNextItem = DerivedShow & { episode: WatchListEpisode };
export type RecentlyWatchedItem = {
  membership: UserShow;
  media: WatchListMedia;
  episode: WatchListEpisode;
  watched: WatchListWatchedEpisode;
};

export type WatchListCategories = {
  shows: DerivedShow[];
  watchNext: WatchNextItem[];
  recentlyWatched: RecentlyWatchedItem[];
  inactive: DerivedShow[];
  notStarted: DerivedShow[];
  caughtUp: DerivedShow[];
  completed: DerivedShow[];
  paused: DerivedShow[];
  dropped: DerivedShow[];
  needsEpisodeData: DerivedShow[];
};

const titleCompare = (left: { media: WatchListMedia }, right: { media: WatchListMedia }) =>
  left.media.title.localeCompare(right.media.title, undefined, { sensitivity: "base" }) ||
  left.media.tmdb_id - right.media.tmdb_id;

function latestTimestamp(rows: readonly WatchListWatchedEpisode[]): string | null {
  let latest: string | null = null;
  for (const row of rows) if (latest === null || row.watched_at > latest) latest = row.watched_at;
  return latest;
}

function deriveShow(snapshot: TrackedShowSnapshot, today: string): DerivedShow {
  const watchedByEpisode = new Map(snapshot.watched.map((row) => [row.episode_id, row]));
  const watchedIds = new Set(watchedByEpisode.keys());
  const progress = calculateShowProgress(snapshot.episodes, watchedIds, snapshot.media.tmdb_status, today);
  const releasedRegular = snapshot.episodes.filter((episode) => isReleasedRegularEpisode(episode, today));
  const regularWatchedRows = releasedRegular.flatMap((episode) => {
    const watched = watchedByEpisode.get(episode.id);
    return watched ? [watched] : [];
  });

  let primaryState: PrimaryShowState;
  if (snapshot.membership.status === "dropped") primaryState = "dropped";
  else if (snapshot.membership.status === "paused") primaryState = "paused";
  else if (snapshot.episodes.length === 0) primaryState = "needs_episode_data";
  else if (progress.state === "complete") primaryState = "completed";
  else if (progress.state === "caught-up") primaryState = "caught_up";
  else if (progress.watched === 0) primaryState = "not_started";
  else primaryState = "active_incomplete";

  return { ...snapshot, primaryState, progress, latestRegularWatchedAt: latestTimestamp(regularWatchedRows) };
}

export function deriveWatchList(
  snapshots: readonly TrackedShowSnapshot[],
  today: string,
  now: string,
): WatchListCategories {
  const shows = snapshots.map((snapshot) => deriveShow(snapshot, today));
  const cutoff = new Date(new Date(now).getTime() - INACTIVITY_THRESHOLD_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const watchNext = shows.flatMap((show) => {
    if (show.primaryState !== "active_incomplete") return [];
    const watchedIds = new Set(show.watched.map((row) => row.episode_id));
    const episode = show.episodes
      .filter((candidate) => isReleasedRegularEpisode(candidate, today) && !watchedIds.has(candidate.id))
      .sort((left, right) => left.season_number - right.season_number || left.episode_number - right.episode_number)[0];
    return episode ? [{ ...show, episode }] : [];
  }).sort((left, right) => {
    if (left.latestRegularWatchedAt !== right.latestRegularWatchedAt) {
      if (left.latestRegularWatchedAt === null) return 1;
      if (right.latestRegularWatchedAt === null) return -1;
      return right.latestRegularWatchedAt.localeCompare(left.latestRegularWatchedAt);
    }
    return titleCompare(left, right);
  });

  const inactive = shows
    .filter((show) => show.primaryState === "active_incomplete" && show.latestRegularWatchedAt !== null && show.latestRegularWatchedAt < cutoff)
    .sort((left, right) =>
      (left.latestRegularWatchedAt ?? "").localeCompare(right.latestRegularWatchedAt ?? "") || titleCompare(left, right));

  const episodeById = new Map<string, { show: DerivedShow; episode: WatchListEpisode }>();
  for (const show of shows) for (const episode of show.episodes) episodeById.set(episode.id, { show, episode });
  const recentlyWatched = shows
    .flatMap((show) => show.watched.flatMap((watched) => {
      const match = episodeById.get(watched.episode_id);
      return match ? [{ membership: show.membership, media: show.media, episode: match.episode, watched }] : [];
    }))
    .sort((left, right) =>
      right.watched.watched_at.localeCompare(left.watched.watched_at) ||
      titleCompare(left, right) ||
      left.episode.season_number - right.episode.season_number ||
      left.episode.episode_number - right.episode.episode_number ||
      left.watched.id.localeCompare(right.watched.id))
    .slice(0, RECENTLY_WATCHED_LIMIT);

  const primary = (state: PrimaryShowState, order: "title" | "created" = "title") => shows
    .filter((show) => show.primaryState === state)
    .sort((left, right) => order === "created"
      ? right.membership.created_at.localeCompare(left.membership.created_at) || titleCompare(left, right)
      : titleCompare(left, right));

  return {
    shows,
    watchNext,
    recentlyWatched,
    inactive,
    notStarted: primary("not_started", "created"),
    caughtUp: primary("caught_up"),
    completed: primary("completed"),
    paused: primary("paused"),
    dropped: primary("dropped"),
    needsEpisodeData: primary("needs_episode_data"),
  };
}
