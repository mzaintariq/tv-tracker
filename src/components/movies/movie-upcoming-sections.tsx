import { UpcomingMovieCard } from "@/components/movies/upcoming-movie-card";
import type { MovieUpcomingRow } from "@/lib/movies/upcoming";
const list = "space-y-3";
function Section({
  title,
  movies,
  today,
  section,
}: {
  title: string;
  movies: MovieUpcomingRow[];
  today: string;
  section: "out-now" | "coming-soon" | "tba";
}) {
  if (!movies.length) return null;
  return (
    <section className="space-y-3">
      <h2 className="text-2xl font-semibold tracking-tight">
        {title} · {movies.length}
      </h2>
      <ul className={list}>
        {movies.map((movie) => (
          <li className="min-w-0" key={movie.membership_id}>
            <UpcomingMovieCard movie={movie} today={today} section={section} />
          </li>
        ))}
      </ul>
    </section>
  );
}
export function MovieUpcomingSections(props: {
  outNow: MovieUpcomingRow[];
  comingSoon: MovieUpcomingRow[];
  datesNotAnnounced: MovieUpcomingRow[];
  today: string;
}) {
  return (
    <div className="w-full space-y-10">
      <Section
        title="Out Now"
        movies={props.outNow}
        today={props.today}
        section="out-now"
      />
      <Section
        title="Coming Soon"
        movies={props.comingSoon}
        today={props.today}
        section="coming-soon"
      />
      <Section
        title="Dates not announced"
        movies={props.datesNotAnnounced}
        today={props.today}
        section="tba"
      />
    </div>
  );
}
