import { createElement } from "react";
import { act, create } from "react-test-renderer";
import { describe, expect, it } from "vitest";

import { LimitedWatchListSection } from "./limited-watch-list-section";
import {
  formatSectionHeading,
  SECONDARY_SECTION_INITIAL_LIMIT,
} from "@/lib/shows/watch-list";

describe("watch list section controls", () => {
  it("formats headings with the full section count", () => {
    expect(formatSectionHeading("Watch Next", 14)).toBe("Watch Next · 14");
    expect(formatSectionHeading("Caught Up", 27)).toBe("Caught Up · 27");
  });

  it("shows the first 10 items and no disclosure at the limit", async () => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    const items = Array.from({ length: SECONDARY_SECTION_INITIAL_LIMIT }, (_, index) => `Item ${index + 1}`);
    let renderer: ReturnType<typeof create> | undefined;
    await act(() => {
      renderer = create(
        createElement(
          LimitedWatchListSection,
          {
            sectionId: "completed",
            title: "Completed",
            totalCount: items.length,
            listClassName: "grid",
          } as React.ComponentProps<typeof LimitedWatchListSection>,
          items.map((item) => createElement("li", { key: item }, item)),
        ),
      );
    });
    if (!renderer) throw new Error("missing renderer");
    const list = renderer.root.findByType("ul");
    expect(list.children).toHaveLength(SECONDARY_SECTION_INITIAL_LIMIT);
    expect(JSON.stringify(renderer.toJSON())).not.toContain("Show all");
  });

  it("limits to 10, expands to all, and collapses back while preserving order", async () => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    const items = Array.from({ length: 12 }, (_, index) => `Show ${String.fromCharCode(65 + index)}`);
    let renderer: ReturnType<typeof create> | undefined;
    await act(() => {
      renderer = create(
        createElement(
          LimitedWatchListSection,
          {
            sectionId: "paused",
            title: "Paused",
            totalCount: items.length,
            listClassName: "grid",
          } as React.ComponentProps<typeof LimitedWatchListSection>,
          items.map((item) => createElement("li", { key: item }, item)),
        ),
      );
    });
    if (!renderer) throw new Error("missing renderer");

    expect(JSON.stringify(renderer.toJSON())).toContain("Paused · 12");
    expect(renderer.root.findByType("ul").children).toHaveLength(10);
    expect(renderer.root.findByType("ul").findAllByType("li").map((node) => node.children[0])).toEqual(
      items.slice(0, 10),
    );

    const expand = renderer.root.findByType("button");
    expect(expand.props["aria-expanded"]).toBe(false);
    expect(expand.props["aria-controls"]).toEqual(expect.any(String));
    expect(expand.children).toContain("Show all 12");

    await act(() => expand.props.onClick());
    expect(renderer.root.findByType("ul").findAllByType("li").map((node) => node.children[0])).toEqual(items);
    expect(expand.props["aria-expanded"]).toBe(true);
    expect(expand.children).toContain("Show less");

    await act(() => expand.props.onClick());
    expect(renderer.root.findByType("ul").findAllByType("li").map((node) => node.children[0])).toEqual(
      items.slice(0, 10),
    );
    expect(expand.props["aria-expanded"]).toBe(false);
    expect(expand.children).toContain("Show all 12");
  });
});
