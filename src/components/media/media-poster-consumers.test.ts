import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const consumers = [
  ["src/components/explore/media-card.tsx", "50vw"],
  ["src/components/shows/show-card.tsx", "50vw"],
  ["src/components/movies/movie-card.tsx", "50vw"],
  ["src/components/shows/watch-list-sections.tsx", 'sizes="120px"'],
  ["src/components/shows/upcoming-sections.tsx", 'sizes="80px"'],
  ["src/components/import/candidate-card.tsx", 'sizes="64px"'],
  ["src/components/import/import-issues-disclosure.tsx", 'sizes="46px"'],
  ["src/app/(app)/shows/[tmdbId]/page.tsx", 'sizes="180px"'],
  ["src/app/(app)/movies/[tmdbId]/page.tsx", 'sizes="180px"'],
] as const;

describe("MediaPoster consumers", () => {
  it.each(consumers)("uses the shared poster without changing the sizing contract in %s", (path, sizing) => {
    const source = readFileSync(path, "utf8");
    expect(source).toContain("<MediaPoster");
    expect(source).toContain(sizing);
    expect(source).not.toContain('from "next/image"');
  });

  it("keeps detail routes as server components", () => {
    for (const path of consumers.slice(-2).map(([value]) => value)) {
      expect(readFileSync(path, "utf8")).not.toContain('"use client"');
    }
  });

  it("preserves neutral import fallbacks and decorative alt intent", () => {
    for (const path of ["src/components/import/candidate-card.tsx", "src/components/import/import-issues-disclosure.tsx"]) {
      const source = readFileSync(path, "utf8");
      expect(source).toContain('fallbackLabel="No poster"');
      expect(source).toContain('alt=""');
    }
  });

  it("uses decorative posters beside visible card titles and decorative favourite glyphs", () => {
    for (const path of ["src/components/explore/media-card.tsx", "src/components/shows/show-card.tsx", "src/components/movies/movie-card.tsx"]) {
      expect(readFileSync(path, "utf8")).toContain('alt=""');
    }
    for (const path of ["src/components/shows/show-card.tsx", "src/components/movies/movie-card.tsx"]) {
      const source = readFileSync(path, "utf8");
      expect(source).toContain('aria-hidden="true"');
      expect(source).toContain('className="sr-only"');
    }
  });
});
