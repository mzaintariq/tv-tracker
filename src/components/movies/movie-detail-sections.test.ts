import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CreditsSection, ExternalLinksFact, ProvidersSection, TrailerSection } from "@/components/movies/movie-detail-sections";

describe("movie optional detail sections", () => {
  it("groups providers and retains attribution", async () => {
    const html = renderToStaticMarkup(await ProvidersSection({ regionLabel: "Pakistan (PK)", promise: Promise.resolve({ region: "PK", attributionLink: "https://example.com/watch", groups: { stream: [{ providerId: 1, providerName: "Stream One", logoPath: null, displayPriority: 1, category: "stream" }], free: [], ads: [], rent: [], buy: [] } }) }));
    expect(html).toContain("Stream One"); expect(html).toContain("JustWatch via TMDB");
  });
  it("renders valid empty and isolated failure states without raw errors", async () => {
    const empty = renderToStaticMarkup(await ProvidersSection({ regionLabel: "Pakistan (PK)", promise: Promise.resolve({ region: "PK", attributionLink: null, groups: { stream: [], free: [], ads: [], rent: [], buy: [] } }) }));
    expect(empty).toContain("No watch providers");
    const failed = renderToStaticMarkup(await ProvidersSection({ regionLabel: "Pakistan (PK)", promise: Promise.reject(new Error("secret raw provider error")) }));
    expect(failed).toContain("temporarily unavailable"); expect(failed).not.toContain("secret raw provider error");
  });
  it("renders directors and text-only top cast", async () => {
    const html = renderToStaticMarkup(await CreditsSection({ promise: Promise.resolve({ directors: [{ personId: 2, name: "Director Name" }], cast: [{ personId: 1, name: "Actor Name", character: "Hero", profilePath: "/portrait.jpg", order: 0 }] }) }));
    expect(html).toContain("Director Name"); expect(html).toContain("Actor Name"); expect(html).toContain("as Hero"); expect(html).not.toContain("<img");
  });
  it("uses one safe YouTube link without an iframe or thumbnail", async () => {
    const html = renderToStaticMarkup(await TrailerSection({ promise: Promise.resolve({ key: "abcdefgh", site: "YouTube", name: "Official Trailer", official: true, publishedAt: null }) }));
    expect(html).toContain("https://www.youtube.com/watch?v=abcdefgh"); expect(html).toContain('rel="noopener noreferrer"'); expect(html).not.toContain("iframe"); expect(html).not.toContain("img");
  });
  it("falls back to persisted trusted external links when optional loading fails", async () => {
    const html = renderToStaticMarkup(await ExternalLinksFact({ fallback: { tmdb: "https://www.themoviedb.org/movie/1", imdb: "https://www.imdb.com/title/tt1234567/", homepage: null }, promise: Promise.reject(new Error("raw")) }));
    expect(html).toContain("Open in"); expect(html).toContain(">TMDB<"); expect(html).toContain(">IMDb<"); expect(html).not.toContain("raw");
  });
});
