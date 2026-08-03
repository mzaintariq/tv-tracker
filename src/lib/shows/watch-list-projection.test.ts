import { describe, expect, it } from "vitest";
import {
  mapWatchListProjection,
  type WatchListProjection,
  type WatchListProjectionRow,
} from "@/lib/shows/watch-list";

const base: WatchListProjectionRow = {
  membership_id: "membership",
  user_id: "user",
  media_item_id: "media",
  status: "active",
  is_favourite: true,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
  tmdb_id: 1,
  title: "Example",
  poster_path: null,
  release_date: "2020-01-01",
  tmdb_status: "Returning Series",
  released_count: 2,
  watched_released_count: 1,
  latest_regular_watched_at: "2026-07-10T00:00:00Z",
  latest_unwatched_released_air_date: "2020-01-02",
  category: "watch_next",
  next_episode_id: "episode-2",
  next_season_number: 1,
  next_episode_number: 2,
  next_episode_title: "Second",
  next_episode_air_date: "2020-01-02",
};

describe("compact Watch List projection mapping", () => {
  it("maps counts and the single next episode without snapshot arrays", () => {
    const projection: WatchListProjection = {
      shows: [base],
      recently_watched: [],
    };
    expect(projection.shows[0]).not.toHaveProperty("episodes");
    expect(projection.shows[0]).not.toHaveProperty("watched");
    const result = mapWatchListProjection(projection);
    expect(result.watchNext[0].episode.id).toBe("episode-2");
    expect(result.watchNext[0].progress).toEqual({
      watched: 1,
      total: 2,
      percentage: 50,
      state: "partial",
    });
  });

  it("groups every projection category and preserves deterministic ordering", () => {
    const categories = [
      "inactive",
      "not_started",
      "caught_up",
      "completed",
      "paused",
      "dropped",
      "needs_episode_data",
    ] as const;
    const projection: WatchListProjection = {
      shows: categories.map((category, index) => ({
        ...base,
        membership_id: `membership-${index}`,
        media_item_id: `media-${index}`,
        tmdb_id: index + 2,
        title: category,
        category,
        watched_released_count:
          category === "caught_up" || category === "completed" ? 2 : 0,
        tmdb_status: category === "completed" ? "eNdEd" : "Returning Series",
        next_episode_id: null,
        next_season_number: null,
        next_episode_number: null,
        next_episode_title: null,
        next_episode_air_date: null,
      })),
      recently_watched: [],
    };
    const result = mapWatchListProjection(projection);
    expect([
      result.inactive,
      result.notStarted,
      result.caughtUp,
      result.completed,
      result.paused,
      result.dropped,
      result.needsEpisodeData,
    ].every((section) => section.length === 1)).toBe(true);
    expect(result.completed[0].progress.state).toBe("complete");
  });

  it("maps bounded Recently Watched rows for quick undo", () => {
    const result = mapWatchListProjection({
      shows: [base],
      recently_watched: [{
        watched_id: "watched-1",
        episode_id: "episode-1",
        watched_at: "2026-07-10T00:00:00Z",
        membership_id: base.membership_id,
        user_id: base.user_id,
        media_item_id: base.media_item_id,
        status: base.status,
        is_favourite: base.is_favourite,
        created_at: base.created_at,
        updated_at: base.updated_at,
        tmdb_id: base.tmdb_id,
        title: base.title,
        poster_path: base.poster_path,
        release_date: base.release_date,
        tmdb_status: base.tmdb_status,
        season_number: 1,
        episode_number: 1,
        episode_title: "First",
        air_date: "2020-01-01",
      }],
    });
    expect(result.recentlyWatched[0].watched.id).toBe("watched-1");
    expect(result.recentlyWatched[0].episode.title).toBe("First");
  });
});
