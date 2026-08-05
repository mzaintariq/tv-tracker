import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const source = fs.readFileSync(path.join(process.cwd(), "src/app/(app)/movies/[tmdbId]/page.tsx"), "utf8");

describe("enriched movie detail page contract", () => {
  it("renders core hero facts and preserves tracking controls", () => {
    for (const contract of ["Genres", "TMDB rating", "Original language", "Library status", "MovieControls", "watchedAt", "is_favourite"]) expect(source).toContain(contract);
  });
  it("renders regional release facts without substituting the general release", () => {
    for (const contract of ["selectRegionalTheatricalDate", "selectRegionalDigitalDate", "selectRegionalMovieCertification", "Limited theatrical release", "Digital release", "Region"]) expect(source).toContain(contract);
  });
  it("starts four optional loaders and isolates them behind localized Suspense", () => {
    for (const loader of ["loadMovieCredits", "loadRegionalWatchProviders", "loadPreferredTrailer", "loadMovieExternalLinks"]) expect(source).toContain(loader);
    expect(source.match(/<Suspense/g)).toHaveLength(4);
  });
  it("keeps the page mobile-safe and within image guardrails", () => {
    expect(source).toContain("min-w-0"); expect(source).toContain("sm:grid-cols"); expect(source).toContain('tmdbSize="w500"');
    expect(source).not.toContain("backdrop_path"); expect(source).not.toContain("recommend");
  });
  it("uses the required vertical section order", () => {
    const markup = source.slice(source.indexOf("return ("));
    const labels = ["<header", "<MovieControls", "Overview", "Release information", "ProvidersSection", "CreditsSection", "TrailerSection", "Production information", "ExternalLinksSection"];
    let previous = -1; for (const label of labels) { const index = markup.indexOf(label); expect(index).toBeGreaterThan(previous); previous = index; }
  });
});
