import { createElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { describe, expect, it, vi } from "vitest";
import type { MovieSnapshot } from "@/lib/movies/movies";
import type { MediaItem, UserMovie } from "@/types/database";

vi.mock("next/link", () => ({
  default: ({ children, ...props }: React.ComponentProps<"a">) =>
    createElement("a", props, children),
}));

import { MovieCard } from "./movie-card";

function movie(overrides: Partial<MediaItem> = {}): MovieSnapshot {
  return {
    membership: {
      id: "membership",
      user_id: "user",
      media_item_id: "media",
      watched_at: null,
      is_favourite: false,
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    } as UserMovie,
    media: {
      id: "media",
      tmdb_id: 10,
      title: "Example Movie",
      poster_path: null,
      release_date: "2025-06-01",
      genres: [{ id: 18, name: "Drama" }],
      vote_average: 7.84,
      ...overrides,
    } as MediaItem,
  };
}

async function renderMovieCard(snapshot: MovieSnapshot): Promise<ReactTestRenderer> {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  let renderer: ReactTestRenderer | undefined;
  await act(() => {
    renderer = create(createElement(MovieCard, { movie: snapshot }));
  });
  if (!renderer) throw new Error("Movie card did not render.");
  return renderer;
}

describe("MovieCard", () => {
  it("shows the primary genre and TMDB rating instead of watch state", async () => {
    const renderer = await renderMovieCard(movie());
    const rendered = JSON.stringify(renderer.toJSON());
    expect(rendered).toContain("2025 · Drama");
    expect(rendered).toContain("7.8");
    expect(rendered).not.toContain("Watch Next");
    expect(
      renderer.root.findByProps({
        "aria-label": "TMDB rating 7.8 out of 10",
      }),
    ).toBeTruthy();
  });

  it("omits unavailable genre and rating metadata", async () => {
    const renderer = await renderMovieCard(
      movie({ release_date: null, genres: [], vote_average: null }),
    );
    const rendered = JSON.stringify(renderer.toJSON());
    expect(rendered).toContain("Year unknown");
    expect(rendered).not.toContain("TMDB rating");
  });

  it("omits a zero TMDB rating", async () => {
    const renderer = await renderMovieCard(movie({ vote_average: 0 }));
    const rendered = JSON.stringify(renderer.toJSON());
    expect(rendered).not.toContain("TMDB rating");
    expect(rendered).not.toContain("0.0");
  });
});
