import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const page = readFileSync("src/app/(app)/shows/[tmdbId]/page.tsx", "utf8");
const tabs = readFileSync(
  "src/components/shows/show-detail-tabs.tsx",
  "utf8",
);

describe("enriched show detail page contract", () => {
  it("uses native URL-backed views with an accessible selected state", () => {
    expect(tabs).toContain('type ShowDetailView = "episodes" | "overview"');
    expect(page).toContain('requestedView === "overview"');
    expect(tabs).toContain('aria-current={selected ? "page" : undefined}');
    expect(tabs).toContain("<a");
  });

  it("puts Episodes first, defaults safely to it, and underlines selection", () => {
    expect(page).toContain(': "episodes";');
    const navigation = tabs.slice(tabs.indexOf('aria-label="Show detail views"'));
    expect(navigation.indexOf('view="episodes"')).toBeLessThan(
      navigation.indexOf('view="overview"'),
    );
    expect(tabs).toContain("border-b-2");
    expect(tabs).toContain('border-[var(--accent)]');
    expect(tabs).toContain("grid-cols-2");
    expect(tabs).toContain("w-full");
    expect(tabs).toContain("sm:w-auto");
    expect(tabs).not.toContain('selected ? "bg-[var(--accent)]');
  });

  it("switches views locally while preserving URL history and scroll", () => {
    expect(tabs).toContain("event.preventDefault()");
    expect(tabs).toContain("window.history.pushState");
    expect(tabs).toContain('window.addEventListener("popstate"');
    expect(tabs).toContain("setView(nextView)");
    expect(tabs).toContain('hidden={view !== "episodes"}');
    expect(tabs).toContain('hidden={view !== "overview"}');
  });

  it("keeps non-members in the existing setup-first episode experience", () => {
    expect(page).toContain('requestedView === "overview" && detail.membership');
    expect(page).toContain(': "episodes";');
    expect(page).toContain("<InitialProgressForm");
    expect(page).toContain("defaultOpenRegularSeason");
    expect(page).toContain("<EpisodeControls");
    expect(page).toContain("<SeasonControls");
  });

  it("renders rich hero facts and starts isolated optional overview loaders", () => {
    for (const contract of ["Genres", "TMDB rating", "average_episode_runtime_minutes", "loadTvRegionalCertification", "loadRegionalWatchProviders", "loadTvTopCast", "loadPreferredTrailer", "loadTvExternalLinks"]) expect(page).toContain(contract);
    expect(page.match(/<Suspense/g)).toHaveLength(4);
  });

  it("matches the movie-detail mobile hero rhythm and keeps synopsis in the hero", () => {
    expect(page).toContain('className="min-w-0 space-y-2 sm:space-y-4"');
    expect(page).toMatch(
      /className="break-words text-sm sm:text-base"[\s\S]*?detail\.media\.overview/,
    );
    expect(page).toContain('className="flex min-w-0 flex-wrap gap-1 sm:gap-2"');
    expect(page).not.toContain(">Synopsis<");
  });

  it("pairs trailer with rating and networks with show status", () => {
    const trailerRow = page.slice(
      page.indexOf('<div className="min-w-0 text-sm flex flex-wrap'),
      page.indexOf("{networks.length || statusSummary"),
    );
    expect(trailerRow).toContain("ShowTrailerSection");
    expect(trailerRow).toContain("TMDB rating");
    const networkRow = page.slice(page.indexOf("{networks.length || statusSummary"));
    expect(networkRow).toContain("Networks");
    expect(networkRow).toContain("statusSummary");
  });

  it("places progress under networks and groups show actions in one panel", () => {
    const hero = page.slice(
      page.indexOf("{networks.length || statusSummary"),
      page.indexOf('aria-label="Show tracking actions"'),
    );
    expect(hero).toContain("<ProgressBar");
    const panel = page.slice(
      page.indexOf('aria-label="Show tracking actions"'),
      page.indexOf("<ShowDetailTabs"),
    );
    expect(panel).not.toContain("<ProgressBar");
    expect(panel).toContain("<SettingsControls");
    expect(panel).toContain("<MetadataButton");
    expect(panel).toContain('className="absolute"');
    expect(panel).toContain("rounded-xl border");
    expect(panel).toContain("bg-[var(--surface)]");
    expect(panel).toContain("p-3 sm:p-6");
  });

  it("uses overview-scale spacing and typography for episodes on mobile", () => {
    const episodes = page.slice(page.indexOf("function Episodes"));
    expect(episodes).toContain("space-y-4 sm:space-y-6");
    expect(episodes).toContain("text-lg font-semibold sm:text-xl");
    expect(episodes).toContain("text-xs text-[var(--muted)] sm:text-sm");
    expect(episodes).toContain("p-3 sm:space-y-3 sm:p-4");
    expect(episodes).toContain("text-sm font-semibold sm:text-base");
  });

  it("clips watched backgrounds and keeps the badge at the title row end", () => {
    const episodes = page.slice(page.indexOf("function Episodes"));
    expect(episodes).toContain("overflow-hidden divide-y");
    expect(episodes).toContain("items-start justify-between gap-2");
    expect(episodes).toContain("inline-flex shrink-0 rounded-full");
  });

  it("stays within scope and image policy", () => {
    expect(page).toContain('tmdbSize="w500"');
    expect(page).not.toMatch(/backdrop_path|recommend|release time/i);
    expect(page.match(/<MediaPoster/g)).toHaveLength(1);
  });
});
