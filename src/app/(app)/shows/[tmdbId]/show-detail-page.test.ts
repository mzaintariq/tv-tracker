import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const page = readFileSync("src/app/(app)/shows/[tmdbId]/page.tsx", "utf8");

describe("enriched show detail page contract", () => {
  it("uses native URL-backed views with an accessible selected state", () => {
    expect(page).toContain('type View = "overview" | "episodes"');
    expect(page).toContain("requestedView === \"episodes\"");
    expect(page).toContain('aria-current={selected ? "page" : undefined}');
    expect(page).toContain("<Link");
  });

  it("keeps non-members in the existing setup-first episode experience", () => {
    expect(page).toContain('!detail.membership ? "episodes"');
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
    expect(page).toContain('className="break-words text-sm sm:text-base">{detail.media.overview}');
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

  it("stays within scope and image policy", () => {
    expect(page).toContain('tmdbSize="w500"');
    expect(page).not.toMatch(/backdrop_path|recommend|release time/i);
    expect(page.match(/<MediaPoster/g)).toHaveLength(1);
  });
});
