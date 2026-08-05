import { describe, expect, it } from "vitest";
import { normalizeCast, normalizeDirectors, normalizeExternalLinks, normalizeProviders, selectPreferredTrailer, selectTvCertification } from "@/lib/tmdb/extras-normalize";

describe("rich metadata projections", () => {
  it("bounds cast, preserves provider ordering, and deduplicates people", () => {
    const cast = normalizeCast({ id: 1, cast: [{ id: 2, name: "Two", character: "B", order: 1 }, { id: 2, name: "Duplicate", order: 2 }, { id: 1, name: "One", roles: [{ character: "A" }], order: 0 }, { id: -1, name: "Bad" }] });
    expect(cast.map((item) => [item.personId, item.character, item.order])).toEqual([[2, "B", 1], [1, "A", 0]]);
  });
  it("selects multiple directors deterministically", () => {
    expect(normalizeDirectors({ id: 1, crew: [{ id: 9, name: "Z", job: "Director" }, { id: 2, name: "A", job: "Director" }, { id: 3, name: "No", job: "Writer" }] })).toEqual([{ personId: 2, name: "A" }, { personId: 9, name: "Z" }]);
  });
  it("prioritizes supported official trailers and rejects unsupported hosts", () => {
    const selected = selectPreferredTrailer([{ id: "v", key: "abcdefghi", site: "Vimeo", type: "Trailer", name: "No" }, { id: "t", key: "youtube_1", site: "YouTube", type: "Trailer", name: "Official", official: true, iso_639_1: "en" }, { id: "c", key: "youtube_2", site: "YouTube", type: "Clip", name: "Clip", official: true }], "en");
    expect(selected?.name).toBe("Official");
    expect(selectPreferredTrailer([{ id: "v", key: "abcdefghi", site: "Vimeo", type: "Trailer", name: "No" }])).toBeNull();
  });
  it("groups only one explicit provider region with stable ordering", () => {
    const result = normalizeProviders("pk", { link: "https://www.themoviedb.org/watch", flatrate: [{ provider_id: 2, provider_name: "B", display_priority: 2 }, { provider_id: 1, provider_name: "A", display_priority: 1 }, { provider_id: 1, provider_name: "Again" }], rent: [{ provider_id: 3, provider_name: "Rent" }] });
    expect(result.region).toBe("PK"); expect(result.groups.stream.map((p) => p.providerId)).toEqual([1, 2]); expect(result.groups.rent[0].category).toBe("rent");
  });
  it("never falls back across certification regions or ambiguity", () => {
    const ratings = [{ iso_3166_1: "US", rating: "TV-MA" }, { iso_3166_1: "GB", rating: "18" }];
    expect(selectTvCertification(ratings, "US")).toBe("TV-MA"); expect(selectTvCertification(ratings, "PK")).toBeNull();
    expect(selectTvCertification([...ratings, { iso_3166_1: "US", rating: "TV-14" }], "US")).toBeNull();
  });
  it("builds links only from trusted IDs and validated HTTPS homepages", () => {
    expect(normalizeExternalLinks("movie", 1, "tt1234567", "https://example.com/path")).toEqual({ tmdb: "https://www.themoviedb.org/movie/1", imdb: "https://www.imdb.com/title/tt1234567/", homepage: "https://example.com/path" });
    expect(normalizeExternalLinks("tv", 2, "bad", "javascript:alert(1)")).toMatchObject({ imdb: null, homepage: null });
  });
});
