import { describe, expect, it } from "vitest";
import { isCandidateTmdbIds, isMatchContext } from "./validation";

describe("match context", () => {
  it("accepts minimal sorted TV coordinates", () => expect(isMatchContext({ version: 1, kind: "tv", coordinates: [{ seasonNumber: 0, episodeNumber: 1 }, { seasonNumber: 1, episodeNumber: 2 }] })).toBe(true));
  it("rejects duplicates and unexpected data", () => {
    expect(isMatchContext({ version: 1, kind: "tv", coordinates: [{ seasonNumber: 1, episodeNumber: 1 }, { seasonNumber: 1, episodeNumber: 1 }] })).toBe(false);
    expect(isMatchContext({ version: 1, kind: "movie", releaseDate: null, rawRow: {} })).toBe(false);
  });
});

describe("TMDB candidate IDs", () => {
  it("accepts unique positive integers", () => expect(isCandidateTmdbIds([1, 42])).toBe(true));
  it("rejects nulls, duplicates, invalid IDs, and oversized arrays", () => {
    expect(isCandidateTmdbIds([1, null])).toBe(false);
    expect(isCandidateTmdbIds([1, 1])).toBe(false);
    expect(isCandidateTmdbIds([0])).toBe(false);
    expect(isCandidateTmdbIds(Array.from({ length: 21 }, (_, index) => index + 1))).toBe(false);
  });
});
