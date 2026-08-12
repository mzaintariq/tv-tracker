import { createElement } from "react";
import { act, create } from "react-test-renderer";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  notify: vi.fn(),
  setEpisodeWatched: vi.fn(),
}));

vi.mock("@/app/actions/shows", () => ({
  setEpisodeWatched: mocks.setEpisodeWatched,
}));

vi.mock("@/components/ui/notifications", () => ({
  useNotifications: () => ({ notify: mocks.notify }),
}));

import { QuickEpisodeAction } from "./quick-episode-action";

describe("QuickEpisodeAction", () => {
  beforeEach(() => {
    mocks.notify.mockReset();
    mocks.setEpisodeWatched.mockReset();
  });

  it("routes success feedback through global notifications", async () => {
    mocks.setEpisodeWatched.mockResolvedValue({
      success: "Episode marked watched.",
    });
    let renderer: ReturnType<typeof create> | undefined;
    await act(() => {
      renderer = create(
        createElement(QuickEpisodeAction, {
          tmdbId: 42,
          mediaId: "11111111-1111-4111-8111-111111111111",
          episodeId: "22222222-2222-4222-8222-222222222222",
          watched: false,
        }),
      );
    });
    if (!renderer) throw new Error("missing renderer");

    await act(async () => {
      renderer?.root.findByType("button").props.onClick();
    });

    expect(mocks.setEpisodeWatched).toHaveBeenCalledWith(
      42,
      "11111111-1111-4111-8111-111111111111",
      "22222222-2222-4222-8222-222222222222",
      true,
    );
    expect(mocks.notify).toHaveBeenCalledWith(
      "Episode marked watched.",
      "success",
    );
    expect(renderer.root.findAllByProps({ role: "status" })).toHaveLength(0);
  });

  it("routes error feedback through global notifications", async () => {
    mocks.setEpisodeWatched.mockResolvedValue({
      error: "The show could not be updated. Please try again.",
    });
    let renderer: ReturnType<typeof create> | undefined;
    await act(() => {
      renderer = create(
        createElement(QuickEpisodeAction, {
          tmdbId: 42,
          mediaId: "11111111-1111-4111-8111-111111111111",
          episodeId: "22222222-2222-4222-8222-222222222222",
          watched: true,
        }),
      );
    });
    if (!renderer) throw new Error("missing renderer");

    await act(async () => {
      renderer?.root.findByType("button").props.onClick();
    });

    expect(mocks.notify).toHaveBeenCalledWith(
      "The show could not be updated. Please try again.",
      "error",
    );
    expect(renderer.root.findAllByProps({ role: "alert" })).toHaveLength(0);
  });
});
