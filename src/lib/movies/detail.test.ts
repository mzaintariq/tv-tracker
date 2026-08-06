import { describe, expect, it } from "vitest";
import { formatVoteCount, languageDisplayName, movieReleaseStatuses, parseNamedFacts } from "@/lib/movies/detail";

describe("movie detail persisted facts", () => {
  it("parses only validated named projections", () => {
    expect(parseNamedFacts([{ id: 2, name: " Drama " }, { id: 0, name: "Bad" }, { name: "Missing" }, null])).toEqual([{ id: 2, name: "Drama" }]);
  });
  it("formats language and rating counts safely", () => {
    expect(languageDisplayName("en")).toBe("English"); expect(languageDisplayName(null)).toBeNull(); expect(formatVoteCount(1200)).toMatch(/1.2K/i);
  });
});

describe("compact regional release status", () => {
  const status = (theatrical: { release_date: string; release_type: number } | null, digital: { release_date: string } | null) => movieReleaseStatuses({ today: "2026-08-05", theatrical, digital });
  it("distinguishes future, today, and past theatrical dates", () => {
    expect(status({ release_date: "2026-08-06", release_type: 3 }, null)[0]).toBe("Coming to theatres");
    expect(status({ release_date: "2026-08-05", release_type: 3 }, null)[0]).toBe("In theatres today");
    expect(status({ release_date: "2026-08-04", release_type: 3 }, null)[0]).toBe("Released in theatres");
  });
  it("distinguishes limited theatrical state", () => {
    expect(status({ release_date: "2026-08-06", release_type: 2 }, null)[0]).toBe("Limited theatrical release upcoming");
    expect(status({ release_date: "2026-08-05", release_type: 2 }, null)[0]).toBe("Limited theatrical release today");
    expect(status({ release_date: "2026-08-04", release_type: 2 }, null)[0]).toBe("Limited theatrical release has begun");
  });
  it("distinguishes digital states and missing dates", () => {
    expect(status(null, { release_date: "2026-08-06" })).toEqual(["Digital release upcoming"]);
    expect(status(null, { release_date: "2026-08-05" })).toEqual(["Digital release today"]);
    expect(status(null, { release_date: "2026-08-04" })).toEqual(["Released digitally"]);
    expect(status(null, null)).toEqual(["Digital date not announced"]);
  });
});
