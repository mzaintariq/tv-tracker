import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const narrowGridSources = [
  "src/components/explore/media-grid.tsx",
  "src/components/explore/explore-states.tsx",
  "src/components/shows/watch-list-sections.tsx",
  "src/components/movies/movie-sections.tsx",
  "src/components/profile/statistics-summary.tsx",
] as const;

const shrinkSources = [
  "src/components/explore/media-card.tsx",
  "src/components/shows/show-card.tsx",
  "src/components/movies/movie-card.tsx",
  "src/components/shows/watch-list-sections.tsx",
  "src/components/shows/upcoming-sections.tsx",
  "src/components/import/candidate-card.tsx",
  "src/components/import/import-controls.tsx",
  "src/app/(app)/shows/[tmdbId]/page.tsx",
  "src/app/(app)/movies/[tmdbId]/page.tsx",
] as const;

const datetimeSources = [
  "src/components/shows/show-controls.tsx",
  "src/components/movies/movie-controls.tsx",
] as const;

describe("Phase 9D.3 mobile layout contracts", () => {
  it("uses a single-column media grid below very narrow widths", () => {
    for (const path of narrowGridSources) {
      const source = readFileSync(path, "utf8");
      expect(source, path).toContain("grid-cols-1");
      expect(source, path).toContain("min-[360px]:grid-cols-2");
    }
  });

  it("lets flex and grid children shrink instead of forcing overflow", () => {
    for (const path of shrinkSources) {
      expect(readFileSync(path, "utf8"), path).toContain("min-w-0");
    }
  });

  it("keeps datetime-local controls inside their containers", () => {
    for (const path of datetimeSources) {
      const source = readFileSync(path, "utf8");
      expect(source, path).toContain('type="datetime-local"');
      expect(source, path).toMatch(/datetime-local[\s\S]*?className="[^"]*min-w-0[^"]*max-w-full/);
    }
  });

  it("bounds detail posters and allows detail text columns to shrink", () => {
    for (const path of [
      "src/app/(app)/shows/[tmdbId]/page.tsx",
      "src/app/(app)/movies/[tmdbId]/page.tsx",
    ]) {
      const source = readFileSync(path, "utf8");
      expect(source, path).toContain("max-w-[180px]");
      expect(source, path).toContain("sm:grid-cols-[180px_minmax(0,1fr)]");
      expect(source, path).toContain("break-words");
    }
  });

  it("does not hide horizontal overflow globally", () => {
    expect(readFileSync("src/app/globals.css", "utf8")).not.toContain("overflow-x-hidden");
  });
});
