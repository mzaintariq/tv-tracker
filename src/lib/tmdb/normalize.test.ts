import { describe, expect, it } from "vitest";
import { normalizeCount, normalizeCountries, normalizeDate, normalizeLanguage, normalizeNamedEntities, normalizeVote } from "@/lib/tmdb/normalize";

describe("stable metadata normalization", () => {
  it("rejects malformed values and deterministically deduplicates entities", () => {
    expect(normalizeNamedEntities([{ id: 4, name: " Four " }, { id: 2, name: "Two" }, { id: 4, name: "Again" }, { id: 0, name: "Bad" }, null], 2)).toEqual([{ id: 2, name: "Two" }, { id: 4, name: "Four" }]);
  });
  it("normalizes scalar metadata safely", () => {
    expect(normalizeVote(8.4, 10)).toBe(8.4); expect(normalizeVote(11, 10)).toBeNull();
    expect(normalizeCount(20)).toBe(20); expect(normalizeCount(2.5)).toBeNull();
    expect(normalizeLanguage(" EN ")).toBe("en"); expect(normalizeLanguage("english")).toBeNull();
    expect(normalizeDate("2026-02-03T00:00:00Z")).toBe("2026-02-03"); expect(normalizeDate("bad")).toBeNull();
    expect(normalizeCountries(["us", "PK", "us", "USA", null])).toEqual(["PK", "US"]);
  });
});
