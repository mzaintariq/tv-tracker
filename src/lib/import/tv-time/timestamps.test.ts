import { describe, expect, it } from "vitest";
import { parseTvTimeTimestamp } from "./timestamps";

describe("TV Time timestamps", () => {
  it("prefers legacy epoch seconds", () => expect(parseTvTimeTimestamp("1609459200", "2024-01-01 00:00:00")).toEqual({ instant: "2021-01-01T00:00:00.000Z", source: "legacy_watch_date_epoch" }));
  it("interprets timezone-less created_at as UTC", () => expect(parseTvTimeTimestamp("", "2024-06-02 03:04:05")).toEqual({ instant: "2024-06-02T03:04:05.000Z", source: "created_at_assumed_utc" }));
  it("rejects malformed values", () => expect(() => parseTvTimeTimestamp("", "not-a-date")).toThrow("invalid timestamp"));
});
