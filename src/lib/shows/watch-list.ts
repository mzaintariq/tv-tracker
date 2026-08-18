import {
  calculateShowProgress,
  isReleasedRegularEpisode,
  type ShowProgress,
} from "@/lib/shows/progress";
import type { MediaItem, UserShow } from "@/types/database";

export type WatchListMedia = Pick<
  MediaItem,
  | "id"
  | "tmdb_id"
  | "title"
  | "poster_path"
  | "release_date"
  | "tmdb_status"
  | "genres"
  | "vote_average"
>;

export type WatchListEpisode = {
  id: string;
  media_item_id: string;
  season_number: number;
  episode_number: number;
  title: string;
  air_date: string | null;
};
export type WatchListWatchedEpisode = {
  id: string;
  episode_id: string;
  watched_at: string;
};

/** Inclusive rolling window for Watch Next recency and inactivity. Exactly N days ago still counts as recent. */
export const INACTIVITY_THRESHOLD_DAYS = 30;
export const RECENTLY_WATCHED_LIMIT = 10;
export const SECONDARY_SECTION_INITIAL_LIMIT = 10;

export function formatSectionHeading(
  title: string,
  totalCount: number,
): string {
  return `${title} · ${totalCount}`;
}

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

export type WatchListProjectionRow = {
  membership_id: string;
  user_id: string;
  media_item_id: string;
  status: UserShow["status"];
  is_favourite: boolean;
  created_at: string;
  updated_at: string;
  tmdb_id: number;
  title: string;
  poster_path: string | null;
  release_date: string | null;
  tmdb_status: string | null;
  genres: MediaItem["genres"];
  vote_average: number | null;
  released_count: number;
  watched_released_count: number;
  latest_regular_watched_at: string | null;
  latest_unwatched_released_air_date: string | null;
  category:
    | "watch_next"
    | "inactive"
    | Exclude<PrimaryShowState, "active_incomplete">;
  next_episode_id: string | null;
  next_season_number: number | null;
  next_episode_number: number | null;
  next_episode_title: string | null;
  next_episode_air_date: string | null;
};

export type RecentlyWatchedProjectionRow = {
  watched_id: string;
  episode_id: string;
  watched_at: string;
  membership_id: string;
  user_id: string;
  media_item_id: string;
  status: UserShow["status"];
  is_favourite: boolean;
  created_at: string;
  updated_at: string;
  tmdb_id: number;
  title: string;
  poster_path: string | null;
  release_date: string | null;
  tmdb_status: string | null;
  season_number: number;
  episode_number: number;
  episode_title: string;
  air_date: string | null;
};

export type WatchListProjection = {
  shows: WatchListProjectionRow[];
  recently_watched: RecentlyWatchedProjectionRow[];
};

const titleCompare = (
  left: { media: WatchListMedia },
  right: { media: WatchListMedia },
) =>
  left.media.title.localeCompare(right.media.title, undefined, {
    sensitivity: "base",
  }) || left.media.tmdb_id - right.media.tmdb_id;

function latestTimestamp(
  rows: readonly WatchListWatchedEpisode[],
): string | null {
  let latest: string | null = null;
  for (const row of rows)
    if (latest === null || row.watched_at > latest) latest = row.watched_at;
  return latest;
}

function deriveShow(snapshot: TrackedShowSnapshot, today: string): DerivedShow {
  const watchedByEpisode = new Map(
    snapshot.watched.map((row) => [row.episode_id, row]),
  );
  const watchedIds = new Set(watchedByEpisode.keys());
  const progress = calculateShowProgress(
    snapshot.episodes,
    watchedIds,
    snapshot.media.tmdb_status,
    today,
  );
  const releasedRegular = snapshot.episodes.filter((episode) =>
    isReleasedRegularEpisode(episode, today),
  );
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

  return {
    ...snapshot,
    primaryState,
    progress,
    latestRegularWatchedAt: latestTimestamp(regularWatchedRows),
  };
}

function unwatchedReleasedRegularEpisodes(
  show: DerivedShow,
  today: string,
): WatchListEpisode[] {
  const watchedIds = new Set(show.watched.map((row) => row.episode_id));
  return show.episodes
    .filter(
      (candidate) =>
        isReleasedRegularEpisode(candidate, today) &&
        !watchedIds.has(candidate.id),
    )
    .sort(
      (left, right) =>
        left.season_number - right.season_number ||
        left.episode_number - right.episode_number,
    );
}

/**
 * Watch Next eligibility for active incomplete shows:
 * - at least one unwatched released regular episode (Season 0 never qualifies); and
 * - either a regular episode was watched within the inclusive last 30 days, or
 * - an unwatched released regular episode aired within the inclusive last 30 days.
 * Future air dates never qualify until aired (`air_date <= today`).
 */
export function isWatchNextEligible(
  show: DerivedShow,
  today: string,
  cutoffIso: string,
  cutoffDate: string,
): boolean {
  if (show.primaryState !== "active_incomplete") return false;
  const unwatched = unwatchedReleasedRegularEpisodes(show, today);
  if (unwatched.length === 0) return false;

  const recentlyWatched =
    show.latestRegularWatchedAt !== null &&
    show.latestRegularWatchedAt >= cutoffIso;
  const recentlyAired = unwatched.some(
    (episode) => episode.air_date !== null && episode.air_date >= cutoffDate,
  );
  return recentlyWatched || recentlyAired;
}

export function deriveWatchList(
  snapshots: readonly TrackedShowSnapshot[],
  today: string,
  now: string,
): WatchListCategories {
  const shows = snapshots.map((snapshot) => deriveShow(snapshot, today));
  const cutoffMs =
    new Date(now).getTime() - INACTIVITY_THRESHOLD_DAYS * 24 * 60 * 60 * 1000;
  const cutoffIso = new Date(cutoffMs).toISOString();
  const cutoffDate = cutoffIso.slice(0, 10);

  const watchNext = shows
    .flatMap((show) => {
      if (!isWatchNextEligible(show, today, cutoffIso, cutoffDate)) return [];
      const episode = unwatchedReleasedRegularEpisodes(show, today)[0];
      return episode ? [{ ...show, episode }] : [];
    })
    .sort((left, right) => {
      if (left.latestRegularWatchedAt !== right.latestRegularWatchedAt) {
        if (left.latestRegularWatchedAt === null) return 1;
        if (right.latestRegularWatchedAt === null) return -1;
        return right.latestRegularWatchedAt.localeCompare(
          left.latestRegularWatchedAt,
        );
      }
      return titleCompare(left, right);
    });

  const watchNextIds = new Set(watchNext.map((item) => item.membership.id));
  // Deterministic: every active incomplete show is either Watch Next or Haven't watched for a while, never both.
  const inactive = shows
    .filter(
      (show) =>
        show.primaryState === "active_incomplete" &&
        !watchNextIds.has(show.membership.id),
    )
    .sort(
      (left, right) =>
        (left.latestRegularWatchedAt ?? "").localeCompare(
          right.latestRegularWatchedAt ?? "",
        ) || titleCompare(left, right),
    );

  const episodeById = new Map<
    string,
    { show: DerivedShow; episode: WatchListEpisode }
  >();
  for (const show of shows)
    for (const episode of show.episodes)
      episodeById.set(episode.id, { show, episode });
  const recentlyWatched = shows
    .flatMap((show) =>
      show.watched.flatMap((watched) => {
        const match = episodeById.get(watched.episode_id);
        return match
          ? [
              {
                membership: show.membership,
                media: show.media,
                episode: match.episode,
                watched,
              },
            ]
          : [];
      }),
    )
    .sort(
      (left, right) =>
        right.watched.watched_at.localeCompare(left.watched.watched_at) ||
        titleCompare(left, right) ||
        left.episode.season_number - right.episode.season_number ||
        left.episode.episode_number - right.episode.episode_number ||
        left.watched.id.localeCompare(right.watched.id),
    )
    .slice(0, RECENTLY_WATCHED_LIMIT);

  const primary = (
    state: PrimaryShowState,
    order: "title" | "created" = "title",
  ) =>
    shows
      .filter((show) => show.primaryState === state)
      .sort((left, right) =>
        order === "created"
          ? right.membership.created_at.localeCompare(
              left.membership.created_at,
            ) || titleCompare(left, right)
          : titleCompare(left, right),
      );

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

/** Maps the compact database projection into the established rendering contract. */
export function mapWatchListProjection(
  projection: WatchListProjection,
): WatchListCategories {
  const shows = projection.shows.map((row): DerivedShow => {
    const percentage =
      row.released_count === 0
        ? 0
        : Math.round(
            (row.watched_released_count / row.released_count) * 100,
          );
    const progressState: ShowProgress["state"] =
      row.watched_released_count === 0
        ? "none"
        : row.watched_released_count < row.released_count
          ? "partial"
          : row.tmdb_status?.toLowerCase() === "ended"
            ? "complete"
            : "caught-up";
    const primaryState: PrimaryShowState =
      row.category === "watch_next" || row.category === "inactive"
        ? "active_incomplete"
        : row.category;
    return {
      membership: {
        id: row.membership_id,
        user_id: row.user_id,
        media_item_id: row.media_item_id,
        status: row.status,
        is_favourite: row.is_favourite,
        created_at: row.created_at,
        updated_at: row.updated_at,
      },
      media: {
        id: row.media_item_id,
        tmdb_id: row.tmdb_id,
        title: row.title,
        poster_path: row.poster_path,
        release_date: row.release_date,
        tmdb_status: row.tmdb_status,
        genres: row.genres,
        vote_average: row.vote_average,
      },
      episodes: [],
      watched: [],
      primaryState,
      progress: {
        watched: row.watched_released_count,
        total: row.released_count,
        percentage,
        state: progressState,
      },
      latestRegularWatchedAt: row.latest_regular_watched_at,
    };
  });
  const byMembership = new Map(
    shows.map((show) => [show.membership.id, show]),
  );
  const rowsByMembership = new Map(
    projection.shows.map((row) => [row.membership_id, row]),
  );
  const titleSort = (left: DerivedShow, right: DerivedShow) =>
    titleCompare(left, right);
  const select = (...categories: WatchListProjectionRow["category"][]) =>
    shows.filter((show) =>
      categories.includes(rowsByMembership.get(show.membership.id)!.category),
    );
  const watchNext = select("watch_next")
    .flatMap((show): WatchNextItem[] => {
      const row = rowsByMembership.get(show.membership.id)!;
      if (
        row.next_episode_id === null ||
        row.next_season_number === null ||
        row.next_episode_number === null ||
        row.next_episode_title === null
      )
        return [];
      return [{
        ...show,
        episode: {
          id: row.next_episode_id,
          media_item_id: row.media_item_id,
          season_number: row.next_season_number,
          episode_number: row.next_episode_number,
          title: row.next_episode_title,
          air_date: row.next_episode_air_date,
        },
      }];
    })
    .sort((left, right) =>
      (right.latestRegularWatchedAt ?? "").localeCompare(
        left.latestRegularWatchedAt ?? "",
      ) || titleCompare(left, right),
    );
  const inactive = select("inactive").sort(
    (left, right) =>
      (left.latestRegularWatchedAt ?? "").localeCompare(
        right.latestRegularWatchedAt ?? "",
      ) || titleCompare(left, right),
  );
  const recentlyWatched = projection.recently_watched.flatMap(
    (row): RecentlyWatchedItem[] => {
      const show = byMembership.get(row.membership_id);
      return show
        ? [{
            membership: show.membership,
            media: show.media,
            episode: {
              id: row.episode_id,
              media_item_id: row.media_item_id,
              season_number: row.season_number,
              episode_number: row.episode_number,
              title: row.episode_title,
              air_date: row.air_date,
            },
            watched: {
              id: row.watched_id,
              episode_id: row.episode_id,
              watched_at: row.watched_at,
            },
          }]
        : [];
    },
  );
  return {
    shows,
    watchNext,
    recentlyWatched,
    inactive,
    notStarted: select("not_started").sort(
      (left, right) =>
        right.membership.created_at.localeCompare(left.membership.created_at) ||
        titleSort(left, right),
    ),
    caughtUp: select("caught_up").sort(titleSort),
    completed: select("completed").sort(titleSort),
    paused: select("paused").sort(titleSort),
    dropped: select("dropped").sort(titleSort),
    needsEpisodeData: select("needs_episode_data").sort(titleSort),
  };
}
