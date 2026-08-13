"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  addToLibrary,
  prepareShowProgress,
  removeFromLibrary,
} from "@/app/actions/library";
import type { ExploreMediaItem } from "@/lib/media/types";
import { MediaPoster } from "@/components/media/media-poster";
import { PosterCardTitle } from "@/components/media/poster-card-title";
import { useNotifications } from "@/components/ui/notifications";

type MediaCardProps = {
  item: ExploreMediaItem;
};

export function MediaCard({ item }: MediaCardProps) {
  const router = useRouter();
  const { notify } = useNotifications();
  const [inLibrary, setInLibrary] = useState(item.inLibrary);
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

      notify(
        result.error ?? result.success ?? "Library updated.",
        result.error ? "error" : "success",
      );
      if (result.error) {
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
    <article className="flex min-w-0 flex-col gap-1 sm:gap-3">
      <div className="relative aspect-[2/3]">
        {inLibrary ? (
          <Link
            href={detailHref}
            aria-label={`Open ${item.title}`}
            className="poster-interactive-surface block h-full overflow-hidden rounded-xl border bg-[var(--surface-elevated)]"
          >
            <MediaPoster
              source={item.posterPath}
              title={item.title}
              alt=""
              sizes="(max-width: 359px) 100vw, (max-width: 640px) 50vw, (max-width: 1024px) 25vw, 20vw"
              fallbackClassName="text-2xl font-semibold tracking-wide text-[var(--muted)]"
            />
          </Link>
        ) : (
          <div className="block h-full overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] [transform:translateZ(0)]">
            <MediaPoster
              source={item.posterPath}
              title={item.title}
              alt=""
              sizes="(max-width: 359px) 100vw, (max-width: 640px) 50vw, (max-width: 1024px) 25vw, 20vw"
              fallbackClassName="text-2xl font-semibold tracking-wide text-[var(--muted)]"
            />
          </div>
        )}
        <button
          type="button"
          onClick={handleToggle}
          disabled={isPending}
          aria-busy={isPending}
          aria-label={`${actionLabel}: ${item.title}`}
          className="poster-overlay-action touch-target absolute right-2 top-2 z-10 grid h-11 w-11 cursor-pointer place-items-center rounded-lg border text-2xl font-semibold"
        >
          <span aria-hidden="true">
            {isPending ? "…" : inLibrary ? "−" : "+"}
          </span>
        </button>
      </div>

      <div className="min-w-0 space-y-0 sm:space-y-1">
        {inLibrary ? (
          <Link href={detailHref} title={item.title}>
            <PosterCardTitle title={item.title} />
          </Link>
        ) : (
          <PosterCardTitle title={item.title} />
        )}
        <p className="break-words text-xs text-[var(--muted)] sm:text-sm">
          {mediaLabel}
          {item.year ? ` · ${item.year}` : null}
        </p>
      </div>

    </article>
  );
}
