import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parsePreviewKey } from "@/lib/media/types";

describe("Explore Quick View contract", () => {
  it("parses only supported media types and positive safe integer IDs", () => {
    expect(parsePreviewKey("movie:438631")).toEqual({ mediaType: "movie", tmdbId: 438631 });
    expect(parsePreviewKey("tv:97546")).toEqual({ mediaType: "tv", tmdbId: 97546 });
    for (const value of [null, "", "show:1", "movie:0", "tv:-1", "movie:1.5", "movie:abc", "movie:9007199254740992"]) expect(parsePreviewKey(value)).toBeNull();
  });

  it("keeps the preview loader TMDB-direct and persistence-free", () => {
    const source = readFileSync("src/lib/media/preview.ts", "utf8");
    expect(source).toContain("getMovieDetails");
    expect(source).toContain("getTvDetails");
    expect(source).not.toContain("createAdminClient");
    expect(source).not.toContain("synchronizeMovie");
    expect(source).not.toContain("synchronizeShow");
    expect(source).not.toContain('.from("media_items")');
    expect(source).not.toContain('.from("user_');
  });

  it("loads core and optional extras separately and bounds cast to five", () => {
    const component = readFileSync("src/components/explore/media-preview.tsx", "utf8");
    const loader = readFileSync("src/lib/media/preview.ts", "utf8");
    expect(component).toContain("section=core");
    expect(component).toContain("section=extras");
    expect(loader).toContain("cast: credits.value.cast.slice(0, 5)");
    expect(component).not.toContain("backdrop");
    expect(component).not.toContain("episode");
  });
});
