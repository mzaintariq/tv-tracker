import { describe, expect, it } from "vitest";
import { normalizeTitle } from "./normalize";
import { canonicalMatchTitle, extractTrailingYearHint, selectUniqueExactMovieCandidate, shouldFallbackYearSearch, withoutConflictingYear } from "./matching-quality";

describe("TV Time matching quality", () => {
  it("extracts only a trailing plausible year", () => {
    expect(extractTrailingYearHint("Taken (2017)")).toEqual({ searchTitle: "Taken", year: 2017 });
    expect(extractTrailingYearHint("Taken (US)")).toEqual({ searchTitle: "Taken (US)", year: null });
  });
  it("selects one exact candidate without a conflicting year", () => {
    expect(selectUniqueExactMovieCandidate([{ title: "Finding Nemo", release_date: "2003-05-30" }], normalizeTitle("Finding Nemo"), null, normalizeTitle)?.title).toBe("Finding Nemo");
  });
  it("rejects one exact candidate with a conflicting known year", () => {
    expect(selectUniqueExactMovieCandidate([{ title: "Taken", release_date: "2008-01-01" }], normalizeTitle("Taken"), 2017, normalizeTitle)).toBeNull();
  });
  it("keeps multiple exact candidates ambiguous", () => {
    expect(selectUniqueExactMovieCandidate([{ title: "Taken" }, { title: "Taken" }], normalizeTitle("Taken"), null, normalizeTitle)).toBeNull();
  });
  it("falls back when a year-constrained search has no exact-title candidate", () => {
    expect(shouldFallbackYearSearch([{ title: "Different" }], normalizeTitle("Taken"), normalizeTitle)).toBe(true);
    expect(shouldFallbackYearSearch([{ title: "Taken" }], normalizeTitle("Taken"), normalizeTitle)).toBe(false);
  });
  it("treats punctuation-only differences conservatively as equal", () => {
    expect(canonicalMatchTitle("What If…?")).toBe(canonicalMatchTitle("What If...?"));
    expect(canonicalMatchTitle("Marvel Studios: Assembled")).toBe(canonicalMatchTitle("Marvel Studios Assembled"));
    expect(canonicalMatchTitle("Sex!fy")).toBe(canonicalMatchTitle("Sexify"));
    expect(canonicalMatchTitle("PLUR1BUS")).not.toBe(canonicalMatchTitle("Pluribus"));
  });
  it("removes conflicting known years while retaining same and unknown years", () => {
    const candidates = [{ release_date: "2009-01-01" }, { release_date: "2017-01-01" }, { release_date: null }];
    expect(withoutConflictingYear(candidates, 2017)).toEqual(candidates.slice(1));
  });
});
