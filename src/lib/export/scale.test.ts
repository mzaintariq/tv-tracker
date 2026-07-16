import { describe, expect, it } from "vitest";
import { buildTrackTvExport, type ExportSourceData } from "@/lib/export/build";
import { EXPORT_ID_CHUNK_SIZE, EXPORT_PAGE_SIZE, uniqueChunks } from "@/lib/export/pagination";

describe("representative export scale", () => {
  it("assembles more than 13,000 watched episodes without truncation", () => {
    const showCount = 350; const movieCount = 700; const watchedCount = 13_050;
    const media: ExportSourceData["media"] = [];
    const showMemberships: ExportSourceData["showMemberships"] = [];
    for (let index = 0; index < showCount; index += 1) {
      media.push({ id: `show-${index}`, tmdb_id: 10_000 + index, media_type: "tv", title: `A deliberately long television title ${String(index).padStart(4, "0")} for export measurement`, release_date: "2000-01-01", runtime_minutes: null });
      showMemberships.push({ id: `show-membership-${index}`, media_item_id: `show-${index}`, status: index % 3 === 0 ? "paused" : index % 3 === 1 ? "dropped" : "active", is_favourite: index % 5 === 0, created_at: "2020-01-01T00:00:00Z" });
    }
    const movieMemberships: ExportSourceData["movieMemberships"] = [];
    for (let index = 0; index < movieCount; index += 1) {
      media.push({ id: `movie-${index}`, tmdb_id: 20_000 + index, media_type: "movie", title: `A deliberately long movie title ${String(index).padStart(4, "0")} for export measurement`, release_date: "2001-01-01", runtime_minutes: 120 });
      movieMemberships.push({ id: `movie-membership-${index}`, media_item_id: `movie-${index}`, watched_at: index % 2 ? "2021-01-01T00:00:00Z" : null, is_favourite: index % 7 === 0, created_at: "2020-01-01T00:00:00Z" });
    }
    const episodes: ExportSourceData["episodes"] = []; const watched: ExportSourceData["watched"] = [];
    for (let index = 0; index < watchedCount; index += 1) {
      const episodeId = `episode-${index}`; const mediaId = `show-${index % showCount}`;
      episodes.push({ id: episodeId, media_item_id: mediaId, tmdb_episode_id: 30_000 + index, season_number: Math.floor(index / 25) % 20, episode_number: index % 25 + 1, title: `A deliberately long episode title ${String(index).padStart(5, "0")} for representative measurement`, air_date: "2010-01-01" });
      watched.push({ id: `watched-${index}`, episode_id: episodeId, watched_at: "2022-01-01T12:34:56.000Z" });
    }
    const source: ExportSourceData = { profile: { display_name: "Scale", avatar_url: null, timezone: "UTC", theme: "system" }, showMemberships, movieMemberships, watched, episodes, media };
    const before = process.memoryUsage().heapUsed; const started = performance.now();
    const document = buildTrackTvExport(source, "2026-07-17T10:30:45.000Z"); const json = JSON.stringify(document, null, 2);
    const durationMs = performance.now() - started; const heapDeltaBytes = Math.max(0, process.memoryUsage().heapUsed - before);
    const exportedWatched = document.tvShows.reduce((total, show) => total + show.watchedEpisodes.length, 0);
    const measurement = {
      shows: document.tvShows.length, movies: document.movies.length, watchedEpisodes: exportedWatched,
      outputBytes: Buffer.byteLength(json), durationMs: Math.round(durationMs * 100) / 100, approximateHeapDeltaBytes: heapDeltaBytes,
      ownerPageQueries: Math.ceil(showCount / EXPORT_PAGE_SIZE) + Math.ceil(movieCount / EXPORT_PAGE_SIZE) + Math.ceil(watchedCount / EXPORT_PAGE_SIZE),
      episodeMetadataChunks: uniqueChunks(watched.map((row) => row.episode_id), EXPORT_ID_CHUNK_SIZE).length,
      mediaMetadataChunks: uniqueChunks(media.map((row) => row.id), EXPORT_ID_CHUNK_SIZE).length,
    };
    console.info("tracktv_export_benchmark", measurement);
    expect(exportedWatched).toBe(watchedCount);
    expect(document.tvShows).toHaveLength(showCount);
    expect(document.movies).toHaveLength(movieCount);
    expect(JSON.parse(json).tvShows).toHaveLength(showCount);
  });
});
