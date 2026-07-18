import { describe, expect, it } from "vitest";
import type { Episode } from "@/types/database";
import { defaultOpenRegularSeason } from "./season-disclosures";

function episode(id: string, season: number, airDate: string | null): Episode {
  return { id, media_item_id: "media", season_number: season, episode_number: 1, title: id, air_date: airDate, runtime_minutes: null, tmdb_episode_id: season * 100 + 1, last_synced_at: "2025-01-01", created_at: "2025-01-01", updated_at: "2025-01-01" };
}

describe("defaultOpenRegularSeason", () => {
  it("opens the first regular season with an unwatched released episode", () => {
    const seasons = new Map([[0, [episode("special", 0, "2024-01-01")]], [1, [episode("watched", 1, "2024-01-01")]], [2, [episode("next", 2, "2025-01-01")]]]);
    expect(defaultOpenRegularSeason(seasons, new Set(["watched"]), "2025-02-01")).toBe(2);
  });

  it("opens the most recently aired season when all released episodes are watched", () => {
    const seasons = new Map([[1, [episode("old", 1, "2024-01-01")]], [2, [episode("new", 2, "2025-01-01")]]]);
    expect(defaultOpenRegularSeason(seasons, new Set(["old", "new"]), "2025-02-01")).toBe(2);
  });

  it("falls back deterministically for future-only, unknown-date, empty, and specials-only data", () => {
    expect(defaultOpenRegularSeason(new Map([[2, [episode("future", 2, "2030-01-01")]], [1, [episode("unknown", 1, null)]]]), new Set(), "2025-02-01")).toBe(1);
    expect(defaultOpenRegularSeason(new Map([[3, []], [1, []]]), new Set(), "2025-02-01")).toBe(1);
    expect(defaultOpenRegularSeason(new Map([[0, [episode("special", 0, "2024-01-01")]]]), new Set(), "2025-02-01")).toBeNull();
  });
});
