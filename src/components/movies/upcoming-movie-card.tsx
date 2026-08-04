import Link from "next/link";
import { MediaPoster } from "@/components/media/media-poster";
import { PosterCardTitle } from "@/components/media/poster-card-title";
import { digitalStatus, theatricalStatus, type MovieUpcomingRow } from "@/lib/movies/upcoming";

export function UpcomingMovieCard({ movie, today }: { movie: MovieUpcomingRow; today: string }) {
  return (
    <article className="min-w-0 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
      <Link href={`/movies/${movie.tmdb_id}`} aria-label={`Open ${movie.title}`} className="poster-interactive-surface block min-w-0">
        <div className="relative aspect-[2/3] bg-[var(--surface-elevated)]"><MediaPoster source={movie.poster_path} title={movie.title} alt="" sizes="(max-width: 359px) 100vw, (max-width: 640px) 50vw, 25vw" /></div>
        <div className="min-w-0 space-y-2 p-4">
          <PosterCardTitle as="h3" title={movie.title} favourite={movie.is_favourite} />
          <p className="break-words text-sm text-[var(--foreground)]">{theatricalStatus(movie.theatrical_date, movie.theatrical_type, today)}</p>
          <p className="break-words text-sm text-[var(--muted)]">{digitalStatus(movie.digital_date, today)}</p>
        </div>
      </Link>
    </article>
  );
}
