import { describe, expect, it } from "vitest";
import { parseCountries, showStatusSummary } from "@/lib/shows/detail";
import type { MediaItem } from "@/types/database";

describe("show detail facts", () => {
  it("prefers the stored TMDB status without inferring episode timing", () => {
    expect(showStatusSummary({ tmdb_status: "Returning Series", last_air_date: "2026-01-02" } as MediaItem)).toBe("Returning Series");
  });

  it("uses a last-air fallback and validates country codes", () => {
    expect(showStatusSummary({ tmdb_status: null, last_air_date: "2026-01-02" } as MediaItem)).toBe("Last aired on January 2, 2026");
    expect(parseCountries(["PK", "bad", 2, "US"])).toEqual(["PK", "US"]);
  });
});
