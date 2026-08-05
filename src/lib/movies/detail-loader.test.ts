import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { loadMovieDetail } from "@/lib/movies/data";
import type { MovieSnapshot } from "@/lib/movies/movies";

function detail(syncedAt: string | null): MovieSnapshot {
  return { media: { id: "media", tmdb_id: 10, media_type: "movie", rich_metadata_synced_at: syncedAt } as MovieSnapshot["media"], membership: { id: "membership" } as MovieSnapshot["membership"] };
}

describe("movie rich metadata lazy synchronization", () => {
  it("refreshes a legacy row and reloads it in the same request", async () => {
    const legacy = detail(null), refreshed = detail("2026-08-05T12:00:00.000Z");
    const load = vi.fn().mockResolvedValueOnce(legacy).mockResolvedValueOnce(refreshed);
    const synchronize = vi.fn().mockResolvedValue({ mediaItemId: "media", releaseDatesSynchronized: true });
    await expect(loadMovieDetail("user", 10, { load, synchronize }, new Date("2026-08-05T12:00:00.000Z"))).resolves.toBe(refreshed);
    expect(synchronize).toHaveBeenCalledWith(10); expect(load).toHaveBeenCalledTimes(2);
  });
  it("does not synchronize a fresh row", async () => {
    const fresh = detail("2026-08-05T12:00:00.000Z"), synchronize = vi.fn();
    await expect(loadMovieDetail("user", 10, { load: vi.fn().mockResolvedValue(fresh), synchronize }, new Date("2026-08-06T12:00:00.000Z"))).resolves.toBe(fresh);
    expect(synchronize).not.toHaveBeenCalled();
  });
  it("retains cached detail and stale freshness after failure", async () => {
    const legacy = detail(null);
    await expect(loadMovieDetail("user", 10, { load: vi.fn().mockResolvedValue(legacy), synchronize: vi.fn().mockRejectedValue(new Error("raw")) })).resolves.toBe(legacy);
    expect(legacy.media.rich_metadata_synced_at).toBeNull();
  });
});
