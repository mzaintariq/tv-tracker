import { describe, expect, it } from "vitest";
import { calculateShowProgress, isReleasedRegularEpisode } from "@/lib/shows/progress";

const episodes = [
  { id: "special", season_number: 0, air_date: "2020-01-01" },
  { id: "one", season_number: 1, air_date: "2020-01-01" },
  { id: "two", season_number: 1, air_date: "2020-01-02" },
  { id: "future", season_number: 2, air_date: "2030-01-01" },
  { id: "unknown", season_number: 2, air_date: null },
];

describe("show progress", () => {
  it("excludes Season 0, future episodes, and unknown air dates", () => { expect(isReleasedRegularEpisode(episodes[0], "2025-01-01")).toBe(false); expect(calculateShowProgress(episodes, new Set(["special", "future"]), "Returning Series", "2025-01-01")).toEqual({ watched: 0, total: 2, percentage: 0, state: "none" }); });
  it("returns yellow partial progress", () => expect(calculateShowProgress(episodes, new Set(["one"]), "Ended", "2025-01-01")).toEqual({ watched: 1, total: 2, percentage: 50, state: "partial" }));
  it("returns green for caught up ongoing shows", () => expect(calculateShowProgress(episodes, new Set(["one", "two"]), "Returning Series", "2025-01-01").state).toBe("caught-up"));
  it("returns purple for complete ended shows", () => expect(calculateShowProgress(episodes, new Set(["one", "two"]), "Ended", "2025-01-01").state).toBe("complete"));
  it("handles no released episodes", () => expect(calculateShowProgress([], new Set(), "Ended", "2025-01-01")).toEqual({ watched: 0, total: 0, percentage: 0, state: "none" }));
});
