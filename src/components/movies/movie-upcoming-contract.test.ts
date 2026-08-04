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
  it("uses release rows instead of the poster grid", () => {
    const sections=read("src/components/movies/movie-upcoming-sections.tsx"); const row=read("src/components/movies/upcoming-movie-card.tsx");
    expect(sections).toContain('w-full'); expect(sections).not.toContain('max-w-3xl'); expect(sections).toContain('space-y-3'); expect(sections).not.toContain('sm:grid-cols-3');
    expect(row).toContain('grid-cols-[4rem_minmax(0,1fr)_3.75rem]'); expect(row).toContain('min-w-0');
  });
  it("keeps both statuses, full titles, and accessible countdown wording without synopsis", () => {
    const source=read("src/components/movies/upcoming-movie-card.tsx");
    expect(source).toContain("theatricalStatus"); expect(source).toContain("digitalStatus"); expect(source).toContain('title={movie.title}');
    expect(source).toContain("proximity.accessibleLabel"); expect(source).not.toMatch(/overview|synopsis|description/);
  });
  it("shows the accessible Watched badge only behind watched membership state", () => {
    const source=read("src/components/movies/upcoming-movie-card.tsx");
    expect(source).toContain("movie.watched_at ?"); expect(source).toContain(">Watched"); expect(source).toContain("already watched");
  });
  it("uses a row-shaped localized loading skeleton", () => {
    const loading=read("src/app/(app)/movies/(library)/upcoming/loading.tsx");
    expect(loading).toContain('data-skeleton-region="movie-release-list"'); expect(loading).toContain('grid-cols-[4rem_minmax(0,1fr)_3.75rem]'); expect(loading).not.toContain('sm:grid-cols-3');
  });
  it("does not alter the Movies Watch List poster sections", () => {
    expect(read("src/app/(app)/movies/(library)/page.tsx")).toContain("MovieSection");
    expect(read("src/components/movies/movie-sections.tsx")).toContain("MovieCard");
  });
  it("scopes the subnavigation away from movie detail routes", () => {
    expect(read("src/app/(app)/movies/(library)/layout.tsx")).toContain("MovieSubnav");
    expect(read("src/app/(app)/movies/[tmdbId]/page.tsx")).not.toContain("MovieSubnav");
    expect(read("src/app/(app)/movies/[tmdbId]/page.tsx")).toContain("loadMovieDetail");
  });
});
