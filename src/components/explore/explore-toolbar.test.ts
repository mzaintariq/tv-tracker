import { createElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, describe, expect, it, vi } from "vitest";

const replace = vi.fn();
vi.mock("next/navigation", () => ({
  usePathname: () => "/explore",
  useRouter: () => ({ replace }),
  useSearchParams: () => new URLSearchParams("type=all&q=hom"),
}));

import { ExploreToolbar } from "@/components/explore/explore-toolbar";

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  replace.mockReset();
});

describe("ExploreToolbar query ordering", () => {
  it("retains the newest input and hides an older response that resolves last", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("window", {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      setTimeout,
      clearTimeout,
    });
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    let renderer: ReactTestRenderer | undefined;
    await act(() => {
      renderer = create(createElement(
        ExploreToolbar,
        { filter: "all", query: "hom" },
        createElement("p", null, "results for hom"),
      ));
    });
    if (!renderer) throw new Error("Toolbar renderer was not created.");

    const input = renderer.root.findByType("input");
    await act(() => input.props.onChange({ target: { value: "home alone" } }));
    await act(() => {
      vi.advanceTimersByTime(350);
    });
    expect(replace).toHaveBeenLastCalledWith("/explore?type=all&q=home+alone");

    await act(() => {
      renderer?.update(createElement(
        ExploreToolbar,
        { filter: "all", query: "hom" },
        createElement("p", null, "stale results"),
      ));
    });
    expect(renderer.root.findByType("input").props.value).toBe("home alone");
    expect(renderer.root.findAllByProps({ children: "stale results" })).toHaveLength(0);

    await act(() => {
      renderer?.update(createElement(
        ExploreToolbar,
        { filter: "all", query: "home alone" },
        createElement("p", null, "latest results"),
      ));
    });
    expect(renderer.root.findByType("input").props.value).toBe("home alone");
    expect(renderer.root.findAllByProps({ children: "latest results" })).toHaveLength(1);
  });
});
