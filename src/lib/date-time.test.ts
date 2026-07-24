import { describe, expect, it } from "vitest";

import {
  addCalendarDays,
  dateInTimeZone,
  formatDateOnly,
  formatTimestamp,
  parseDateOnly,
  timestampToDateTimeLocal,
  dateTimeLocalToTimestamp,
} from "@/lib/date-time";

describe("calendar dates and timestamp instants", () => {
  const crossingMidnight = new Date("2026-07-15T01:00:00.000Z");

  it("derives today in positive and negative configured UTC offsets", () => {
    expect(dateInTimeZone(crossingMidnight, "Asia/Karachi")).toBe("2026-07-15");
    expect(dateInTimeZone(crossingMidnight, "America/Los_Angeles")).toBe("2026-07-14");
  });

  it("keeps today and tomorrow as calendar dates across a UTC boundary", () => {
    const today = dateInTimeZone(crossingMidnight, "America/Los_Angeles");
    expect(today).toBe("2026-07-14");
    expect(addCalendarDays(today, 1)).toBe("2026-07-15");
  });

  it("parses date-only values without treating them as timestamp instants", () => {
    expect(parseDateOnly("2026-03-08")).toEqual({ year: 2026, month: 3, day: 8 });
    expect(parseDateOnly("2026-02-30")).toBeNull();
    expect(parseDateOnly("2026-7-1")).toBeNull();
    expect(formatDateOnly("2026-07-15", { month: "long", day: "numeric" })).toBe("July 15");
  });

  it("formats watched timestamps in the configured timezone while preserving the instant", () => {
    const timestamp = "2026-07-15T01:00:00.000Z";
    expect(formatTimestamp(timestamp, "Asia/Karachi")).toContain("Jul 15, 2026");
    expect(formatTimestamp(timestamp, "America/Los_Angeles")).toContain("Jul 14, 2026");
  });

  it("round-trips datetime-local values through the configured timezone", () => {
    expect(timestampToDateTimeLocal("2026-01-02T03:04:00.000Z", "Asia/Karachi")).toBe("2026-01-02T08:04");
    expect(dateTimeLocalToTimestamp("2026-01-02T08:04", "Asia/Karachi")).toBe("2026-01-02T03:04:00.000Z");
    expect(timestampToDateTimeLocal("2026-07-15T01:00:00.000Z", "America/Los_Angeles")).toBe("2026-07-14T18:00");
    expect(dateTimeLocalToTimestamp("2026-07-14T18:00", "America/Los_Angeles")).toBe("2026-07-15T01:00:00.000Z");
  });

  it("rejects nonexistent DST wall times", () => {
    expect(dateTimeLocalToTimestamp("2026-03-08T02:30", "America/Los_Angeles")).toBeNull();
  });
});
