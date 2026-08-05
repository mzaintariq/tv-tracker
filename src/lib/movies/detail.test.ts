import { describe, expect, it } from "vitest";
import { formatVoteCount, languageDisplayName, parseNamedFacts } from "@/lib/movies/detail";

describe("movie detail persisted facts", () => {
  it("parses only validated named projections", () => {
    expect(parseNamedFacts([{ id: 2, name: " Drama " }, { id: 0, name: "Bad" }, { name: "Missing" }, null])).toEqual([{ id: 2, name: "Drama" }]);
  });
  it("formats language and rating counts safely", () => {
    expect(languageDisplayName("en")).toBe("English"); expect(languageDisplayName(null)).toBeNull(); expect(formatVoteCount(1200)).toMatch(/1.2K/i);
  });
});
