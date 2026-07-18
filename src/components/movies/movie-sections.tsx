import { MovieCard } from "@/components/movies/movie-card";
import { QuickMarkMovieWatched } from "@/components/movies/quick-mark-movie-watched";
import type { MovieLibraryMedia, MovieSnapshot } from "@/lib/movies/movies";

export function MovieSection({
  title,
  description,
  movies,
  quickMarkWatched = false,
}: {
  title: string;
  description?: string;
  movies: MovieSnapshot<MovieLibraryMedia>[];
  quickMarkWatched?: boolean;
}) {
  if (!movies.length) return null;
  return (
    <section className="space-y-3">
      <div className="min-w-0">
        <h2 className="break-words text-2xl font-semibold tracking-tight">
          {title} · {movies.length}
        </h2>
        {description ? (
          <p className="mt-1 break-words text-sm text-[var(--muted)]">{description}</p>
        ) : null}
      </div>
      <ul className="grid grid-cols-1 gap-4 min-[360px]:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
        {movies.map((movie) => (
          <li key={movie.membership.id} className="min-w-0 space-y-2">
            <MovieCard movie={movie} />
            {quickMarkWatched ? (
              <QuickMarkMovieWatched
                title={movie.media.title}
                tmdbId={movie.media.tmdb_id}
                mediaId={movie.media.id}
              />
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
