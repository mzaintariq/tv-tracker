import { describe, expect, it } from "vitest";
import { buildTrackTvExport, ExportDataIntegrityError, type ExportSourceData } from "@/lib/export/build";

const generatedAt = "2026-07-17T10:30:45.000Z";

function source(): ExportSourceData {
  return {
    profile: { display_name: null, avatar_url: null, timezone: "Asia/Karachi", theme: "system" },
    showMemberships: [
      { id: "show-z", media_item_id: "tv-30", status: "dropped", is_favourite: false, created_at: "2026-03-01T00:00:00+00:00" },
      { id: "show-a", media_item_id: "tv-20", status: "active", is_favourite: true, created_at: "2026-01-01T00:00:00Z" },
      { id: "show-p", media_item_id: "tv-40", status: "paused", is_favourite: false, created_at: "2026-02-01T00:00:00Z" },
    ],
    movieMemberships: [
      { id: "movie-watch", media_item_id: "movie-60", watched_at: "2020-05-01T12:30:00+05:00", is_favourite: true, created_at: "2020-04-01T00:00:00Z" },
      { id: "movie-next", media_item_id: "movie-50", watched_at: null, is_favourite: false, created_at: "2020-03-01T00:00:00Z" },
    ],
    watched: [
      { id: "watched-2", episode_id: "episode-2", watched_at: "2022-01-02T03:04:05+05:00" },
      { id: "watched-special", episode_id: "episode-0", watched_at: "2021-01-01T00:00:00Z" },
      { id: "watched-1", episode_id: "episode-1", watched_at: "2022-01-01T00:00:00Z" },
    ],
    episodes: [
      { id: "episode-2", media_item_id: "tv-20", tmdb_episode_id: 202, season_number: 1, episode_number: 2, title: "Second", air_date: "2020-01-02" },
      { id: "episode-0", media_item_id: "tv-10", tmdb_episode_id: 100, season_number: 0, episode_number: 1, title: "Special", air_date: null },
      { id: "episode-1", media_item_id: "tv-20", tmdb_episode_id: 201, season_number: 1, episode_number: 1, title: "First", air_date: "2020-01-01" },
    ],
    media: [
      { id: "tv-30", tmdb_id: 30, media_type: "tv", title: "Dropped", release_date: null, runtime_minutes: null },
      { id: "tv-20", tmdb_id: 20, media_type: "tv", title: "Current", release_date: "2020-01-01", runtime_minutes: null },
      { id: "tv-40", tmdb_id: 40, media_type: "tv", title: "Paused", release_date: "2021-01-01", runtime_minutes: null },
      { id: "tv-10", tmdb_id: 10, media_type: "tv", title: "Removed", release_date: "2019-01-01", runtime_minutes: null },
      { id: "movie-60", tmdb_id: 60, media_type: "movie", title: "Watched movie", release_date: "2010-01-01", runtime_minutes: 120 },
      { id: "movie-50", tmdb_id: 50, media_type: "movie", title: "Next movie", release_date: null, runtime_minutes: null },
    ],
  };
}

describe("TrackTV user export assembly", () => {
  it("builds the exact versioned portable shape and deterministic order", () => {
    const result = buildTrackTvExport(source(), generatedAt);
    expect(result.schema).toBe("tracktv.user-export");
    expect(result.version).toBe(1);
    expect(result.generatedAt).toBe(generatedAt);
    expect(result.profile).toEqual({ displayName: null, avatarUrl: null, timezone: "Asia/Karachi", theme: "system" });
    expect(result.tvShows.map((show) => show.providerIds.tmdb)).toEqual([10, 20, 30, 40]);
    expect(result.movies.map((movie) => movie.providerIds.tmdb)).toEqual([50, 60]);
  });

  it("exports current states, favourites, empty shows, and only known removed tracking", () => {
    const result = buildTrackTvExport(source(), generatedAt);
    const removed = result.tvShows[0];
    expect(removed.tracking).toEqual({ inLibrary: false });
    expect(Object.keys(removed.tracking)).toEqual(["inLibrary"]);
    expect(removed.watchedEpisodes[0]).toMatchObject({ providerIds: { tmdb: 100 }, seasonNumber: 0, episodeNumber: 1, title: "Special", airDate: null });
    expect(result.tvShows[1].tracking).toEqual({ inLibrary: true, status: "active", isFavourite: true, addedAt: "2026-01-01T00:00:00Z" });
    expect(result.tvShows[2]).toMatchObject({ tracking: { inLibrary: true, status: "dropped" }, watchedEpisodes: [] });
    expect(result.tvShows[3]).toMatchObject({ tracking: { inLibrary: true, status: "paused" }, watchedEpisodes: [] });
  });

  it("preserves timestamp instants and sorts episodes by coordinates", () => {
    const episodes = buildTrackTvExport(source(), generatedAt).tvShows[1].watchedEpisodes;
    expect(episodes.map((episode) => episode.episodeNumber)).toEqual([1, 2]);
    expect(episodes[1].watchedAt).toBe("2022-01-02T03:04:05+05:00");
    expect(Date.parse(episodes[1].watchedAt)).toBe(Date.parse("2022-01-01T22:04:05Z"));
  });

  it("derives current movie states without reconstructing removed movies", () => {
    const movies = buildTrackTvExport(source(), generatedAt).movies;
    expect(movies[0]).toMatchObject({ state: "watch_next", watchedAt: null, isFavourite: false });
    expect(movies[1]).toMatchObject({ state: "watched", watchedAt: "2020-05-01T12:30:00+05:00", isFavourite: true, runtimeMinutes: 120 });
    expect(movies).toHaveLength(2);
  });

  it("exports an empty account", () => {
    const empty = source(); empty.showMemberships = []; empty.movieMemberships = []; empty.watched = []; empty.episodes = []; empty.media = [];
    expect(buildTrackTvExport(empty, generatedAt)).toMatchObject({ tvShows: [], movies: [] });
  });

  it("fails rather than silently dropping missing required metadata", () => {
    const missing = source(); missing.episodes = missing.episodes.filter((episode) => episode.id !== "episode-1");
    expect(() => buildTrackTvExport(missing, generatedAt)).toThrow(ExportDataIntegrityError);
  });

  it("does not expose internal, identity, import, or synchronization fields", () => {
    const serialized = JSON.stringify(buildTrackTvExport(source(), generatedAt));
    for (const forbidden of ["user_id", "email", "media_item_id", "episode_id", "last_synced_at", "fingerprint", "source_key", "diagnostic"]) expect(serialized).not.toContain(forbidden);
  });
});
