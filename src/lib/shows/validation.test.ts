import { describe, expect, it } from "vitest";
import { isShowStatus, parseInitialProgress, parseManualWatchedAt, parsePositiveInteger, parseUuid } from "@/lib/shows/validation";

describe("show action validation", () => {
  it("validates UUIDs and positive integers", () => { expect(parseUuid("550e8400-e29b-41d4-a716-446655440000")).not.toBeNull(); expect(parseUuid("bad")).toBeNull(); expect(parsePositiveInteger("2")).toBe(2); expect(parsePositiveInteger(0)).toBeNull(); });
  it("accepts historical timestamps and rejects future or invalid dates", () => { const now = new Date("2025-01-02T00:00:00Z"); expect(parseManualWatchedAt("2025-01-01T12:00:00Z", now)).toBe("2025-01-01T12:00:00.000Z"); expect(parseManualWatchedAt("2025-01-03", now)).toBeNull(); expect(parseManualWatchedAt("nope", now)).toBeNull(); });
  it("interprets datetime-local edits in the configured timezone", () => {
    const now = new Date("2026-01-03T00:00:00Z");
    expect(parseManualWatchedAt("2026-01-02T08:04", now, "Asia/Karachi")).toBe("2026-01-02T03:04:00.000Z");
  });
  it("only accepts tracking statuses", () => { expect(isShowStatus("paused")).toBe(true); expect(isShowStatus("completed")).toBe(false); });
  it("strictly validates mode-specific initial progress", () => {
    expect(parseInitialProgress({ mode: "start" })).toEqual({ mode: "start" });
    expect(parseInitialProgress({ mode: "start", seasonNumber: 1 })).toBeNull();
    expect(parseInitialProgress({ mode: "before_episode", seasonNumber: 2, episodeNumber: 3 })).toEqual({ mode: "before_episode", seasonNumber: 2, episodeNumber: 3 });
    expect(parseInitialProgress({ mode: "before_episode", seasonNumber: 0, episodeNumber: 3 })).toBeNull();
    expect(parseInitialProgress({ mode: "seasons", seasonNumbers: [1, 2] })).toEqual({ mode: "seasons", seasonNumbers: [1, 2] });
    expect(parseInitialProgress({ mode: "seasons", seasonNumbers: [1, 1] })).toBeNull();
    expect(parseInitialProgress({ mode: "seasons", seasonNumbers: [] })).toBeNull();
    expect(parseInitialProgress({ mode: null })).toBeNull();
  });
});
