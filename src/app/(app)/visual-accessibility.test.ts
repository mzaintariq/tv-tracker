import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  contrastRatio,
  DARK_THEME,
  LIGHT_THEME,
  type ThemeTokens,
} from "@/lib/a11y/contrast";

const interactiveSources = [
  "src/components/explore/explore-toolbar.tsx",
  "src/components/shows/show-controls.tsx",
  "src/components/movies/movie-controls.tsx",
  "src/components/import/import-controls.tsx",
  "src/components/import/import-upload-form.tsx",
  "src/components/profile/profile-form.tsx",
  "src/components/profile/theme-selector.tsx",
  "src/components/auth/login-form.tsx",
] as const;

const touchTargetSources = [
  "src/components/explore/explore-toolbar.tsx",
  "src/components/explore/media-card.tsx",
  "src/components/shows/quick-episode-action.tsx",
  "src/components/shows/show-subnav.tsx",
  "src/components/shows/show-controls.tsx",
  "src/components/import/candidate-card.tsx",
  "src/components/import/import-controls.tsx",
  "src/components/ui/route-error-state.tsx",
] as const;

function expectTextContrast(theme: ThemeTokens, foreground: string, background: string, minimum = 4.5) {
  expect(contrastRatio(foreground, background)).toBeGreaterThanOrEqual(minimum);
}

function expectBoundaryContrast(theme: ThemeTokens, foreground: string, background: string, minimum = 3) {
  expect(contrastRatio(foreground, background)).toBeGreaterThanOrEqual(minimum);
}

describe("Phase 9D.4 visual accessibility contracts", () => {
  const css = readFileSync("src/app/globals.css", "utf8");

  it("defines a stronger interactive-boundary token and helper classes", () => {
    expect(css).toMatch(/--control-border:\s*#8a8274/);
    expect(css).toMatch(/\.dark\s*\{[\s\S]*--control-border:\s*#a89c88/);
    expect(css).toContain(".interactive-control");
    expect(css).toContain(".touch-target");
    expect(css).toContain("min-height: 2.75rem");
    expect(css).not.toContain("button {");
    expect(css).not.toContain("overflow-x-hidden");
  });

  it("keeps focus-visible distinguishable with offset and a contrasting backup ring", () => {
    expect(css).toMatch(/:focus-visible\s*\{[\s\S]*outline:\s*3px solid var\(--background\)/);
    expect(css).toMatch(/outline-offset:\s*2px/);
    expect(css).toMatch(/box-shadow:\s*0 0 0 5px var\(--foreground\)/);
  });

  it("keeps disabled controls identifiable without relying only on low opacity", () => {
    expect(css).toMatch(/\.interactive-control[\s\S]*:disabled[\s\S]*opacity:\s*1/);
    expect(css).toMatch(/:disabled:not\(\.interactive-control\)[\s\S]*opacity:\s*1/);
    expect(css).toMatch(/cursor:\s*not-allowed/);
  });

  it("disables non-essential progress interpolation under reduced motion", () => {
    expect(css).toMatch(/prefers-reduced-motion:\s*reduce[\s\S]*\.animate-pulse[\s\S]*animation:\s*none/);
    expect(css).toMatch(/prefers-reduced-motion:\s*reduce[\s\S]*\.progress-fill[\s\S]*transition:\s*none/);
  });

  it("applies interactive borders to prioritized inputs and secondary controls", () => {
    for (const path of interactiveSources) {
      const source = readFileSync(path, "utf8");
      expect(source, path).toContain("interactive-control");
    }
  });

  it("adds approximately 44px minimum hit areas to prioritized controls", () => {
    for (const path of touchTargetSources) {
      expect(readFileSync(path, "utf8"), path).toContain("touch-target");
    }
  });

  it("preserves Phase 9D.2 names and Phase 9D.3 one-column narrow grids", () => {
    expect(readFileSync("src/components/shows/show-controls.tsx", "utf8")).toContain("fieldset");
    expect(readFileSync("src/components/import/import-controls.tsx", "utf8")).toContain("Manual TMDB ID");
    expect(readFileSync("src/components/explore/media-grid.tsx", "utf8")).toContain("min-[360px]:grid-cols-2");
    expect(readFileSync("src/components/shows/watch-list-sections.tsx", "utf8")).toContain("grid-cols-1");
  });

  it.each([
    ["light", LIGHT_THEME],
    ["dark", DARK_THEME],
  ] as const)("meets contrast targets for touched %s theme tokens", (_name, theme) => {
    expectBoundaryContrast(theme, theme.controlBorder, theme.background);
    expectBoundaryContrast(theme, theme.controlBorder, theme.surface);
    expectBoundaryContrast(theme, theme.controlBorder, theme.surfaceElevated);
    expectBoundaryContrast(theme, theme.foreground, theme.background);
    expectBoundaryContrast(theme, theme.background, theme.accent);
    expectTextContrast(theme, theme.foreground, theme.background);
    expectTextContrast(theme, theme.muted, theme.background);
    expectTextContrast(theme, theme.muted, theme.surface);
    expectTextContrast(theme, theme.accentForeground, theme.accent);
    expectTextContrast(theme, theme.danger, theme.background);
    expectTextContrast(theme, theme.danger, theme.surface);
    expectTextContrast(theme, theme.success, theme.background);
    expectTextContrast(theme, theme.success, theme.surface);
    expectTextContrast(theme, theme.warning, theme.background);
    expectTextContrast(theme, theme.warning, theme.surface);
    expectBoundaryContrast(theme, theme.progressIncomplete, theme.surfaceElevated);
    expectBoundaryContrast(theme, theme.progressCaughtUp, theme.surfaceElevated);
    expectBoundaryContrast(theme, theme.progressComplete, theme.surfaceElevated);
    expectBoundaryContrast(theme, theme.accent, theme.surfaceElevated);
  });
});
