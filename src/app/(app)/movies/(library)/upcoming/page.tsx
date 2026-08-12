import Link from "next/link";
import { redirect } from "next/navigation";
import { MovieUpcomingSections } from "@/components/movies/movie-upcoming-sections";
import { MovieUpcomingRefresh } from "@/components/movies/movie-upcoming-refresh";
import { loadMovieUpcoming } from "@/lib/movies/upcoming-data";
import { createClient } from "@/lib/supabase/server";

export default async function MovieUpcomingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const data = await loadMovieUpcoming(user.id);
  if (!data.region)
    return (
      <section className="rounded-xl border border-dashed border-[var(--border)] p-4 text-center sm:p-8">
        <h1 className="text-xl font-semibold sm:text-2xl">
          Choose your region
        </h1>
        <p className="mt-1 text-xs text-[var(--muted)] sm:mt-2 sm:text-base">
          Choose a release and streaming region to see upcoming movie dates.
        </p>
        <Link
          className="touch-target mt-3 inline-flex items-center rounded-lg bg-[var(--accent)] px-3 text-xs font-semibold text-[var(--accent-foreground)] sm:mt-4 sm:px-4 sm:text-base"
          href="/profile/settings"
        >
          Choose region in Settings
        </Link>
      </section>
    );
  return (
    <div className="space-y-8">
      {data.staleTmdbIds.length ? (
        <MovieUpcomingRefresh tmdbIds={data.staleTmdbIds} />
      ) : null}
      {data.outNow.length ||
      data.comingSoon.length ||
      data.datesNotAnnounced.length ? (
        <MovieUpcomingSections
          outNow={data.outNow}
          comingSoon={data.comingSoon}
          datesNotAnnounced={data.datesNotAnnounced}
          today={data.today}
        />
      ) : (
        <section className="rounded-xl border border-dashed border-[var(--border)] p-4 text-center sm:p-8">
          <h2 className="text-lg font-semibold sm:text-xl">
            No current regional dates
          </h2>
          <p className="mt-1 text-xs text-[var(--muted)] sm:mt-2 sm:text-base">
            No recent or future theatrical or digital dates are currently
            announced for movies in your library.
          </p>
        </section>
      )}
    </div>
  );
}
