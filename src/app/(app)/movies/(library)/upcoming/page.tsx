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
      <section className="rounded-xl border border-dashed border-[var(--border)] p-8 text-center">
        <h1 className="text-2xl font-semibold">Choose your region</h1>
        <p className="mt-2 text-[var(--muted)]">
          Choose a release and streaming region to see upcoming movie dates.
        </p>
        <Link
          className="touch-target mt-4 inline-flex items-center rounded-lg bg-[var(--accent)] px-4 font-semibold text-[var(--accent-foreground)]"
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
        <section className="rounded-xl border border-dashed border-[var(--border)] p-8 text-center">
          <h2 className="text-xl font-semibold">No current regional dates</h2>
          <p className="mt-2 text-[var(--muted)]">
            No recent or future theatrical or digital dates are currently
            announced for movies in your library.
          </p>
        </section>
      )}
    </div>
  );
}
