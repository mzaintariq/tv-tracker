import { describe, expect, it } from "vitest";
import { deriveProfileStatistics, formatDuration, type HistoricalEpisode } from "@/lib/profile/statistics";
import type { MovieSnapshot } from "@/lib/movies/movies";
import type { DerivedShow } from "@/lib/shows/watch-list";
import type { Episode, MediaItem, UserMovie, WatchedEpisode } from "@/types/database";

const movie = (watched: boolean, runtime: number | null): MovieSnapshot => ({ membership: { watched_at: watched ? "2026-01-01T00:00:00Z" : null, is_favourite: false } as UserMovie, media: { runtime_minutes: runtime } as MediaItem });
const history = (episodeRuntime: number | null, fallback: number | null): HistoricalEpisode => ({ watched: {} as WatchedEpisode, episode: { runtime_minutes: episodeRuntime } as Episode, media: { average_episode_runtime_minutes: fallback } as MediaItem });

describe("profile statistics", () => {
  it("uses episode runtime, then show fallback, then zero", () => {
    const result = deriveProfileStatistics([], [], [history(50, 40), history(null, 40), history(null, null)]);
    expect(result.episodesWatched).toBe(3);
    expect(result.tvMinutes).toBe(90);
  });

  it("counts and times only currently retained watched movies", () => {
    const result = deriveProfileStatistics([], [movie(true, 120), movie(false, 90)], []);
    expect(result.moviesInLibrary).toBe(2);
    expect(result.moviesWatched).toBe(1);
    expect(result.movieMinutes).toBe(120);
  });

  it("uses existing derived states for current completed and caught-up shows", () => {
    const shows = [{ primaryState: "completed", membership: { is_favourite: true } }, { primaryState: "caught_up", membership: { is_favourite: false } }] as DerivedShow[];
    const result = deriveProfileStatistics(shows, [], []);
    expect(result.completedShows).toBe(1);
    expect(result.caughtUpShows).toBe(1);
    expect(result.favouriteShows).toBe(1);
  });

  it("formats minutes, hours, and days without artificial months", () => {
    expect(formatDuration(2460)).toEqual({ minutes: "2,460 minutes", hours: "41 hours", daysAndHours: "1 day 17 hours" });
    expect(formatDuration(60 * 24 * 40).daysAndHours).toBe("40 days 0 hours");
  });
});
