"use client";

import Link from "next/link";
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
  const detailHref = `/${item.mediaType === "tv" ? "shows" : "movies"}/${item.tmdbId}`;

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
        : item.mediaType === "tv"
          ? await prepareShowProgress(item.tmdbId)
          : await addToLibrary(item.mediaType, item.tmdbId);

      if (result.error) {
        setError(result.error);
        return;
      }

      if (!inLibrary && item.mediaType === "tv") {
        router.push(`/shows/${item.tmdbId}`);
        return;
      }

      setInLibrary(!inLibrary);
    });
  }

  return (
    <article className="flex min-w-0 flex-col gap-3">
      <div className="relative aspect-[2/3]">
        {inLibrary ? (
          <Link href={detailHref} aria-label={`Open ${item.title}`} className="poster-interactive-surface block h-full overflow-hidden rounded-lg border bg-[var(--surface-elevated)]"><MediaPoster source={item.posterPath} title={item.title} alt="" sizes="(max-width: 359px) 100vw, (max-width: 640px) 50vw, (max-width: 1024px) 25vw, 20vw" fallbackClassName="text-2xl font-semibold tracking-wide text-[var(--muted)]" /></Link>
        ) : (
          <div className="block h-full overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)]"><MediaPoster source={item.posterPath} title={item.title} alt="" sizes="(max-width: 359px) 100vw, (max-width: 640px) 50vw, (max-width: 1024px) 25vw, 20vw" fallbackClassName="text-2xl font-semibold tracking-wide text-[var(--muted)]" /></div>
        )}
        <button type="button" onClick={handleToggle} disabled={isPending} aria-busy={isPending} aria-label={`${actionLabel}: ${item.title}`} className="poster-overlay-action touch-target absolute right-2 top-2 z-10 grid h-11 w-11 cursor-pointer place-items-center rounded-lg border text-2xl font-semibold"><span aria-hidden="true">{isPending ? "…" : inLibrary ? "−" : "+"}</span></button>
      </div>

      <div className="min-w-0 space-y-1">
        {inLibrary ? <Link href={detailHref} title={item.title}><PosterCardTitle title={item.title} /></Link> : <PosterCardTitle title={item.title} />}
        <p className="break-words text-sm text-[var(--muted)]">
          {mediaLabel}
          {item.year ? ` · ${item.year}` : null}
        </p>
      </div>

      {error ? (
        <p className="text-sm text-[var(--danger)]" role="alert">
          {error}
        </p>
      ) : null}
    </article>
  );
}
