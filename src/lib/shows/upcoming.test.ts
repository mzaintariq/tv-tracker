import { describe, expect, it } from "vitest";
import { EPISODE_METADATA_STALE_HOURS, isEpisodeMetadataStale, settleWithConcurrency, shouldAutomaticallyRefreshEpisodes } from "@/lib/shows/freshness";
import { addCalendarDays, dateInTimeZone, deriveUpcoming, upcomingDateLabel, type UpcomingSnapshot } from "@/lib/shows/upcoming";
import type { Episode, MediaItem, UserShow } from "@/types/database";

const NOW = new Date("2026-07-15T01:00:00.000Z");
const TODAY = "2026-07-15";

function snapshot(title: string, status: UserShow["status"], episodeRows: Array<Pick<Episode, "id" | "season_number" | "episode_number" | "air_date">>): UpcomingSnapshot {
  const mediaId = `media-${title}`;
  const media = {
    id: mediaId, tmdb_id: title.length, media_type: "tv", title, original_title: null,
    overview: null, poster_path: null, backdrop_path: null, release_date: null, imdb_id: null,
    runtime_minutes: null, average_episode_runtime_minutes: null, tmdb_status: "Returning Series",
    last_synced_at: NOW.toISOString(), episodes_synced_at: NOW.toISOString(), created_at: NOW.toISOString(), updated_at: NOW.toISOString(),
  } satisfies MediaItem;
  const membership = {
    id: `membership-${title}`, user_id: "user", media_item_id: mediaId, status,
    is_favourite: false, created_at: NOW.toISOString(), updated_at: NOW.toISOString(),
  } satisfies UserShow;
  const episodes = episodeRows.map((episode) => ({
    ...episode, media_item_id: mediaId, title: episode.id, runtime_minutes: null,
    tmdb_episode_id: episode.episode_number, last_synced_at: NOW.toISOString(),
    created_at: NOW.toISOString(), updated_at: NOW.toISOString(),
  })) satisfies Episode[];
  return { membership, media, episodes };
}

describe("Upcoming derivation", () => {
  it("includes the previous two days, today, and future regular episodes", () => {
    const result = deriveUpcoming([snapshot("Active", "active", [
      { id: "past", season_number: 1, episode_number: 1, air_date: "2026-07-14" },
      { id: "today", season_number: 1, episode_number: 2, air_date: TODAY },
      { id: "future", season_number: 1, episode_number: 3, air_date: "2026-07-16" },
      { id: "unknown", season_number: 1, episode_number: 4, air_date: null },
      { id: "special", season_number: 0, episode_number: 1, air_date: TODAY },
    ])], TODAY);
    expect(result.map((group) => group.airDate)).toEqual(["2026-07-14", TODAY, "2026-07-16"]);
    expect(result.flatMap((group) => group.items).map((item) => item.kind === "episode" ? item.episode.id : "group")).toEqual(["past", "today", "future"]);
  });

  it("excludes paused and dropped shows", () => {
    const episode = [{ id: "episode", season_number: 1, episode_number: 1, air_date: TODAY }];
    expect(deriveUpcoming([snapshot("Paused", "paused", episode), snapshot("Dropped", "dropped", episode)], TODAY)).toEqual([{ airDate: TODAY, items: [] }]);
  });

  it("groups only multiple episodes from the same show, season, and date", () => {
    const result = deriveUpcoming([
      snapshot("Alpha", "active", [
        { id: "a2", season_number: 1, episode_number: 2, air_date: TODAY },
        { id: "a1", season_number: 1, episode_number: 1, air_date: TODAY },
        { id: "a-s2", season_number: 2, episode_number: 1, air_date: TODAY },
      ]),
      snapshot("Beta", "active", [{ id: "b1", season_number: 1, episode_number: 1, air_date: TODAY }]),
    ], TODAY);
    expect(result[0].items.map((item) => [item.media.title, item.kind])).toEqual([
      ["Alpha", "season"], ["Alpha", "episode"], ["Beta", "episode"],
    ]);
    const grouped = result[0].items[0];
    expect(grouped.kind === "season" ? grouped.episodes.map((episode) => episode.id) : []).toEqual(["a1", "a2"]);
  });

  it("sorts dates and same-date items deterministically", () => {
    const result = deriveUpcoming([
      snapshot("Zulu", "active", [{ id: "z", season_number: 2, episode_number: 1, air_date: "2026-07-20" }]),
      snapshot("Alpha", "active", [{ id: "a", season_number: 1, episode_number: 3, air_date: TODAY }]),
    ], TODAY);
    expect(result.map((group) => group.airDate)).toEqual([TODAY, "2026-07-20"]);
    expect(result[0].items[0].media.title).toBe("Alpha");
  });

  it("always emits a Today section so initial positioning has a stable target", () => {
    expect(deriveUpcoming([], TODAY)).toEqual([{ airDate: TODAY, items: [] }]);
  });
});

describe("Upcoming calendar helpers", () => {
  it("uses the configured timezone for today's date and falls back to UTC", () => {
    expect(dateInTimeZone(NOW, "America/Los_Angeles")).toBe("2026-07-14");
    expect(dateInTimeZone(NOW, "Asia/Tokyo")).toBe("2026-07-15");
    expect(dateInTimeZone(NOW, "invalid/timezone")).toBe("2026-07-15");
  });

  it("labels Yesterday, Today, Tomorrow, and later dates", () => {
    expect(upcomingDateLabel(addCalendarDays(TODAY, -1), TODAY)).toBe("Yesterday");
    expect(upcomingDateLabel(TODAY, TODAY)).toBe("Today");
    expect(upcomingDateLabel(addCalendarDays(TODAY, 1), TODAY)).toBe("Tomorrow");
    expect(upcomingDateLabel("2026-07-25", TODAY)).toBe("July 25");
  });
});

describe("episode metadata freshness", () => {
  it("treats null, invalid, and exactly 24-hour-old timestamps as stale", () => {
    expect(isEpisodeMetadataStale(null, NOW)).toBe(true);
    expect(isEpisodeMetadataStale("invalid", NOW)).toBe(true);
    const cutoff = new Date(NOW.getTime() - EPISODE_METADATA_STALE_HOURS * 60 * 60 * 1000);
    expect(isEpisodeMetadataStale(cutoff.toISOString(), NOW)).toBe(true);
    expect(isEpisodeMetadataStale(new Date(cutoff.getTime() + 1).toISOString(), NOW)).toBe(false);
  });

  it("refreshes only stale active shows under the existing ended interpretation", () => {
    expect(shouldAutomaticallyRefreshEpisodes("active", "Returning Series", null, NOW)).toBe(true);
    expect(shouldAutomaticallyRefreshEpisodes("paused", "Returning Series", null, NOW)).toBe(false);
    expect(shouldAutomaticallyRefreshEpisodes("dropped", "Returning Series", null, NOW)).toBe(false);
    expect(shouldAutomaticallyRefreshEpisodes("active", "Ended", null, NOW)).toBe(false);
    expect(shouldAutomaticallyRefreshEpisodes("active", "Canceled", null, NOW)).toBe(true);
  });

  it("settles failures independently and respects bounded concurrency", async () => {
    let active = 0;
    let maximum = 0;
    const results = await settleWithConcurrency([1, 2, 3, 4], 2, async (item) => {
      active += 1;
      maximum = Math.max(maximum, active);
      await new Promise((resolve) => setTimeout(resolve, 1));
      active -= 1;
      if (item === 2) throw new Error("failed");
      return item;
    });
    expect(maximum).toBe(2);
    expect(results.map((result) => result.status)).toEqual(["fulfilled", "rejected", "fulfilled", "fulfilled"]);
  });
});
