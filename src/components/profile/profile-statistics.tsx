import { StatisticsSummary } from "@/components/profile/statistics-summary";
import { loadProfilePageData } from "@/lib/profile/data";

type ProfileStatisticsProps = {
  userId: string;
};

export async function ProfileStatistics({ userId }: ProfileStatisticsProps) {
  const pageData = await loadProfilePageData(userId);
  return (
    <StatisticsSummary
      statistics={pageData.statistics}
      shows={pageData.shows}
      movies={pageData.movies}
    />
  );
}
