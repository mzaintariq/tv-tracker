import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/tmdb/endpoints", () => ({
  getMovieDetails: vi.fn(),
  getMovieReleaseDates: vi.fn(),
}));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));

import { synchronizeMovie } from "@/lib/movies/sync";
import { createAdminClient } from "@/lib/supabase/admin";
import { getMovieDetails, getMovieReleaseDates } from "@/lib/tmdb/endpoints";

const details = {
  id: 10,
  title: "Movie",
  overview: "",
  poster_path: null,
  backdrop_path: null,
  release_date: "2026-01-01",
};
const response = {
  id: 10,
  results: [{
    iso_3166_1: "PK",
    release_dates: [{ certification: "U", note: "", release_date: "2026-01-02T00:00:00Z", type: 3 }],
  }],
};

function adminMock(rpcError: { message: string } | null = null) {
  const single = vi.fn().mockResolvedValue({ data: { id: "media-1" }, error: null });
  const select = vi.fn(() => ({ single }));
  const upsert = vi.fn(() => ({ select }));
  const from = vi.fn(() => ({ upsert }));
  const rpc = vi.fn().mockResolvedValue({ error: rpcError });
  vi.mocked(createAdminClient).mockReturnValue({ from, rpc } as never);
  return { from, upsert, rpc };
}

describe("movie metadata synchronization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getMovieDetails).mockResolvedValue(details);
    vi.mocked(getMovieReleaseDates).mockResolvedValue(response);
  });

  it("inserts normalized rows and repeated synchronization is idempotent through reconciliation", async () => {
    const admin = adminMock();
    await expect(synchronizeMovie(10)).resolves.toEqual({
      mediaItemId: "media-1",
      releaseDatesSynchronized: true,
    });
    await synchronizeMovie(10);
    expect(admin.rpc).toHaveBeenCalledTimes(2);
    expect(admin.rpc).toHaveBeenLastCalledWith("reconcile_movie_release_dates", {
      p_media_item_id: "media-1",
      p_release_dates: [expect.objectContaining({ region: "PK", release_type: 3 })],
    });
  });

  it("preserves core success when the supplemental fetch fails", async () => {
    const admin = adminMock();
    const warning = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.mocked(getMovieReleaseDates).mockRejectedValue(new Error("provider detail"));
    await expect(synchronizeMovie(10)).resolves.toEqual({
      mediaItemId: "media-1",
      releaseDatesSynchronized: false,
    });
    expect(admin.rpc).not.toHaveBeenCalled();
    expect(warning).toHaveBeenCalledWith(
      "Movie supplemental metadata synchronization failed.",
      { category: "movie_release_dates", tmdbId: 10 },
    );
    warning.mockRestore();
  });

  it("does not mark reconciliation failure as successful", async () => {
    adminMock({ message: "database detail" });
    const warning = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    await expect(synchronizeMovie(10)).resolves.toMatchObject({
      releaseDatesSynchronized: false,
    });
    warning.mockRestore();
  });
});
