import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const posterConsumers = [
  "src/components/explore/media-card.tsx",
  "src/components/movies/movie-card.tsx",
  "src/components/shows/show-card.tsx",
  "src/components/shows/watch-list-sections.tsx",
  "src/components/shows/upcoming-sections.tsx",
  "src/components/profile/statistics-summary.tsx",
] as const;

describe("poster interaction polish", () => {
  it("uses the shared interactive poster surface in each poster-card context", () => {
    for (const path of posterConsumers) {
      expect(readFileSync(path, "utf8"), path).toContain(
        "poster-interactive-surface",
      );
    }
  });

  it("capability-gates hover and provides press, focus-visible, and reduced-motion states", () => {
    const css = readFileSync("src/app/globals.css", "utf8");
    expect(css).toContain("@media (hover: hover) and (pointer: fine)");
    expect(css).toContain(".poster-interactive-surface:hover");
    expect(css).toContain("scale(1.02)");
    expect(css).toContain(".poster-interactive-surface:active");
    expect(css).toContain("scale(0.98)");
    expect(css).toContain(".poster-interactive-surface:focus-visible");
    expect(css).toMatch(
      /@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.poster-interactive-surface[\s\S]*?transform: none !important/,
    );
  });

  it("shares a 44px overlay treatment while preserving accessible action names", () => {
    const explore = readFileSync("src/components/explore/media-card.tsx", "utf8");
    const movieAction = readFileSync(
      "src/components/movies/quick-mark-movie-watched.tsx",
      "utf8",
    );
    for (const source of [explore, movieAction]) {
      expect(source).toContain("poster-overlay-action");
      expect(source).toContain("touch-target");
      expect(source).toContain("h-11 w-11");
      expect(source).toContain("aria-label=");
      expect(source).toContain("aria-busy=");
      expect(source).toContain('aria-hidden="true"');
    }
  });

  it("keeps overlay buttons as siblings after poster links", () => {
    const explore = readFileSync("src/components/explore/media-card.tsx", "utf8");
    const movie = readFileSync("src/components/movies/movie-card.tsx", "utf8");
    expect(explore).toMatch(/<Link[\s\S]*?<\/Link>[\s\S]*?\)}\s*<button/);
    expect(movie).toMatch(/<\/Link>\{action \? <div/);
    expect(explore).toContain("absolute right-2 top-2 z-10");
    expect(movie).toContain("absolute right-2 top-2 z-10");
  });

  it("preserves the Profile rail and Movies overflow contracts", () => {
    const profile = readFileSync(
      "src/components/profile/statistics-summary.tsx",
      "utf8",
    );
    const movies = readFileSync(
      "src/components/movies/movie-sections.tsx",
      "utf8",
    );
    expect(profile).toContain("flex w-full min-w-0");
    expect(profile).toContain("overflow-x-auto");
    expect(profile).toContain("shrink-0");
    expect(movies).toContain("grid-cols-1");
    expect(movies).toContain("min-[360px]:grid-cols-2");
    expect(readFileSync("src/app/globals.css", "utf8")).not.toContain(
      "overflow-x-hidden",
    );
  });
});
