import { createElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { describe, expect, it, vi } from "vitest";
import type { ShowCardData } from "@/lib/shows/data";

vi.mock("next/link", () => ({
  default: ({ children, ...props }: React.ComponentProps<"a">) =>
    createElement("a", props, children),
}));

import { ShowCard } from "./show-card";

function show(overrides: Partial<ShowCardData["media"]> = {}): ShowCardData {
  return {
    membership: {
      id: "membership",
      user_id: "user",
      media_item_id: "media",
      status: "active",
      is_favourite: false,
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    },
    media: {
      id: "media",
      tmdb_id: 10,
      title: "Example Show",
      poster_path: null,
      release_date: "2025-06-01",
      tmdb_status: "Returning Series",
      genres: [{ id: 18, name: "Drama" }],
      vote_average: 7.84,
      ...overrides,
    },
    progress: { watched: 2, total: 4, percentage: 50, state: "partial" },
  };
}

async function renderShowCard(data: ShowCardData): Promise<ReactTestRenderer> {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  let renderer: ReactTestRenderer | undefined;
  await act(() => {
    renderer = create(createElement(ShowCard, { show: data }));
  });
  if (!renderer) throw new Error("Show card did not render.");
  return renderer;
}

describe("ShowCard", () => {
  it("shows primary genre and rating instead of tracking status", async () => {
    const renderer = await renderShowCard(show());
    const rendered = JSON.stringify(renderer.toJSON());
    expect(rendered).toContain("2025 · Drama");
    expect(rendered).toContain("7.8");
    expect(rendered).not.toContain('"children":["active"]');
    expect(
      renderer.root.findByProps({
        "aria-label": "TMDB rating 7.8 out of 10",
      }),
    ).toBeTruthy();
  });

  it("omits missing genre and zero rating", async () => {
    const renderer = await renderShowCard(
      show({ release_date: null, genres: [], vote_average: 0 }),
    );
    const rendered = JSON.stringify(renderer.toJSON());
    expect(rendered).toContain("Year unknown");
    expect(rendered).not.toContain("TMDB rating");
    expect(rendered).not.toContain("0.0");
  });
});
