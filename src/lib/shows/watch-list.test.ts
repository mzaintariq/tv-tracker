import { describe, expect, it } from "vitest";
import { deriveWatchList, INACTIVITY_THRESHOLD_DAYS, RECENTLY_WATCHED_LIMIT, type TrackedShowSnapshot } from "@/lib/shows/watch-list";
import type { Episode, MediaItem, UserShow, WatchedEpisode } from "@/types/database";

const TODAY = "2026-07-15";
const NOW = "2026-07-15T12:00:00.000Z";

function snapshot(options: {
  title?: string;
  status?: UserShow["status"];
  tmdbStatus?: string | null;
  episodes?: Array<Pick<Episode, "id" | "season_number" | "episode_number" | "air_date">>;
  watched?: Array<{ episodeId: string; watchedAt: string }>;
  createdAt?: string;
} = {}): TrackedShowSnapshot {
  const title = options.title ?? "Example";
  const mediaId = `media-${title}`;
  const episodes = options.episodes === undefined
    ? [{ id: `${title}-e1`, season_number: 1, episode_number: 1, air_date: "2020-01-01" }]
    : options.episodes;
  return {
    membership: { id: `membership-${title}`, user_id: "user", media_item_id: mediaId, status: options.status ?? "active", is_favourite: false, created_at: options.createdAt ?? "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z" },
    media: { id: mediaId, tmdb_id: title.length, media_type: "tv", title, original_title: null, overview: null, poster_path: null, backdrop_path: null, release_date: null, imdb_id: null, runtime_minutes: null, average_episode_runtime_minutes: null, tmdb_status: options.tmdbStatus ?? "Returning Series", last_synced_at: NOW, created_at: NOW, updated_at: NOW } as MediaItem,
    episodes: episodes.map((episode) => ({ ...episode, media_item_id: mediaId, title: episode.id, runtime_minutes: null, tmdb_episode_id: episode.episode_number, last_synced_at: NOW, created_at: NOW, updated_at: NOW })) as Episode[],
    watched: (options.watched ?? []).map((row, index) => ({ id: `watched-${title}-${index}`, user_id: "user", episode_id: row.episodeId, watched_at: row.watchedAt, created_at: row.watchedAt, updated_at: row.watchedAt })) as WatchedEpisode[],
  };
}

describe("watch list derivation", () => {
  it("keeps missing metadata separate from Haven't Started", () => {
    const result = deriveWatchList([snapshot({ episodes: [] })], TODAY, NOW);
    expect(result.needsEpisodeData).toHaveLength(1);
    expect(result.notStarted).toHaveLength(0);
    expect(result.watchNext).toHaveLength(0);
  });

  it("allows synchronized metadata with no released regular episodes in Haven't Started", () => {
    const show = snapshot({ episodes: [
      { id: "special", season_number: 0, episode_number: 1, air_date: "2020-01-01" },
      { id: "future", season_number: 1, episode_number: 1, air_date: "2030-01-01" },
    ] });
    expect(deriveWatchList([show], TODAY, NOW).notStarted).toHaveLength(1);
  });

  it("selects the earliest released regular unwatched episode", () => {
    const show = snapshot({ episodes: [
      { id: "special", season_number: 0, episode_number: 1, air_date: "2020-01-01" },
      { id: "s1e1", season_number: 1, episode_number: 1, air_date: "2020-01-01" },
      { id: "s1e2", season_number: 1, episode_number: 2, air_date: "2020-01-02" },
      { id: "future", season_number: 1, episode_number: 3, air_date: "2030-01-01" },
    ], watched: [{ episodeId: "s1e1", watchedAt: "2026-07-01T00:00:00Z" }] });
    const result = deriveWatchList([show], TODAY, NOW);
    expect(result.watchNext.map((item) => item.episode.id)).toEqual(["s1e2"]);
    expect(result.notStarted).toHaveLength(0);
  });

  it("advances Watch Next after the current episode is marked watched", () => {
    const episodes = [
      { id: "one", season_number: 1, episode_number: 1, air_date: "2020-01-01" },
      { id: "two", season_number: 1, episode_number: 2, air_date: "2020-01-02" },
      { id: "three", season_number: 1, episode_number: 3, air_date: "2020-01-03" },
    ];
    const before = snapshot({ episodes, watched: [{ episodeId: "one", watchedAt: "2026-07-01T00:00:00Z" }] });
    const after = snapshot({ episodes, watched: [
      { episodeId: "one", watchedAt: "2026-07-01T00:00:00Z" },
      { episodeId: "two", watchedAt: "2026-07-02T00:00:00Z" },
    ] });
    expect(deriveWatchList([before], TODAY, NOW).watchNext[0].episode.id).toBe("two");
    expect(deriveWatchList([after], TODAY, NOW).watchNext[0].episode.id).toBe("three");
  });

  it("keeps Haven't Started out of Watch Next", () => {
    const result = deriveWatchList([snapshot()], TODAY, NOW);
    expect(result.notStarted).toHaveLength(1);
    expect(result.watchNext).toHaveLength(0);
  });

  it("puts a stale active incomplete show in both reminder overlays", () => {
    const watchedAt = new Date(new Date(NOW).getTime() - (INACTIVITY_THRESHOLD_DAYS + 1) * 86_400_000).toISOString();
    const show = snapshot({ episodes: [
      { id: "one", season_number: 1, episode_number: 1, air_date: "2020-01-01" },
      { id: "two", season_number: 1, episode_number: 2, air_date: "2020-01-02" },
    ], watched: [{ episodeId: "one", watchedAt }] });
    const result = deriveWatchList([show], TODAY, NOW);
    expect(result.watchNext).toHaveLength(1);
    expect(result.inactive).toHaveLength(1);
  });

  it("uses a strict more-than-30-days inactivity boundary", () => {
    const cutoff = new Date(new Date(NOW).getTime() - INACTIVITY_THRESHOLD_DAYS * 86_400_000);
    const make = (watchedAt: string) => snapshot({ episodes: [
      { id: "one", season_number: 1, episode_number: 1, air_date: "2020-01-01" },
      { id: "two", season_number: 1, episode_number: 2, air_date: "2020-01-02" },
    ], watched: [{ episodeId: "one", watchedAt }] });
    expect(deriveWatchList([make(cutoff.toISOString())], TODAY, NOW).inactive).toHaveLength(0);
    expect(deriveWatchList([make(new Date(cutoff.getTime() - 1).toISOString())], TODAY, NOW).inactive).toHaveLength(1);
    expect(deriveWatchList([make(new Date(cutoff.getTime() + 1).toISOString())], TODAY, NOW).inactive).toHaveLength(0);
  });

  it("derives caught up, completed, and ended-incomplete correctly", () => {
    const watched = [{ episodeId: "Example-e1", watchedAt: "2026-01-01T00:00:00Z" }];
    const caught = deriveWatchList([snapshot({ watched })], TODAY, NOW);
    const completed = deriveWatchList([snapshot({ watched, tmdbStatus: "Ended" })], TODAY, NOW);
    const incomplete = deriveWatchList([snapshot({ tmdbStatus: "Ended", episodes: [
      { id: "one", season_number: 1, episode_number: 1, air_date: "2020-01-01" },
      { id: "two", season_number: 1, episode_number: 2, air_date: "2020-01-02" },
    ], watched: [{ episodeId: "one", watchedAt: "2026-01-01T00:00:00Z" }] })], TODAY, NOW);
    expect(caught.caughtUp).toHaveLength(1);
    expect(completed.completed).toHaveLength(1);
    expect(incomplete.watchNext).toHaveLength(1);
    expect(incomplete.shows[0].progress.state).toBe("partial");
  });

  it("makes paused and dropped primary and excludes them from overlays", () => {
    const episodes = [
      { id: "one", season_number: 1, episode_number: 1, air_date: "2020-01-01" },
      { id: "two", season_number: 1, episode_number: 2, air_date: "2020-01-02" },
    ];
    const watched = [{ episodeId: "one", watchedAt: "2020-01-01T00:00:00Z" }];
    const result = deriveWatchList([snapshot({ title: "Paused", status: "paused", episodes, watched }), snapshot({ title: "Dropped", status: "dropped", episodes, watched })], TODAY, NOW);
    expect(result.paused).toHaveLength(1);
    expect(result.dropped).toHaveLength(1);
    expect(result.watchNext).toHaveLength(0);
    expect(result.inactive).toHaveLength(0);
    expect(result.recentlyWatched).toHaveLength(2);
  });

  it("assigns exactly one primary state to every tracked show", () => {
    const result = deriveWatchList([
      snapshot({ title: "Missing", episodes: [] }),
      snapshot({ title: "Not started" }),
      snapshot({ title: "Paused", status: "paused" }),
      snapshot({ title: "Dropped", status: "dropped" }),
      snapshot({ title: "Caught", watched: [{ episodeId: "Caught-e1", watchedAt: NOW }] }),
      snapshot({ title: "Complete", tmdbStatus: "Ended", watched: [{ episodeId: "Complete-e1", watchedAt: NOW }] }),
      snapshot({ title: "Partial", episodes: [
        { id: "Partial-e1", season_number: 1, episode_number: 1, air_date: "2020-01-01" },
        { id: "Partial-e2", season_number: 1, episode_number: 2, air_date: "2020-01-02" },
      ], watched: [{ episodeId: "Partial-e1", watchedAt: NOW }] }),
    ], TODAY, NOW);
    expect(result.shows.map((show) => show.primaryState).sort()).toEqual([
      "active_incomplete", "caught_up", "completed", "dropped", "needs_episode_data", "not_started", "paused",
    ]);
  });

  it("sorts every section deterministically", () => {
    const partial = (title: string, watchedAt: string) => snapshot({ title, episodes: [
      { id: `${title}-one`, season_number: 1, episode_number: 1, air_date: "2020-01-01" },
      { id: `${title}-two`, season_number: 1, episode_number: 2, air_date: "2020-01-02" },
    ], watched: [{ episodeId: `${title}-one`, watchedAt }] });
    const result = deriveWatchList([
      partial("Beta", "2026-07-01T00:00:00Z"),
      partial("Alpha", "2026-07-01T00:00:00Z"),
      partial("Recent", "2026-07-10T00:00:00Z"),
      snapshot({ title: "Newer", createdAt: "2026-07-02T00:00:00Z" }),
      snapshot({ title: "Older", createdAt: "2026-07-01T00:00:00Z" }),
    ], TODAY, NOW);
    expect(result.watchNext.map((item) => item.media.title)).toEqual(["Recent", "Alpha", "Beta"]);
    expect(result.notStarted.map((item) => item.media.title)).toEqual(["Newer", "Older"]);
    expect(result.recentlyWatched.map((item) => item.media.title)).toEqual(["Recent", "Alpha", "Beta"]);
  });

  it("sorts inactivity oldest-first and title-sorts primary sections", () => {
    const partial = (title: string, watchedAt: string) => snapshot({ title, episodes: [
      { id: `${title}-one`, season_number: 1, episode_number: 1, air_date: "2020-01-01" },
      { id: `${title}-two`, season_number: 1, episode_number: 2, air_date: "2020-01-02" },
    ], watched: [{ episodeId: `${title}-one`, watchedAt }] });
    const result = deriveWatchList([
      partial("Newer stale", "2026-05-15T00:00:00Z"),
      partial("Older stale", "2026-04-15T00:00:00Z"),
      snapshot({ title: "Zulu", status: "paused" }),
      snapshot({ title: "Alpha", status: "paused" }),
    ], TODAY, NOW);
    expect(result.inactive.map((item) => item.media.title)).toEqual(["Older stale", "Newer stale"]);
    expect(result.paused.map((item) => item.media.title)).toEqual(["Alpha", "Zulu"]);
  });

  it("limits Recently Watched", () => {
    const show = snapshot({ episodes: Array.from({ length: RECENTLY_WATCHED_LIMIT + 2 }, (_, index) => ({ id: `e${index}`, season_number: 1, episode_number: index + 1, air_date: "2020-01-01" })), watched: Array.from({ length: RECENTLY_WATCHED_LIMIT + 2 }, (_, index) => ({ episodeId: `e${index}`, watchedAt: `2026-07-${String(index + 1).padStart(2, "0")}T00:00:00Z` })) });
    expect(deriveWatchList([show], TODAY, NOW).recentlyWatched).toHaveLength(RECENTLY_WATCHED_LIMIT);
  });
});
