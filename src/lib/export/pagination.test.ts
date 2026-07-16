import { describe, expect, it } from "vitest";
import { loadExportPages, mapWithConcurrency, uniqueChunks } from "@/lib/export/pagination";

describe("export paging and bounded metadata work", () => {
  it("pages at 500 rows beyond 1,000 and handles an exact-full final page", async () => {
    const source = Array.from({ length: 1_500 }, (_, id) => ({ id }));
    const calls: Array<[number, number]> = [];
    const rows = await loadExportPages(async (from, to) => { calls.push([from, to]); return { data: source.slice(from, to + 1), error: null }; });
    expect(rows).toHaveLength(1_500);
    expect(calls).toEqual([[0, 499], [500, 999], [1000, 1499], [1500, 1999]]);
  });

  it("deduplicates IDs into 200-item chunks", () => {
    const ids = [...Array.from({ length: 401 }, (_, index) => `id-${index}`), "id-0", "id-200"];
    expect(uniqueChunks(ids).map((chunk) => chunk.length)).toEqual([200, 200, 1]);
  });

  it("never exceeds concurrency four and keeps input order", async () => {
    let active = 0; let maximum = 0;
    const results = await mapWithConcurrency(Array.from({ length: 20 }, (_, index) => index), 4, async (item) => {
      active += 1; maximum = Math.max(maximum, active);
      await Promise.resolve(); active -= 1; return item * 2;
    });
    expect(maximum).toBe(4);
    expect(results).toEqual(Array.from({ length: 20 }, (_, index) => index * 2));
  });

  it("rejects a failed page without returning partial data", async () => {
    await expect(loadExportPages(async (from) => from === 0 ? { data: Array.from({ length: 500 }, (_, id) => ({ id })), error: null } : { data: null, error: new Error("private detail") })).rejects.toThrow("Export data could not be loaded.");
  });
});
