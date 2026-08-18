import Link from "next/link";
import { MediaPoster } from "@/components/media/media-poster";
import { yearFromDate } from "@/lib/media/types";
import type { MovieLibraryMedia, MovieSnapshot } from "@/lib/movies/movies";
import { PosterCardTitle } from "@/components/media/poster-card-title";

function primaryGenreName(genres: MovieLibraryMedia["genres"]): string | null {
  if (!Array.isArray(genres)) return null;
  const first = genres[0];
  if (!first || typeof first !== "object" || Array.isArray(first)) return null;
  return typeof first.name === "string" && first.name.trim()
    ? first.name.trim()
    : null;
}

export function MovieCard({
  movie,
  action,
}: {
  movie: MovieSnapshot<MovieLibraryMedia>;
  action?: React.ReactNode;
}) {
  const year = yearFromDate(movie.media.release_date);
  const primaryGenre = primaryGenreName(movie.media.genres);
  const rating = movie.media.vote_average;
  const metadata = [year?.toString() ?? "Year unknown", primaryGenre].filter(
    (value): value is string => Boolean(value),
  );

  return (
    <article className="relative min-w-0">
      <Link
        href={`/movies/${movie.media.tmdb_id}`}
        className="poster-interactive-surface block min-w-0 overflow-hidden rounded-xl border bg-[var(--surface)]"
        aria-label={`${movie.media.title}${movie.membership.is_favourite ? ", favourite" : ""}`}
      >
        <div className="relative aspect-[2/3] w-full max-w-full bg-[var(--surface-elevated)]">
          <MediaPoster
            source={movie.media.poster_path}
            title={movie.media.title}
            alt=""
            sizes="(max-width: 359px) 100vw, (max-width: 640px) 50vw, 25vw"
          />
        </div>
        <div className="min-w-0 space-y-0 sm:space-y-1 p-3 sm:p-4">
          <PosterCardTitle
            as="h3"
            title={movie.media.title}
            favourite={movie.membership.is_favourite}
          />
          <p className="break-words text-xs sm:text-sm text-[var(--muted)]">
            {metadata.join(" · ")}
            {rating !== null && rating > 0 ? (
              <>
                {" · "}
                <span aria-label={`TMDB rating ${rating.toFixed(1)} out of 10`}>
                  {/* <span aria-hidden="true">★ </span> */}
                  {rating.toFixed(1)}
                </span>
              </>
            ) : null}
          </p>
        </div>
      </Link>
      {action ? (
        <div className="absolute right-2 top-2 z-10">{action}</div>
      ) : null}
    </article>
  );
}
