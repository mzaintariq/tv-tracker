import { createElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  updateTimeZonePreference: vi.fn(async (timeZone: string) => ({
    success: `Saved ${timeZone}`,
  })),
}));
vi.mock("@/app/actions/profile", () => ({
  updateTimeZonePreference: mocks.updateTimeZonePreference,
}));

import { TimeZoneSelector } from "@/components/profile/timezone-selector";

describe("TimeZoneSelector", () => {
  it("offers manual timezone saving", async () => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    let renderer: ReactTestRenderer | undefined;
    await act(() => {
      renderer = create(createElement(TimeZoneSelector, { currentTimeZone: "UTC" }));
    });
    if (!renderer) throw new Error("Timezone selector was not rendered.");

    const select = renderer.root.findByType("select");
    await act(() => select.props.onChange({ target: { value: "Asia/Karachi" } }));
    const save = renderer.root.findAllByType("button").find((button) =>
      button.children.includes("Save timezone"));
    if (!save) throw new Error("Save timezone button was not found.");
    await act(() => save.props.onClick());

    expect(mocks.updateTimeZonePreference).toHaveBeenCalledWith("Asia/Karachi");
    expect(renderer.root.findByProps({ role: "status" }).children.join("")).toContain("Saved");
  });
});
