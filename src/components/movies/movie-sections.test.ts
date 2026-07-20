import { readFileSync } from "node:fs";
import { createElement } from "react";
import { act, create } from "react-test-renderer";
import { describe, expect, it, vi } from "vitest";
import type { MovieSnapshot } from "@/lib/movies/movies";
import type { MediaItem, UserMovie } from "@/types/database";

vi.mock("@/components/movies/movie-card", () => ({
  MovieCard: ({ movie, action }: { movie: MovieSnapshot; action?: React.ReactNode }) => createElement("span", { "data-movie-title": movie.media.title }, movie.media.title, action),
}));

vi.mock("@/components/movies/quick-mark-movie-watched", () => ({
  QuickMarkMovieWatched: ({ title }: { title: string }) => createElement("button", { type: "button", "aria-label": `Mark ${title} watched` }, "Mark watched"),
}));

import { MovieSection } from "./movie-sections";

function movie(index: number): MovieSnapshot {
  const title = `Movie ${String(index).padStart(2, "0")}`;
  const createdAt = "2026-01-01T00:00:00Z";
  return {
    membership: { id: `membership-${index}`, user_id: "user", media_item_id: `media-${index}`, watched_at: null, is_favourite: false, created_at: createdAt, updated_at: createdAt } as UserMovie,
    media: { id: `media-${index}`, tmdb_id: index, media_type: "movie", title, poster_path: null, release_date: null } as MediaItem,
  };
}

async function renderLimitedSection(title: "Watch Next" | "Watched", count: number) {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  let renderer: ReturnType<typeof create> | undefined;
  await act(() => {
    renderer = create(createElement(MovieSection, {
      title,
      movies: Array.from({ length: count }, (_, index) => movie(index + 1)),
      limitInitially: true,
      quickMarkWatched: title === "Watch Next",
    }));
  });
  if (!renderer) throw new Error("missing renderer");
  return renderer;
}

describe("limited movie sections", () => {
  it.each(["Watch Next", "Watched"] as const)("limits Movie %s to 10, expands, and restores order on collapse", async (title) => {
    const renderer = await renderLimitedSection(title, 12);
    const expected = Array.from({ length: 12 }, (_, index) => `Movie ${String(index + 1).padStart(2, "0")}`);
    const visibleTitles = () => renderer.root.findAll((node) => typeof node.props["data-movie-title"] === "string").map((node) => node.props["data-movie-title"] as string);

    expect(JSON.stringify(renderer.toJSON())).toContain(`${title} · 12`);
    expect(visibleTitles()).toEqual(expected.slice(0, 10));
    const toggle = renderer.root.findAllByType("button").find((button) => button.children.includes("Show all 12"));
    if (!toggle) throw new Error("missing disclosure button");
    expect(toggle.props["aria-expanded"]).toBe(false);
    expect(toggle.props["aria-controls"]).toEqual(expect.any(String));

    await act(() => toggle.props.onClick());
    expect(visibleTitles()).toEqual(expected);
    expect(toggle.children).toContain("Show less");

    await act(() => toggle.props.onClick());
    expect(visibleTitles()).toEqual(expected.slice(0, 10));
    expect(toggle.children).toContain("Show all 12");
  });

  it.each([8, 10])("does not render a disclosure for %s movies", async (count) => {
    const renderer = await renderLimitedSection("Watched", count);
    expect(renderer.root.findAll((node) => typeof node.props["data-movie-title"] === "string")).toHaveLength(count);
    expect(JSON.stringify(renderer.toJSON())).not.toContain("Show all");
  });

  it("keeps quick Mark watched actions in the limited Watch Next items", async () => {
    const renderer = await renderLimitedSection("Watch Next", 12);
    expect(renderer.root.findAllByType("button").filter((button) => button.children.includes("Mark watched"))).toHaveLength(10);
  });

  it("composes server-rendered children without render-function or component props", () => {
    const source = readFileSync("src/components/movies/movie-sections.tsx", "utf8");
    expect(source).toContain("<LimitedWatchListSection");
    expect(source).toContain("{items}");
    expect(source).not.toMatch(/renderItems|renderMovie|component:/i);
  });
});
