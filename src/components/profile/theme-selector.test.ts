import { createElement } from "react";
import { act, create } from "react-test-renderer";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  theme: "system" as "system" | "light" | "dark",
  setTheme: vi.fn((next: "system" | "light" | "dark") => {
    mocks.theme = next;
  }),
  updateThemePreference: vi.fn(async () => ({}) as { error?: string }),
}));

vi.mock("@/components/theme/theme-provider", () => ({
  useTheme: () => ({
    get theme() {
      return mocks.theme;
    },
    setTheme: mocks.setTheme,
  }),
}));

vi.mock("@/app/actions/profile", () => ({
  updateThemePreference: mocks.updateThemePreference,
}));

import { ThemeSelector } from "./theme-selector";

describe("ThemeSelector", () => {
  beforeEach(() => {
    mocks.theme = "system";
    mocks.setTheme.mockClear();
    mocks.updateThemePreference.mockReset();
    mocks.updateThemePreference.mockResolvedValue({});
  });

  it("applies theme immediately and persists asynchronously", async () => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    let renderer: ReturnType<typeof create> | undefined;
    await act(() => {
      renderer = create(createElement(ThemeSelector));
    });
    if (!renderer) throw new Error("ThemeSelector was not created.");

    const dark = renderer.root.findByProps({ id: "theme-dark" });
    await act(async () => {
      dark.props.onChange();
    });

    expect(mocks.setTheme).toHaveBeenCalledWith("dark");
    expect(mocks.updateThemePreference).toHaveBeenCalledWith("dark");
  });

  it("restores the previous theme and shows an error when persistence fails", async () => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    mocks.updateThemePreference.mockResolvedValue({
      error: "Theme could not be saved. Your previous selection was restored.",
    });

    let renderer: ReturnType<typeof create> | undefined;
    await act(() => {
      renderer = create(createElement(ThemeSelector));
    });
    if (!renderer) throw new Error("ThemeSelector was not created.");

    const light = renderer.root.findByProps({ id: "theme-light" });
    await act(async () => {
      light.props.onChange();
    });

    expect(mocks.setTheme.mock.calls).toEqual([["light"], ["system"]]);
    expect(renderer.root.findByProps({ role: "alert" }).children).toContain(
      "Theme could not be saved. Your previous selection was restored.",
    );
  });
});
