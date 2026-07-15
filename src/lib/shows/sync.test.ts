import { describe, expect, it } from "vitest";
import { mapTmdbEpisode } from "@/lib/shows/episode-mapper";
import { regularSeasonSyncSucceeded } from "@/lib/shows/freshness";

describe("TMDB episode mapping", () => {
  it("normalizes optional metadata", () => { expect(mapTmdbEpisode("media", { id: 10, season_number: 1, episode_number: 2, name: "", air_date: "invalid", runtime: 0 }, "now")).toMatchObject({ title: "Episode 2", air_date: null, runtime_minutes: null }); });
  it("rejects invalid identifiers", () => { expect(mapTmdbEpisode("media", { id: -1, season_number: 1, episode_number: 1, name: "Bad" }, "now")).toBeNull(); });
});

describe("episode synchronization freshness", () => {
  it("allows Season 0 failure without making regular episode metadata stale", () => {
    expect(regularSeasonSyncSucceeded([])).toBe(true);
    expect(regularSeasonSyncSucceeded([0])).toBe(true);
  });

  it("rejects freshness when any regular season fails", () => {
    expect(regularSeasonSyncSucceeded([1])).toBe(false);
    expect(regularSeasonSyncSucceeded([0, 2])).toBe(false);
  });
});
