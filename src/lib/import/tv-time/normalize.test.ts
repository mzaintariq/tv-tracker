import { describe, expect, it } from "vitest";
import { canonicalJson, itemDigest, normalizeNumericSourceId, normalizeTvTimeExport } from "./normalize";
import { ALLOWED_TV_TIME_FILES, type AllowedTvTimeFile } from "./schemas";

function csv(name: AllowedTvTimeFile, records: Record<string, string>[]): string {
  const headers = ALLOWED_TV_TIME_FILES[name];
  const encode = (value: string) => `"${value.replaceAll('"', '""')}"`;
  return `${headers.join(",")}\n${records.map((record) => headers.map((header) => encode(record[header] ?? "")).join(",")).join("\n")}\n`;
}

describe("TV Time normalization", () => {
  it("collapses coordinates to the latest event and gives watched movies priority", () => {
    const files = {
      "tracking-prod-records-v2.csv": csv("tracking-prod-records-v2.csv", [
        { key: "watch-episode-a", s_id: "10", s_no: "1", ep_id: "100", ep_no: "1", created_at: "2024-01-01 00:00:00", series_name: "Example" },
        { key: "rewatch-episode-b", s_id: "10", s_no: "1", ep_id: "100", ep_no: "1", created_at: "2025-01-01 00:00:00", series_name: "Example" },
      ]),
      "tracking-prod-records.csv": csv("tracking-prod-records.csv", [
        { type: "follow", entity_type: "movie", movie_name: "A Movie", release_date: "2020-01-01 00:00:00", created_at: "2021-01-01 00:00:00", uuid: "1" },
        { type: "watch", entity_type: "movie", movie_name: "A Movie", release_date: "2020-01-01 00:00:00", created_at: "2022-01-01 00:00:00", uuid: "2" },
      ]),
      "user_tv_show_data.csv": csv("user_tv_show_data.csv", [{ tv_show_id: "10", tv_show_name: "Example", is_favorited: "1" }]),
      "followed_tv_show.csv": csv("followed_tv_show.csv", [{ tv_show_id: "10", tv_show_name: "Example", active: "1", archived: "0" }]),
    };
    const result = normalizeTvTimeExport(files);
    expect(result.shows[0].episodeEvents).toHaveLength(1);
    expect(result.shows[0].episodeEvents[0]).toMatchObject({ sourceEventCount: 2, watchedAt: { instant: "2025-01-01T00:00:00.000Z" } });
    expect(result.shows[0]).toMatchObject({ importMode: "active_membership", isFavourite: true });
    expect(result.movies[0]).toMatchObject({ state: "watched", sourceRecordCount: 2 });
    expect(itemDigest(result.shows[0])).toBe(itemDigest(result.shows[0]));
  });

  it("uses current show sources when followed_tv_show.csv is absent", () => {
    const result = normalizeTvTimeExport({
      "tracking-prod-records-v2.csv": csv("tracking-prod-records-v2.csv", [
        { key: "user-series-current", s_id: "10", is_followed: "true", is_archived: "false", series_name: "Current" },
        { key: "user-series-archived", s_id: "20", is_followed: "true", is_archived: "true", series_name: "Archived" },
        { key: "watch-episode-archived", s_id: "20", s_no: "1", ep_id: "200", ep_no: "1", created_at: "2024-01-01 00:00:00", series_name: "Archived" },
      ]),
      "user_tv_show_data.csv": csv("user_tv_show_data.csv", [
        { tv_show_id: "10", tv_show_name: "Current", is_followed: "1" },
        { tv_show_id: "20", tv_show_name: "Archived", is_followed: "1" },
        { tv_show_id: "30", tv_show_name: "Show data only", is_followed: "1" },
      ]),
    });

    expect(result.shows.map((show) => [show.tvTimeShowId, show.importMode])).toEqual([
      ["10", "active_membership"],
      ["20", "history_only"],
      ["30", "active_membership"],
    ]);
  });
});

describe("canonical source identity", () => {
  it("normalizes scientific integer IDs without Number precision loss", () => {
    expect(normalizeNumericSourceId("9.007199254740993e15")).toBe("9007199254740993");
    expect(normalizeNumericSourceId("123.001")).toBe("123.001");
  });
  it("sorts object keys recursively for stable item digests", () => {
    expect(canonicalJson({ z: 1, nested: { b: 2, a: 1 } })).toBe('{"nested":{"a":1,"b":2},"z":1}');
    expect(itemDigest({ a: 1, b: { c: 2 } })).toBe(itemDigest({ b: { c: 2 }, a: 1 }));
  });
});

describe("empty source titles", () => {
  it.each(["", "   "])("uses the existing TV fallback for %j", (title) => {
    const result = normalizeTvTimeExport({
      "tracking-prod-records-v2.csv": csv("tracking-prod-records-v2.csv", []),
      "tracking-prod-records.csv": csv("tracking-prod-records.csv", []),
      "user_tv_show_data.csv": csv("user_tv_show_data.csv", [{ tv_show_id: "10", tv_show_name: title }]),
      "followed_tv_show.csv": csv("followed_tv_show.csv", [{ tv_show_id: "10", tv_show_name: title, active: "1", archived: "0" }]),
    });

    expect(result.shows).toHaveLength(1);
    expect(result.shows[0].title).toBe("Unknown TV Time show");
    expect(result.shows.every((show) => show.title.length > 0)).toBe(true);
  });

  it.each(["", "   "])("excludes a movie with title %j", (title) => {
    const result = normalizeTvTimeExport({
      "tracking-prod-records-v2.csv": csv("tracking-prod-records-v2.csv", []),
      "tracking-prod-records.csv": csv("tracking-prod-records.csv", [{ type: "watch", entity_type: "movie", movie_name: title, release_date: "2020-01-01", created_at: "2021-01-01 00:00:00", uuid: "movie-record" }]),
      "user_tv_show_data.csv": csv("user_tv_show_data.csv", []),
      "followed_tv_show.csv": csv("followed_tv_show.csv", []),
    });

    expect(result.movies).toHaveLength(0);
  });
});
