import { createElement, type ComponentType } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import MoviesLoading from "./movies/loading";
import MovieDetailLoading from "./movies/[tmdbId]/loading";
import ProfileLoading from "./profile/loading";
import ImportLoading from "./profile/import/loading";
import ImportDetailLoading from "./profile/import/[importId]/loading";
import ShowDetailLoading from "./shows/[tmdbId]/loading";
import AppLoading from "./loading";
import ExploreLoading from "./explore/loading";
import ShowsLoading from "./shows/loading";
import UpcomingLoading from "./shows/upcoming/loading";

type LoadingContract = {
  name: string;
  component: ComponentType;
  announcement: string;
  regions: string[];
};

const routes: LoadingContract[] = [
  { name: "Movies", component: MoviesLoading, announcement: "Loading movies…", regions: ["heading", "movie-grid"] },
  { name: "Profile", component: ProfileLoading, announcement: "Loading profile…", regions: ["heading", "preferences", "account-tools", "statistics"] },
  { name: "Import list", component: ImportLoading, announcement: "Loading import…", regions: ["heading", "upload", "sessions", "cleanup"] },
  { name: "Import detail", component: ImportDetailLoading, announcement: "Loading import details…", regions: ["heading", "summary", "progress", "resolution"] },
  { name: "Show detail", component: ShowDetailLoading, announcement: "Loading show…", regions: ["poster-header", "tracking-setup", "episodes"] },
  { name: "Movie detail", component: MovieDetailLoading, announcement: "Loading movie…", regions: ["poster-header", "tracking-controls"] },
];

function markup(component: ComponentType): string {
  return renderToStaticMarkup(createElement(component));
}

describe("core route loading states", () => {
  it.each([
    { component: AppLoading, announcement: "Loading page…" },
    { component: ExploreLoading, announcement: "Loading Explore…" },
    { component: ShowsLoading, announcement: "Loading shows…" },
    { component: UpcomingLoading, announcement: "Loading upcoming episodes…" },
  ])("announces and hides decorative legacy skeletons", ({ component, announcement }) => {
    const html = markup(component);
    expect(html).toContain('role="status"');
    expect(html).toContain(announcement);
    expect(html).toContain('aria-hidden="true"');
  });

  it.each(routes)("renders an accessible, non-interactive $name state", ({ component, announcement, regions }) => {
    const html = markup(component);
    expect(html).toContain(`role="status"`);
    expect(html).toContain(announcement);
    expect(html).toContain('aria-hidden="true"');
    for (const region of regions) expect(html).toContain(`data-skeleton-region="${region}"`);
    expect(html).not.toMatch(/<(?:a|button|input|select|textarea)\b/i);
    expect(html).not.toMatch(/(?:[\w.+-]+@[\w.-]+|\b\d{4}-\d{2}-\d{2}\b|\.zip\b)/i);
  });

  it("reserves poster and responsive header structure for detail routes", () => {
    for (const component of [ShowDetailLoading, MovieDetailLoading]) {
      const html = markup(component);
      expect(html).toContain('data-skeleton-region="poster-header"');
      expect(html).toContain("aspect-[2/3]");
      expect(html).toContain("sm:grid-cols-[180px_minmax(0,1fr)]");
      expect(html).toContain("max-w-[180px]");
    }
  });

  it("uses static placeholders without motion-dependent animation", () => {
    for (const { component } of routes) expect(markup(component)).not.toContain("animate-");
  });
});
