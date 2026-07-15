import Image from "next/image";
import Link from "next/link";
import { posterUrl, titleInitials, yearFromDate } from "@/lib/media/types";
import type { MovieSnapshot } from "@/lib/movies/movies";

export function MovieCard({ movie }: { movie: MovieSnapshot }) {
  const image = posterUrl(movie.media.poster_path);
  return <article className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
    <Link href={`/movies/${movie.media.tmdb_id}`} className="block">
      <div className="relative aspect-[2/3] bg-[var(--surface-elevated)]">{image ? <Image src={image} alt={`${movie.media.title} poster`} fill className="object-cover" sizes="(max-width: 640px) 50vw, 25vw" /> : <span className="flex h-full items-center justify-center text-2xl font-semibold text-[var(--muted)]">{titleInitials(movie.media.title)}</span>}</div>
      <div className="space-y-1 p-4"><h3 className="font-semibold">{movie.media.title} {movie.membership.is_favourite ? <span aria-label="Favourite">★</span> : null}</h3><p className="text-sm text-[var(--muted)]">{yearFromDate(movie.media.release_date) ?? "Year unknown"} · {movie.membership.watched_at ? "Watched" : "Watch Next"}</p></div>
    </Link>
  </article>;
}
