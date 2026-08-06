import Link from "next/link";
import { MediaPoster } from "@/components/media/media-poster";
import {
  digitalStatus,
  movieReleaseProximity,
  theatricalStatus,
  type MovieUpcomingRow,
} from "@/lib/movies/upcoming";

export function UpcomingMovieCard({
  movie,
  today,
  section,
}: {
  movie: MovieUpcomingRow;
  today: string;
  section: "out-now" | "coming-soon" | "tba";
}) {
  const proximity = movieReleaseProximity(movie, today, section);
  return (
    <article className="min-w-0">
      <Link
        href={`/movies/${movie.tmdb_id}`}
        className="movie-release-row-interactive grid min-h-28 min-w-0 grid-cols-[4rem_minmax(0,1fr)_3.75rem] items-start gap-3 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 sm:min-h-36 sm:grid-cols-[5rem_minmax(0,1fr)_5rem] sm:gap-4 sm:p-4"
      >
        <div className="relative aspect-[2/3] w-16 shrink-0 overflow-hidden rounded-lg bg-[var(--surface-elevated)] sm:w-20">
          <MediaPoster
            source={movie.poster_path}
            title={movie.title}
            alt=""
            sizes="(max-width: 639px) 64px, 80px"
          />
        </div>
        <div className="min-w-0 self-center">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <h3
              className="line-clamp-2 min-w-0 break-words font-semibold leading-snug"
              title={movie.title}
            >
              {movie.title}
            </h3>
            {movie.watched_at ? (
              <span className="rounded-full border border-[var(--control-border)] px-2 py-0.5 text-xs font-semibold text-[var(--muted)]">
                Watched<span className="sr-only"> (already watched)</span>
              </span>
            ) : null}
          </div>
          <p className="mt-2 break-words text-sm leading-snug text-[var(--foreground)]">
            {theatricalStatus(
              movie.theatrical_date,
              movie.theatrical_type,
              today,
            )}
          </p>
          <p className="mt-1 break-words text-sm leading-snug text-[var(--muted)]">
            {digitalStatus(movie.digital_date, today)}
          </p>
        </div>
        <div className="min-w-0 self-center text-center">
          <span className="sr-only">{proximity.accessibleLabel}</span>
          <span
            aria-hidden="true"
            className={`${proximity.visiblePrimary === "TODAY" || proximity.visiblePrimary === "TBA" ? "text-base sm:text-lg" : "text-3xl sm:text-4xl"} block break-words font-bold leading-none tracking-tight text-[var(--accent)]`}
          >
            {proximity.visiblePrimary}
          </span>
          {proximity.visibleSecondary ? (
            <span
              aria-hidden="true"
              className="mt-1 block text-[0.625rem] font-bold leading-tight tracking-wide text-[var(--muted)] sm:text-xs"
            >
              {proximity.visibleSecondary}
            </span>
          ) : null}
        </div>
      </Link>
    </article>
  );
}
