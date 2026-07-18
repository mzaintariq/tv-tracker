"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { addToLibrary, prepareShowProgress, removeFromLibrary } from "@/app/actions/library";
import type { ExploreMediaItem } from "@/lib/media/types";
import { MediaPoster } from "@/components/media/media-poster";
import { PosterCardTitle } from "@/components/media/poster-card-title";

type MediaCardProps = {
  item: ExploreMediaItem;
};

export function MediaCard({ item }: MediaCardProps) {
  const router = useRouter();
  const [inLibrary, setInLibrary] = useState(item.inLibrary);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const mediaLabel = item.mediaType === "tv" ? "TV show" : "Movie";
  const actionLabel = inLibrary
    ? item.mediaType === "tv"
      ? "Remove from library"
      : "Remove from watchlist"
    : item.mediaType === "tv"
      ? "Add to library"
      : "Add to watchlist";

  function handleToggle() {
    setError(null);

    if (
      inLibrary &&
      item.mediaType === "movie" &&
      !window.confirm(
        "Remove this movie? Its watched date and favourite state will be permanently deleted. Shared movie metadata will remain cached.",
      )
    ) {
      return;
    }

    startTransition(async () => {
      const result = inLibrary
        ? await removeFromLibrary(item.mediaType, item.tmdbId)
        : await addToLibrary(item.mediaType, item.tmdbId);

      if (result.error) {
        setError(result.error);
        return;
      }

      setInLibrary(!inLibrary);
    });
  }

  function handleSetProgress() {
    setError(null);
    startTransition(async () => {
      const result = await prepareShowProgress(item.tmdbId);
      if (result.error) {
        setError(result.error);
        return;
      }
      router.push(`/shows/${item.tmdbId}`);
    });
  }

  return (
    <article className="flex min-w-0 flex-col gap-3">
      <div className="relative aspect-[2/3] overflow-hidden rounded-lg bg-[var(--surface-elevated)]">
        <MediaPoster source={item.posterPath} title={item.title} alt="" sizes="(max-width: 359px) 100vw, (max-width: 640px) 50vw, (max-width: 1024px) 25vw, 20vw" fallbackClassName="text-2xl font-semibold tracking-wide text-[var(--muted)]" />
      </div>

      <div className="min-w-0 space-y-1">
        <PosterCardTitle title={item.title} />
        <p className="break-words text-sm text-[var(--muted)]">
          {mediaLabel}
          {item.year ? ` · ${item.year}` : null}
        </p>
      </div>

      {!inLibrary && item.mediaType === "tv" ? (
        <button
          type="button"
          onClick={handleSetProgress}
          disabled={isPending}
          className="flex touch-target h-11 max-w-full items-center justify-center whitespace-normal rounded-lg bg-[var(--accent)] px-3 text-sm font-semibold text-[var(--accent-foreground)]"
        >
          {isPending ? "Preparing…" : "Set progress"}
        </button>
      ) : (
      <button
        type="button"
        onClick={handleToggle}
        disabled={isPending}
        aria-label={`${actionLabel}: ${item.title}`}
        className={
          inLibrary
            ? "interactive-control touch-target h-11 max-w-full whitespace-normal rounded-lg border bg-[var(--surface)] px-3 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--surface-elevated)]"
            : "touch-target h-11 max-w-full whitespace-normal rounded-lg bg-[var(--accent)] px-3 text-sm font-semibold text-[var(--accent-foreground)]"
        }
      >
        {isPending ? "Saving…" : inLibrary ? "Remove" : "Add"}
      </button>
      )}

      {error ? (
        <p className="text-sm text-[var(--danger)]" role="alert">
          {error}
        </p>
      ) : null}
    </article>
  );
}
