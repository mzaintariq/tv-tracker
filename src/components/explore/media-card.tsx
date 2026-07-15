"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useTransition } from "react";

import { addToLibrary, removeFromLibrary } from "@/app/actions/library";
import type { ExploreMediaItem } from "@/lib/media/types";
import { posterUrl, titleInitials } from "@/lib/media/types";

type MediaCardProps = {
  item: ExploreMediaItem;
};

export function MediaCard({ item }: MediaCardProps) {
  const [inLibrary, setInLibrary] = useState(item.inLibrary);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const imageSrc = posterUrl(item.posterPath);
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

  return (
    <article className="flex flex-col gap-3">
      <div className="relative aspect-[2/3] overflow-hidden rounded-lg bg-[var(--surface-elevated)]">
        {imageSrc ? (
          <Image
            src={imageSrc}
            alt={`${item.title} poster`}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 20vw"
            className="object-cover"
          />
        ) : (
          <div
            className="flex h-full w-full items-center justify-center text-2xl font-semibold tracking-wide text-[var(--muted)]"
            aria-hidden="true"
          >
            {titleInitials(item.title)}
          </div>
        )}
      </div>

      <div className="min-w-0 space-y-1">
        <h2 className="truncate text-base font-semibold text-[var(--foreground)]">
          {item.title}
        </h2>
        <p className="text-sm text-[var(--muted)]">
          {mediaLabel}
          {item.year ? ` · ${item.year}` : null}
        </p>
      </div>

      {!inLibrary && item.mediaType === "tv" ? (
        <Link
          href={`/shows/${item.tmdbId}`}
          className="flex h-10 items-center justify-center rounded-lg bg-[var(--accent)] px-3 text-sm font-semibold text-[var(--accent-foreground)]"
        >
          Set progress
        </Link>
      ) : (
      <button
        type="button"
        onClick={handleToggle}
        disabled={isPending}
        aria-label={`${actionLabel}: ${item.title}`}
        className={
          inLibrary
            ? "h-10 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--surface-elevated)] disabled:opacity-60"
            : "h-10 rounded-lg bg-[var(--accent)] px-3 text-sm font-semibold text-[var(--accent-foreground)] disabled:opacity-60"
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
