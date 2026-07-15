import { describe, expect, it } from "vitest";
import { loadAllPages } from "@/lib/profile/pagination";

describe("paginated profile loading", () => {
  it("continues until a short page and does not truncate at 1,000 rows", async () => {
    const source = Array.from({ length: 1205 }, (_, id) => ({ id }));
    const calls: Array<[number, number]> = [];
    const result = await loadAllPages(async (from, to) => { calls.push([from, to]); return { data: source.slice(from, to + 1), error: null }; });
    expect(result).toHaveLength(1205);
    expect(calls).toEqual([[0, 499], [500, 999], [1000, 1499]]);
  });
});
