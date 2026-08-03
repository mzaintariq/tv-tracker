import { createElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  updateRegionPreference: vi.fn(
    async (region: string): Promise<{ success?: string; error?: string }> => ({
      success: `Saved ${region}`,
    }),
  ),
}));

vi.mock("@/app/actions/profile", () => ({
  updateRegionPreference: mocks.updateRegionPreference,
}));

import { RegionSelector } from "@/components/profile/region-selector";

describe("RegionSelector", () => {
  it("associates its label and help text and shows the null placeholder", async () => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    let renderer: ReactTestRenderer | undefined;
    await act(() => {
      renderer = create(createElement(RegionSelector, { currentRegion: null }));
    });
    if (!renderer) throw new Error("Region selector was not rendered.");

    const select = renderer.root.findByType("select");
    expect(select.props.id).toBe("profile-region");
    expect(select.props["aria-describedby"]).toBe("profile-region-help");
    expect(select.props.value).toBe("");
    expect(renderer.root.findByType("label").props.htmlFor).toBe("profile-region");
    expect(renderer.root.findAllByType("option")[0]?.children).toContain("Choose a region");
  });

  it("selects the current value and saves a new region with local success feedback", async () => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    let renderer: ReactTestRenderer | undefined;
    await act(() => {
      renderer = create(createElement(RegionSelector, { currentRegion: "PK" }));
    });
    if (!renderer) throw new Error("Region selector was not rendered.");

    const select = renderer.root.findByType("select");
    expect(select.props.value).toBe("PK");
    await act(() => select.props.onChange({ target: { value: "CH" } }));
    const save = renderer.root.findByType("button");
    await act(() => save.props.onClick());

    expect(mocks.updateRegionPreference).toHaveBeenCalledWith("CH");
    expect(renderer.root.findByProps({ role: "status" }).children.join("")).toContain("Saved CH");
  });

  it("renders safe failures as an associated invalid-state alert", async () => {
    mocks.updateRegionPreference.mockResolvedValueOnce({ error: "Region could not be saved. Please try again." });
    let renderer: ReactTestRenderer | undefined;
    await act(() => {
      renderer = create(createElement(RegionSelector, { currentRegion: "PK" }));
    });
    if (!renderer) throw new Error("Region selector was not rendered.");

    const select = renderer.root.findByType("select");
    await act(() => select.props.onChange({ target: { value: "US" } }));
    await act(() => renderer?.root.findByType("button").props.onClick());

    expect(renderer.root.findByType("select").props["aria-invalid"]).toBe(true);
    expect(renderer.root.findByType("select").props["aria-describedby"]).toContain("profile-region-error");
    expect(renderer.root.findByProps({ role: "alert" }).children.join("")).not.toContain("database");
  });
});
