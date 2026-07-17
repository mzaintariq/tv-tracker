import { createElement } from "react";
import { act, create } from "react-test-renderer";
import { describe, expect, it, vi } from "vitest";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

import { ExploreEmptyState, ExploreErrorState } from "./explore-states";

describe("Explore result states", () => {
  it("offers a working retry action for safe failures", async () => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    let renderer: ReturnType<typeof create> | undefined;
    await act(() => { renderer = create(createElement(ExploreErrorState, { message: "Something went wrong while loading Explore." })); });
    if (!renderer) throw new Error("Explore-state renderer was not created.");
    const mounted = renderer;
    await act(() => mounted.root.findByType("button").props.onClick());
    expect(refresh).toHaveBeenCalledOnce();
  });

  it("keeps a genuine zero-result search as an empty state", async () => {
    let renderer: ReturnType<typeof create> | undefined;
    await act(() => { renderer = create(createElement(ExploreEmptyState, { query: "Nothing" })); });
    if (!renderer) throw new Error("Explore empty-state renderer was not created.");
    const mounted = renderer;
    expect(mounted.root.findAllByType("button")).toHaveLength(0);
    expect(mounted.root.findAllByType("p")[0]?.children.join("")).toContain("No results");
  });
});
