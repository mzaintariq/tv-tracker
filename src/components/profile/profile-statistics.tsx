import { StatisticsSummary } from "@/components/profile/statistics-summary";
import { loadProfileStatisticsData } from "@/lib/profile/data";

export async function ProfileStatistics() {
  const pageData = await loadProfileStatisticsData();
  return (
    <StatisticsSummary
      statistics={pageData.statistics}
      favouriteShows={pageData.favouriteShows}
      favouriteMovies={pageData.favouriteMovies}
    />
  );
}
