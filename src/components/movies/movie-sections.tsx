import { MovieCard } from "@/components/movies/movie-card";
import type { MovieSnapshot } from "@/lib/movies/movies";

export function MovieSection({ title, description, movies }: { title: string; description?: string; movies: MovieSnapshot[] }) {
  if (!movies.length) return null;
  return <section className="space-y-3"><div><h2 className="text-2xl font-semibold tracking-tight">{title}</h2>{description ? <p className="mt-1 text-sm text-[var(--muted)]">{description}</p> : null}</div><ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">{movies.map((movie) => <li key={movie.membership.id}><MovieCard movie={movie} /></li>)}</ul></section>;
}
