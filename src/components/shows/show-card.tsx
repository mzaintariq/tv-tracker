import Link from "next/link";
import { MediaPoster } from "@/components/media/media-poster";
import { yearFromDate } from "@/lib/media/types";
import type { ShowCardData } from "@/lib/shows/data";
import { ProgressBar } from "@/components/shows/progress-bar";
import { PosterCardTitle } from "@/components/media/poster-card-title";

function primaryGenreName(genres: ShowCardData["media"]["genres"]): string | null {
  if (!Array.isArray(genres)) return null;
  const first = genres[0];
  if (!first || typeof first !== "object" || Array.isArray(first)) return null;
  return typeof first.name === "string" && first.name.trim()
    ? first.name.trim()
    : null;
}

export function ShowCard({ show }: { show: ShowCardData }) {
  const year = yearFromDate(show.media.release_date);
  const primaryGenre = primaryGenreName(show.media.genres);
  const rating = show.media.vote_average;
  const metadata = [
    year?.toString() ?? "Year unknown",
    primaryGenre,
  ].filter((value): value is string => Boolean(value));

  return (
    <article className="min-w-0">
      <Link
        href={`/shows/${show.media.tmdb_id}`}
        className="poster-interactive-surface block min-w-0 overflow-hidden rounded-xl border bg-[var(--surface)]"
        aria-label={`${show.media.title}${show.membership.is_favourite ? ", favourite" : ""}`}
      >
        <div className="relative aspect-[2/3] max-w-full bg-[var(--surface-elevated)]">
          <MediaPoster
            source={show.media.poster_path}
            title={show.media.title}
            alt=""
            sizes="(max-width: 359px) 100vw, (max-width: 640px) 50vw, 25vw"
          />
        </div>
        <div className="min-w-0 space-y-2 sm:space-y-3 p-3 sm:p-4">
          <div className="min-w-0">
            <PosterCardTitle
              title={show.media.title}
              favourite={show.membership.is_favourite}
            />
            <p className="break-words text-xs sm:text-sm text-[var(--muted)]">
              {metadata.join(" · ")}
              {rating !== null && rating > 0 ? (
                <>
                  {" · "}
                  <span
                    aria-label={`TMDB rating ${rating.toFixed(1)} out of 10`}
                  >
                    {rating.toFixed(1)}
                  </span>
                </>
              ) : null}
            </p>
          </div>
          <ProgressBar progress={show.progress} />
        </div>
      </Link>
    </article>
  );
}
