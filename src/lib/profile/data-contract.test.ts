import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const loader = readFileSync("src/lib/profile/data.ts", "utf8");
const component = readFileSync(
  "src/components/profile/profile-statistics.tsx",
  "utf8",
);

describe("focused Profile statistics reads", () => {
  it("loads scalar statistics and favourites concurrently", () => {
    expect(loader).toContain("await Promise.all([");
    expect(loader).toContain('supabase.rpc("load_profile_statistics")');
    expect(loader).toContain('supabase.rpc("load_profile_favourites")');
  });

  it("does not run full show, movie, episode, or history reads", () => {
    for (const forbidden of [
      "deriveWatchList",
      "deriveMovieSections",
      "watched_episodes",
      'from("episodes")',
      'from("user_shows")',
      'from("user_movies")',
      "loadAllPages",
    ]) {
      expect(loader).not.toContain(forbidden);
    }
  });

  it("keeps the Profile statistics component server-rendered", () => {
    expect(component).not.toContain('"use client"');
    expect(component).toContain("await loadProfileStatisticsData()");
  });
});
