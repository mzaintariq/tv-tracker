import { createElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock("@/app/actions/library", () => ({ removeFromLibrary: vi.fn() }));
vi.mock("@/app/actions/shows", () => ({
  initializeShow: vi.fn(),
  markPreviousEpisodes: vi.fn(),
  setEpisodeWatched: vi.fn(),
  setSeasonWatched: vi.fn(),
  syncShowMetadata: vi.fn(),
  updateShowSettings: vi.fn(),
  updateWatchedDate: vi.fn(),
}));

import type { Episode, WatchedEpisode } from "@/types/database";
import { EpisodeControls, InitialProgressForm } from "./show-controls";

function episode(season: number, number: number): Episode {
  return { id: `${season}-${number}`, season_number: season, episode_number: number, title: `Episode ${number}`, air_date: "2020-01-01" } as Episode;
}

async function mount(element: React.ReactElement): Promise<ReactTestRenderer> {
  let renderer: ReactTestRenderer | undefined;
  await act(() => { renderer = create(element); });
  if (!renderer) throw new Error("Renderer unavailable.");
  return renderer;
}

beforeAll(() => { globalThis.IS_REACT_ACT_ENVIRONMENT = true; });

describe("show control accessibility", () => {
  it("uses a native named radio group and labelled mode-specific controls", async () => {
    const renderer = await mount(createElement(InitialProgressForm, { tmdbId: 42, episodes: [episode(0, 1), episode(1, 1), episode(2, 1)] }));
    const radios = renderer.root.findAllByProps({ type: "radio" });
    expect(new Set(radios.map((radio) => radio.props.name))).toEqual(new Set(["progress-mode-42"]));
    expect(renderer.root.findAllByType("fieldset")[0].findByType("legend").children).toContain("Starting progress");

    await act(() => radios[1].props.onChange());
    const select = renderer.root.findByType("select");
    expect(select.props.id).toBe("first-unwatched-42");
    expect(renderer.root.findByProps({ htmlFor: select.props.id }).children).toContain("Select the first unwatched episode");

    await act(() => renderer.root.findAllByProps({ type: "radio" })[2].props.onChange());
    const fieldsets = renderer.root.findAllByType("fieldset");
    expect(fieldsets).toHaveLength(2);
    expect(fieldsets[1].findByType("legend").children).toContain("Watched regular seasons");
    expect(fieldsets[1].findAllByProps({ type: "checkbox" })).toHaveLength(2);
  });

  it("gives repeated episode date controls contextual names and error hooks", async () => {
    const watched = { watched_at: "2026-01-02T03:04:00Z" } as WatchedEpisode;
    const renderer = await mount(createElement(EpisodeControls, { tmdbId: 42, mediaId: "media", episode: episode(2, 4), watched }));
    const input = renderer.root.findByProps({ type: "datetime-local" });
    expect(renderer.root.findByProps({ htmlFor: input.props.id }).children.join("")).toContain("S02E04");
    expect(renderer.root.findByProps({ "aria-label": "Save watched date for S02E04: Episode 4" })).toBeDefined();
  });
});
