import { describe, expect, it } from "vitest";
import { deriveInitialProgressOptions } from "@/lib/shows/initial-progress-options";
import type { Episode } from "@/types/database";

function episode(season: number, number: number): Episode {
  return { id: `${season}-${number}`, season_number: season, episode_number: number, title: `Episode ${number}` } as Episode;
}

describe("initial progress options", () => {
  it("provides selectable episode coordinates and season counts", () => {
    const result = deriveInitialProgressOptions([episode(1, 1), episode(1, 2), episode(2, 1)]);
    expect(result.episodes.map((item) => [item.season_number, item.episode_number])).toEqual([[1, 1], [1, 2], [2, 1]]);
    expect(result.seasons).toEqual([{ seasonNumber: 1, episodeCount: 2 }, { seasonNumber: 2, episodeCount: 1 }]);
  });

  it("excludes Season 0 from episode and season selectors", () => {
    const result = deriveInitialProgressOptions([episode(0, 1), episode(1, 1)]);
    expect(result.episodes).toHaveLength(1);
    expect(result.seasons).toEqual([{ seasonNumber: 1, episodeCount: 1 }]);
  });
});
