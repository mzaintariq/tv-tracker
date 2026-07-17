import { MovieCard } from "@/components/movies/movie-card";
import type { MovieLibraryMedia, MovieSnapshot } from "@/lib/movies/movies";

export function MovieSection({ title, description, movies }: { title: string; description?: string; movies: MovieSnapshot<MovieLibraryMedia>[] }) {
  if (!movies.length) return null;
  return <section className="space-y-3"><div className="min-w-0"><h2 className="break-words text-2xl font-semibold tracking-tight">{title}</h2>{description ? <p className="mt-1 break-words text-sm text-[var(--muted)]">{description}</p> : null}</div><ul className="grid grid-cols-1 gap-4 min-[360px]:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">{movies.map((movie) => <li key={movie.membership.id} className="min-w-0"><MovieCard movie={movie} /></li>)}</ul></section>;
}
