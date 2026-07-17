import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const neutralizedRoutes = [
  "src/app/(app)/shows/page.tsx",
  "src/app/(app)/shows/upcoming/page.tsx",
  "src/app/(app)/movies/page.tsx",
  "src/app/(app)/movies/loading.tsx",
  "src/app/(app)/profile/import/page.tsx",
  "src/app/(app)/profile/import/loading.tsx",
  "src/app/(app)/profile/import/[importId]/page.tsx",
  "src/app/(app)/profile/import/[importId]/loading.tsx",
];

describe("Phase 9D.1 shell contracts", () => {
  it("keeps authenticated child routes neutral so the shared shell owns main", () => {
    for (const path of neutralizedRoutes) {
      expect(readFileSync(path, "utf8"), path).not.toMatch(/<main\b/i);
    }
  });

  it("defines visible focus, safe-area, and reduced-motion baselines", () => {
    const css = readFileSync("src/app/globals.css", "utf8");

    expect(css).toMatch(/\.skip-link\s*\{[\s\S]*position:\s*fixed/);
    expect(css).toMatch(/\.skip-link:focus-visible\s*\{[\s\S]*transform:\s*translateY\(0\)/);
    expect(css).toMatch(/:focus-visible\s*\{[\s\S]*outline:\s*3px solid var\(--accent\)/);
    expect(css).not.toMatch(/:focus(?:-visible)?[^{}]*\{[^{}]*outline:\s*none/);

    for (const inset of ["bottom", "left", "right"]) {
      expect(css).toContain(`env(safe-area-inset-${inset}, 0px)`);
    }
    expect(css).toMatch(/--mobile-nav-clearance:[\s\S]*var\(--mobile-nav-height\)[\s\S]*var\(--safe-area-bottom\)/);
    expect(css).toMatch(/\.app-main-content\s*\{[\s\S]*padding-bottom:\s*var\(--mobile-nav-clearance\)/);
    expect(css).toMatch(/\.mobile-bottom-nav\s*\{[\s\S]*padding-bottom:\s*var\(--safe-area-bottom\)/);
    expect(css).not.toContain("overflow-x-hidden");

    expect(css).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)/);
    expect(css).toMatch(/\.animate-pulse\s*\{[\s\S]*animation:\s*none/);
    expect(css).toMatch(/\[class\*="transition-"\][\s\S]*transition-duration:\s*0\.01ms/);
  });
});
