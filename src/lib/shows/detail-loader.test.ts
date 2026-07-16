import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { loadShowPageData } from "@/lib/shows/detail-loader";
import { TmdbApiError } from "@/lib/tmdb/client";
import type { ShowDetailData } from "@/lib/shows/data";

const detail = (membership: ShowDetailData["membership"] = null): ShowDetailData => ({
  membership,
  media: { id: "media", tmdb_id: 254528, media_type: "tv", title: "Test Show" } as ShowDetailData["media"],
  episodes: [{ id: "episode", season_number: 1, episode_number: 1 } as ShowDetailData["episodes"][number]],
  watched: [],
});

describe("loadShowPageData", () => {
  it("loads a valid uncached TMDB show for the setup screen", async () => {
    const resolved = detail();
    const load = vi.fn().mockResolvedValueOnce(null).mockResolvedValueOnce(resolved);
    await expect(loadShowPageData("user", 254528, { load, synchronize: vi.fn().mockResolvedValue({}) })).resolves.toMatchObject({ detail: resolved, tmdbNotFound: false });
  });

  it("uses a locally cached show with episodes", async () => {
    const synchronize = vi.fn();
    await loadShowPageData("user", 254528, { load: vi.fn().mockResolvedValue(detail()), synchronize });
    expect(synchronize).not.toHaveBeenCalled();
  });

  it("preserves existing library membership", async () => {
    const membership = { id: "membership" } as ShowDetailData["membership"];
    const result = await loadShowPageData("user", 254528, { load: vi.fn().mockResolvedValue(detail(membership)), synchronize: vi.fn() });
    expect(result.detail?.membership).toBe(membership);
  });

  it("recovers a metadata row written during failed prefetch synchronization", async () => {
    const recovered = { ...detail(), episodes: [] };
    const load = vi.fn().mockResolvedValueOnce(null).mockResolvedValueOnce(recovered);
    const result = await loadShowPageData("user", 254528, { load, synchronize: vi.fn().mockRejectedValue(new Error("episodes failed")) });
    expect(result).toMatchObject({ detail: recovered, tmdbNotFound: false, syncError: expect.any(String) });
  });

  it("returns not found for a genuine TMDB 404", async () => {
    const result = await loadShowPageData("user", 999999, { load: vi.fn().mockResolvedValue(null), synchronize: vi.fn().mockRejectedValue(new TmdbApiError("missing", 404)) });
    expect(result.tmdbNotFound).toBe(true);
  });

  it("does not disguise metadata write failures as not found", async () => {
    const failure = new Error("metadata write failed");
    await expect(loadShowPageData("user", 254528, { load: vi.fn().mockResolvedValue(null), synchronize: vi.fn().mockRejectedValue(failure) })).rejects.toBe(failure);
  });
});
