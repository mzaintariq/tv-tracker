import { describe, expect, it } from "vitest";
import { deriveMovieSections, RECENTLY_WATCHED_MOVIES_LIMIT, type MovieSnapshot } from "@/lib/movies/movies";
import type { MediaItem, UserMovie } from "@/types/database";

function movie(title: string, watchedAt: string | null = null, favourite = false, createdAt = "2026-01-01T00:00:00Z"): MovieSnapshot {
  return {
    membership: { id: `membership-${title}`, user_id: "user", media_item_id: `media-${title}`, watched_at: watchedAt, is_favourite: favourite, created_at: createdAt, updated_at: createdAt } as UserMovie,
    media: { id: `media-${title}`, tmdb_id: title.length, media_type: "movie", title } as MediaItem,
  };
}

describe("movie section derivation", () => {
  it("derives primary states while allowing favourite overlap", () => {
    const result = deriveMovieSections([movie("Next", null, true), movie("Seen", "2026-01-02T00:00:00Z", true)]);
    expect(result.watchNext.map((item) => item.media.title)).toEqual(["Next"]);
    expect(result.watched.map((item) => item.media.title)).toEqual(["Seen"]);
    expect(result.favourites.map((item) => item.media.title)).toEqual(["Next", "Seen"]);
  });

  it("sorts deterministically and limits recently watched", () => {
    const rows = Array.from({ length: RECENTLY_WATCHED_MOVIES_LIMIT + 2 }, (_, index) => movie(`Movie ${String(index).padStart(2, "0")}`, `2026-01-${String(index + 1).padStart(2, "0")}T00:00:00Z`));
    const result = deriveMovieSections(rows);
    expect(result.recentlyWatched).toHaveLength(RECENTLY_WATCHED_MOVIES_LIMIT);
    expect(result.recentlyWatched[0].media.title).toBe("Movie 11");
  });
});
