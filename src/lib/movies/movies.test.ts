import { describe, expect, it } from "vitest";
import {
  deriveMovieSections,
  RECENTLY_WATCHED_MOVIES_LIMIT,
  type MovieSnapshot,
} from "@/lib/movies/movies";
import type { MediaItem, UserMovie } from "@/types/database";

function movie(
  title: string,
  watchedAt: string | null = null,
  favourite = false,
  createdAt = "2026-01-01T00:00:00Z",
  releaseDate: string | null = null,
): MovieSnapshot {
  return {
    membership: {
      id: `membership-${title}`,
      user_id: "user",
      media_item_id: `media-${title}`,
      watched_at: watchedAt,
      is_favourite: favourite,
      created_at: createdAt,
      updated_at: createdAt,
    } as UserMovie,
    media: {
      id: `media-${title}`,
      tmdb_id: title.length,
      media_type: "movie",
      title,
      release_date: releaseDate,
    } as MediaItem,
  };
}

describe("movie section derivation", () => {
  it("derives primary states while allowing favourite overlap", () => {
    const result = deriveMovieSections([
      movie("Next", null, true),
      movie("Seen", "2026-01-02T00:00:00Z", true),
    ]);
    expect(result.watchNext.map((item) => item.media.title)).toEqual(["Next"]);
    expect(result.watched.map((item) => item.media.title)).toEqual(["Seen"]);
    expect(result.favourites.map((item) => item.media.title)).toEqual([
      "Next",
      "Seen",
    ]);
  });

  it("splits unwatched movies by the general date-only release date", () => {
    const result = deriveMovieSections([
      movie("Future B", null, false, "2026-01-04T00:00:00Z", "2026-08-20"),
      movie("Future A", null, false, "2026-01-03T00:00:00Z", "2026-08-10"),
      movie("Today", null, false, "2026-01-02T00:00:00Z", "2026-08-04"),
      movie("Past", null, false, "2026-01-01T00:00:00Z", "2026-08-03"),
      movie("Missing"),
      movie("Watched Future", "2026-08-01T00:00:00Z", false, "2026-01-05T00:00:00Z", "2026-08-30"),
    ], "2026-08-04");
    expect(result.upcoming.map((item) => item.media.title)).toEqual(["Future A","Future B"]);
    expect(result.watchNext.map((item) => item.media.title)).toEqual(["Today","Missing","Past"]);
    expect(result.watched.map((item) => item.media.title)).toEqual(["Watched Future"]);
    expect(result.watchNext.filter((item) => result.upcoming.includes(item))).toEqual([]);
  });

  it("sorts deterministically and limits recently watched", () => {
    const rows = Array.from(
      { length: RECENTLY_WATCHED_MOVIES_LIMIT + 2 },
      (_, index) =>
        movie(
          `Movie ${String(index).padStart(2, "0")}`,
          `2026-01-${String(index + 1).padStart(2, "0")}T00:00:00Z`,
        ),
    );
    const result = deriveMovieSections(rows);
    expect(result.recentlyWatched).toHaveLength(RECENTLY_WATCHED_MOVIES_LIMIT);
    expect(result.recentlyWatched[0].media.title).toBe("Movie 11");
  });
});
