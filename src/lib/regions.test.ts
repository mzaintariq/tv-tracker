import { describe, expect, it } from "vitest";

import {
  isSupportedRegionCode,
  normalizeRegionCode,
  REGION_OPTIONS,
  regionDisplayName,
} from "@/lib/regions";

describe("regions", () => {
  it("normalizes valid two-letter codes to uppercase", () => {
    expect(normalizeRegionCode(" pk ")).toBe("PK");
  });

  it("rejects malformed and unsupported codes", () => {
    expect(normalizeRegionCode("USA")).toBeNull();
    expect(normalizeRegionCode("1A")).toBeNull();
    expect(isSupportedRegionCode("ZZ")).toBe(false);
    expect(isSupportedRegionCode("pk")).toBe(true);
  });

  it("looks up display names without changing the stored code", () => {
    expect(regionDisplayName("gb")).toBe("United Kingdom");
    expect(regionDisplayName("ZZ")).toBeNull();
  });

  it("keeps options deterministically sorted by country name", () => {
    const names = REGION_OPTIONS.map(({ name }) => name);
    expect(names).toEqual([...names].sort((left, right) => left.localeCompare(right)));
  });
});
