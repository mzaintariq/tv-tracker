import { UpcomingMovieCard } from "@/components/movies/upcoming-movie-card";
import type { MovieUpcomingRow } from "@/lib/movies/upcoming";
const grid = "grid grid-cols-1 gap-4 min-[360px]:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4";
function Section({ title, movies, today }: { title: string; movies: MovieUpcomingRow[]; today: string }) {
  if (!movies.length) return null;
  return <section className="space-y-3"><h2 className="text-2xl font-semibold tracking-tight">{title} · {movies.length}</h2><ul className={grid}>{movies.map((movie) => <li className="min-w-0" key={movie.membership_id}><UpcomingMovieCard movie={movie} today={today} /></li>)}</ul></section>;
}
export function MovieUpcomingSections(props: { outNow: MovieUpcomingRow[]; comingSoon: MovieUpcomingRow[]; datesNotAnnounced: MovieUpcomingRow[]; today: string }) {
  return <div className="space-y-10"><Section title="Out Now" movies={props.outNow} today={props.today} /><Section title="Coming Soon" movies={props.comingSoon} today={props.today} /><Section title="Dates not announced" movies={props.datesNotAnnounced} today={props.today} /></div>;
}
