import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ShowCreditsSection, ShowExternalLinks, ShowProvidersSection, ShowTrailerSection } from "@/components/shows/show-detail-sections";

const emptyGroups = { stream: [], free: [], ads: [], rent: [], buy: [] };

describe("show optional detail sections", () => {
  it("groups regional providers and retains attribution", async () => {
    const html = renderToStaticMarkup(await ShowProvidersSection({ regionLabel: "Pakistan (PK)", promise: Promise.resolve({ region: "PK", attributionLink: "https://example.com/watch", groups: { ...emptyGroups, stream: [{ providerId: 1, providerName: "Stream One", logoPath: null, displayPriority: 1, category: "stream" }] } }) }));
    expect(html).toContain("Pakistan (PK)"); expect(html).toContain("Stream One"); expect(html).toContain("JustWatch via TMDB"); expect(html).toContain("overflow-x-auto"); expect(html).toContain("whitespace-nowrap"); expect(html).toContain("<svg"); expect(html).not.toContain("img");
  });

  it("treats empty providers as valid and hides raw failures", async () => {
    const empty = renderToStaticMarkup(await ShowProvidersSection({ regionLabel: "Pakistan (PK)", promise: Promise.resolve({ region: "PK", attributionLink: null, groups: emptyGroups }) }));
    expect(empty).toContain("No watch providers");
    const failure = renderToStaticMarkup(await ShowProvidersSection({ regionLabel: "Pakistan (PK)", promise: Promise.reject(new Error("raw secret")) }));
    expect(failure).toContain("temporarily unavailable"); expect(failure).not.toContain("raw secret");
  });

  it("keeps creators distinct and caps imagery to text-only cast", async () => {
    const html = renderToStaticMarkup(await ShowCreditsSection({ creators: [{ id: 2, name: "Creator Name" }], promise: Promise.resolve([{ personId: 1, name: "Actor Name", character: "Hero", profilePath: "/unused.jpg", order: 0 }]) }));
    expect(html).toContain("Creator Name"); expect(html).toContain("Actor Name"); expect(html).toContain("as Hero"); expect(html).not.toContain("<img");
  });

  it("renders safe click-through trailer and trusted fallback links", async () => {
    const trailer = renderToStaticMarkup(await ShowTrailerSection({ promise: Promise.resolve({ key: "abcdefgh", site: "YouTube", name: "Official Trailer", official: true, publishedAt: null }) }));
    expect(trailer).toContain("youtube.com/watch?v=abcdefgh"); expect(trailer).not.toMatch(/iframe|img/);
    const links = renderToStaticMarkup(await ShowExternalLinks({ fallback: { tmdb: "https://www.themoviedb.org/tv/1", imdb: "https://www.imdb.com/title/tt1234567/", homepage: null }, promise: Promise.reject(new Error("raw")) }));
    expect(links).toContain("Open in"); expect(links).toContain(">TMDB<"); expect(links).toContain(">IMDb<"); expect(links).not.toContain("raw");
  });
});
