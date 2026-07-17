import { describe, expect, it, vi } from "vitest";
import { buildLibraryKeys, EXPLORE_LIBRARY_PAGE_SIZE, ExploreLibraryReadError, loadLibraryPages, mediaIdChunks, requireLibraryRows, type LibraryMediaRow, type MembershipMediaRow } from "./library-state";

const show: MembershipMediaRow = { media_item_id: "show-id" };
const movie: MembershipMediaRow = { media_item_id: "movie-id" };
const media: LibraryMediaRow[] = [
  { id: "show-id", tmdb_id: 10, media_type: "tv" },
  { id: "movie-id", tmdb_id: 20, media_type: "movie" },
];

describe("Explore library reads", () => {
  it("handles a completely empty library without issuing media-ID work", () => {
    expect(mediaIdChunks([], [])).toEqual([]);
    expect(buildLibraryKeys([], [], [])).toEqual(new Set());
  });

  it("handles show-only, movie-only, and combined memberships", () => {
    expect(buildLibraryKeys([show], [], [media[0]])).toEqual(new Set(["tv:10"]));
    expect(buildLibraryKeys([], [movie], [media[1]])).toEqual(new Set(["movie:20"]));
    expect(buildLibraryKeys([show], [movie], media)).toEqual(new Set(["tv:10", "movie:20"]));
  });

  it("allows one membership collection to be empty without dropping the other", () => {
    expect(mediaIdChunks([show], [])).toEqual([["show-id"]]);
    expect(mediaIdChunks([], [movie])).toEqual([["movie-id"]]);
  });

  it("deduplicates and bounds media lookup filters", () => {
    const rows = Array.from({ length: 401 }, (_, index) => ({ media_item_id: `id-${index}` }));
    const chunks = mediaIdChunks([...rows, rows[0]], []);
    expect(chunks.map((chunk) => chunk.length)).toEqual([200, 200, 1]);
    expect(new Set(chunks.flat()).size).toBe(401);
  });

  it("paginates memberships instead of accepting a truncated first page", async () => {
    const first = Array.from({ length: EXPLORE_LIBRARY_PAGE_SIZE }, (_, index) => ({ media_item_id: `id-${index}` }));
    const fetchPage = vi.fn().mockResolvedValueOnce({ data: first, error: null }).mockResolvedValueOnce({ data: [{ media_item_id: "last" }], error: null });
    const rows = await loadLibraryPages("user_shows", fetchPage);
    expect(rows).toHaveLength(EXPLORE_LIBRARY_PAGE_SIZE + 1);
    expect(fetchPage).toHaveBeenNthCalledWith(2, EXPLORE_LIBRARY_PAGE_SIZE, EXPLORE_LIBRARY_PAGE_SIZE * 2 - 1);
  });

  it.each(["user_shows", "user_movies", "media_items"] as const)("keeps a genuine %s failure visible", (stage) => {
    expect(() => requireLibraryRows({ data: null, error: { message: "private raw error" } }, stage)).toThrow(ExploreLibraryReadError);
    try { requireLibraryRows({ data: null, error: {} }, stage); } catch (error) { expect((error as ExploreLibraryReadError).stage).toBe(stage); }
  });

  it("accepts successful empty database arrays", () => {
    expect(requireLibraryRows({ data: [], error: null }, "user_shows")).toEqual([]);
  });

  it("rejects missing required media instead of corrupting membership indicators", () => {
    expect(() => buildLibraryKeys([show], [movie], [media[0]])).toThrow(ExploreLibraryReadError);
  });

  it("produces keys used by search and trending membership indicators", () => {
    const keys = buildLibraryKeys([show], [movie], media);
    expect(keys.has("tv:10")).toBe(true);
    expect(keys.has("movie:20")).toBe(true);
    expect(keys.has("tv:20")).toBe(false);
  });
});
