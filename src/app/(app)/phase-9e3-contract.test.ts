import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Phase 9E.3 UI contracts", () => {
  it("keeps Explore results as serializable server-rendered children and replaces them while pending", () => {
    const page = readFileSync("src/app/(app)/explore/page.tsx", "utf8");
    const toolbar = readFileSync("src/components/explore/explore-toolbar.tsx", "utf8");
    expect(page).toContain("<ExploreToolbar");
    expect(page).toContain("<MediaGrid items={data.items} />");
    expect(toolbar).toContain("children: ReactNode");
    expect(toolbar).toContain("aria-busy={isPending}");
    expect(toolbar).toContain("Loading results…");
    expect(toolbar).not.toMatch(/renderItems|ComponentType/);
  });

  it("uses native season disclosures and keeps season actions inside collapsed content", () => {
    const showPage = readFileSync("src/app/(app)/shows/[tmdbId]/page.tsx", "utf8");
    expect(showPage).toContain("<details");
    expect(showPage).toContain("<summary");
    expect(showPage.indexOf("<SeasonControls")).toBeGreaterThan(showPage.indexOf("</summary>"));
    expect(showPage).toContain("watchedCount");
  });

  it("uses a 16px mobile search font and bounded date input wrappers", () => {
    const toolbar = readFileSync("src/components/explore/explore-toolbar.tsx", "utf8");
    expect(toolbar).toContain("text-base");
    for (const path of ["src/components/shows/show-controls.tsx", "src/components/movies/movie-controls.tsx"]) {
      const controls = readFileSync(path, "utf8");
      expect(controls).toContain("w-full min-w-0 max-w-full");
      expect(controls).toContain("sm:w-auto");
      expect(controls).toContain('type="datetime-local"');
    }
  });
});
