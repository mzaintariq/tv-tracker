import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
const read = (path: string) => readFileSync(path, "utf8");
describe("Movies Upcoming route contract", () => {
  it("has URL-backed accessible navigation and localized states", () => {
    const nav=read("src/components/movies/movie-subnav.tsx");
    expect(nav).toContain('href: "/movies/upcoming"'); expect(nav).toContain('aria-current'); expect(nav).toContain("sticky");
    expect(read("src/app/(app)/movies/(library)/upcoming/loading.tsx")).toContain('role="status"');
    expect(read("src/app/(app)/movies/(library)/upcoming/error.tsx")).toContain("reset={reset}");
  });
  it("prompts for explicit region and does not fall back to a general release date", () => {
    const page=read("src/app/(app)/movies/(library)/upcoming/page.tsx"); const data=read("src/lib/movies/upcoming-data.ts");
    expect(page).toContain("Choose a release and streaming region"); expect(page).toContain("/profile/settings");
    expect(data).not.toContain("release_date:"); expect(data).not.toContain('?? "US"');
  });
  it("uses a 320px-safe one-column grid", () => expect(read("src/components/movies/movie-upcoming-sections.tsx")).toContain('grid-cols-1'));
  it("scopes the subnavigation away from movie detail routes", () => {
    expect(read("src/app/(app)/movies/(library)/layout.tsx")).toContain("MovieSubnav");
    expect(read("src/app/(app)/movies/[tmdbId]/page.tsx")).not.toContain("MovieSubnav");
    expect(read("src/app/(app)/movies/[tmdbId]/page.tsx")).toContain("loadMovieDetail");
  });
});
