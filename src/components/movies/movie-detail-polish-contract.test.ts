import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const movieControls = readFileSync("src/components/movies/movie-controls.tsx", "utf8");
const showControls = readFileSync("src/components/shows/show-controls.tsx", "utf8");
const refresh = readFileSync("src/components/media/metadata-refresh-control.tsx", "utf8");
const page = readFileSync("src/app/(app)/movies/[tmdbId]/page.tsx", "utf8");
const env = readFileSync(".env.example", "utf8");

describe("movie detail polish contracts", () => {
  it("reuses one top-only touch and desktop-wheel refresh implementation", () => {
    expect(movieControls).toContain("MetadataRefreshControl");
    expect(showControls).toContain("MetadataRefreshControl");
    expect(refresh).toContain('addEventListener("touchstart"');
    expect(refresh).toContain('addEventListener("wheel"');
    expect(refresh).toContain("wheelEligible.current");
    expect(refresh).toContain("window.scrollY <= 0");
    expect(refresh).toContain("startsInsideHorizontalScroller");
    expect(refresh).toContain("inFlight.current");
    expect(refresh).toContain("router.refresh()");
  });
  it("removes the prominent movie refresh command but retains the trusted action", () => {
    expect(movieControls).toContain("refreshAction={syncMovieMetadata}");
    expect(movieControls).not.toContain(">Refresh Metadata<");
    expect(showControls).not.toContain(">Refresh Metadata<");
    expect(refresh).toContain("notify(");
    expect(refresh).not.toContain("result?.success");
  });
  it("does not fabricate or configure IMDb or Rotten Tomatoes ratings", () => {
    expect(page).toContain("TMDB rating");
    expect(page).not.toMatch(/IMDb rating|Rotten Tomatoes|OMDb/);
    expect(env).not.toMatch(/OMDB|IMDB|ROTTEN|RATINGS_API/i);
  });
  it("does not relabel the broad TMDB date as regional theatrical", () => {
    const general = page.slice(page.indexOf("const generalRelease"), page.indexOf("const releaseStatuses"));
    expect(general).not.toContain("theatrical");
    expect(page).toContain("selectRegionalTheatricalDate");
  });
  it("keeps compact wrapping actions and no new image roles", () => {
    expect(movieControls).toContain("flex-col gap-2 sm:flex-row sm:flex-wrap");
    expect(movieControls).toContain("w-full max-w-full");
    expect(movieControls).toContain("sm:w-auto");
    expect(movieControls).toContain("bg-[var(--surface)]");
    expect(movieControls).toContain("cursor-pointer");
    expect(movieControls).toContain("touch-target");
    expect(movieControls).not.toMatch(/<Image|<img/);
  });
});
