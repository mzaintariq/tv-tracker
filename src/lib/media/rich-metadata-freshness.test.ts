import { describe, expect, it } from "vitest";
import { isRichMetadataStale, RICH_METADATA_FRESHNESS_MS } from "@/lib/media/rich-metadata-freshness";

describe("rich metadata freshness", () => {
  const now = new Date("2026-08-12T12:00:00.000Z");
  it("treats null and malformed legacy freshness as stale", () => {
    expect(isRichMetadataStale(null, now)).toBe(true);
    expect(isRichMetadataStale("invalid", now)).toBe(true);
  });
  it("is fresh until, but excluding, seven full days", () => {
    expect(isRichMetadataStale(new Date(now.getTime() - RICH_METADATA_FRESHNESS_MS + 1).toISOString(), now)).toBe(false);
    expect(isRichMetadataStale(new Date(now.getTime() - RICH_METADATA_FRESHNESS_MS).toISOString(), now)).toBe(true);
    expect(isRichMetadataStale(new Date(now.getTime() - RICH_METADATA_FRESHNESS_MS - 1).toISOString(), now)).toBe(true);
  });
});
