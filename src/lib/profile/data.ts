import "server-only";

import {
  mapProfileFavourites,
  mapProfileStatistics,
  type ProfileStatistics,
} from "@/lib/profile/statistics";
import { createClient } from "@/lib/supabase/server";

export type ProfileStatisticsData = {
  statistics: ProfileStatistics;
  favouriteShows: ReturnType<typeof mapProfileFavourites>["favouriteShows"];
  favouriteMovies: ReturnType<typeof mapProfileFavourites>["favouriteMovies"];
};

export async function loadProfileStatisticsData(): Promise<ProfileStatisticsData> {
  const supabase = await createClient();
  const [statisticsResult, favouritesResult] = await Promise.all([
    supabase.rpc("load_profile_statistics"),
    supabase.rpc("load_profile_favourites"),
  ]);

  if (statisticsResult.error || favouritesResult.error) {
    throw new Error("profile_statistics_read_failed");
  }

  const statisticsRow = statisticsResult.data?.[0];
  if (!statisticsRow) {
    throw new Error("profile_statistics_read_failed");
  }

  const favourites = mapProfileFavourites(favouritesResult.data ?? []);

  return {
    statistics: mapProfileStatistics(statisticsRow),
    ...favourites,
  };
}
