import Link from "next/link";
import { MediaPoster } from "@/components/media/media-poster";
import { yearFromDate } from "@/lib/media/types";
import type { MovieLibraryMedia, MovieSnapshot } from "@/lib/movies/movies";
import { PosterCardTitle } from "@/components/media/poster-card-title";

export function MovieCard({ movie }: { movie: MovieSnapshot<MovieLibraryMedia> }) {
  return <article className="min-w-0 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
    <Link href={`/movies/${movie.media.tmdb_id}`} className="block min-w-0" aria-label={`${movie.media.title}${movie.membership.is_favourite ? ", favourite" : ""}`}>
      <div className="relative aspect-[2/3] max-w-full bg-[var(--surface-elevated)]"><MediaPoster source={movie.media.poster_path} title={movie.media.title} alt="" sizes="(max-width: 359px) 100vw, (max-width: 640px) 50vw, 25vw" /></div>
      <div className="min-w-0 space-y-1 p-4"><PosterCardTitle as="h3" title={movie.media.title} favourite={movie.membership.is_favourite} /><p className="break-words text-sm text-[var(--muted)]">{yearFromDate(movie.media.release_date) ?? "Year unknown"} · {movie.membership.watched_at ? "Watched" : "Watch Next"}</p></div>
    </Link>
  </article>;
}
