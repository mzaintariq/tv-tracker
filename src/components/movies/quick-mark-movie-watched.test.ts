import { createElement } from "react";
import { act, create } from "react-test-renderer";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  setMovieWatched: vi.fn(async () => ({ success: "Movie marked watched." }) as { error?: string; success?: string }),
  refresh: vi.fn(),
  now: "2026-07-15T12:00:00.000Z",
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mocks.refresh }),
}));

vi.mock("@/app/actions/movies", () => ({
  setMovieWatched: mocks.setMovieWatched,
}));

import { QuickMarkMovieWatched } from "./quick-mark-movie-watched";

describe("QuickMarkMovieWatched", () => {
  beforeEach(() => {
    mocks.setMovieWatched.mockReset();
    mocks.setMovieWatched.mockResolvedValue({ success: "Movie marked watched." });
    mocks.refresh.mockReset();
    vi.spyOn(Date.prototype, "toISOString").mockReturnValue(mocks.now);
  });

  it("marks watched with the current timestamp and refreshes on success", async () => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    let renderer: ReturnType<typeof create> | undefined;
    await act(() => {
      renderer = create(
        createElement(QuickMarkMovieWatched, {
          title: "Arrival",
          tmdbId: 42,
          mediaId: "11111111-1111-4111-8111-111111111111",
        }),
      );
    });
    if (!renderer) throw new Error("missing renderer");

    const button = renderer.root.findByType("button");
    expect(button.props["aria-label"]).toBe("Mark Arrival as watched");
    expect(button.props["aria-busy"]).toBe(false);

    await act(async () => {
      button.props.onClick();
    });

    expect(mocks.setMovieWatched).toHaveBeenCalledWith(
      42,
      "11111111-1111-4111-8111-111111111111",
      true,
      mocks.now,
    );
    expect(mocks.refresh).toHaveBeenCalledOnce();
  });

  it("shows pending state and prevents duplicate submissions", async () => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    let resolveAction: ((value: { success: string }) => void) | undefined;
    mocks.setMovieWatched.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveAction = resolve;
        }),
    );

    let renderer: ReturnType<typeof create> | undefined;
    await act(() => {
      renderer = create(
        createElement(QuickMarkMovieWatched, {
          title: "Dune",
          tmdbId: 7,
          mediaId: "22222222-2222-4222-8222-222222222222",
        }),
      );
    });
    if (!renderer) throw new Error("missing renderer");

    const button = renderer.root.findByType("button");
    await act(() => {
      button.props.onClick();
    });
    expect(button.props.disabled).toBe(true);
    expect(button.props["aria-busy"]).toBe(true);

    await act(() => {
      button.props.onClick();
    });
    expect(mocks.setMovieWatched).toHaveBeenCalledOnce();

    await act(async () => {
      resolveAction?.({ success: "Movie marked watched." });
    });
  });

  it("surfaces error feedback without refreshing", async () => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    mocks.setMovieWatched.mockResolvedValue({
      error: "The movie could not be updated. Please try again.",
    });

    let renderer: ReturnType<typeof create> | undefined;
    await act(() => {
      renderer = create(
        createElement(QuickMarkMovieWatched, {
          title: "Fail",
          tmdbId: 9,
          mediaId: "33333333-3333-4333-8333-333333333333",
        }),
      );
    });
    if (!renderer) throw new Error("missing renderer");

    await act(async () => {
      renderer?.root.findByType("button").props.onClick();
    });

    expect(mocks.refresh).not.toHaveBeenCalled();
    expect(renderer.root.findByProps({ role: "alert" }).children).toContain(
      "The movie could not be updated. Please try again.",
    );
  });
});
