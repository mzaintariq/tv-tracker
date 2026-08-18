"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

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
  onPreview: (item: ExploreMediaItem, triggerId: string) => void;
  onMembershipChange: (inLibrary: boolean) => void;
};

function CardContent({
  item,
  mediaLabel,
}: {
  item: ExploreMediaItem;
  mediaLabel: string;
}) {
  return (
    <>
      <div className="relative aspect-[2/3] w-full max-w-full bg-[var(--surface-elevated)]">
        <MediaPoster
          source={item.posterPath}
          title={item.title}
          alt=""
          sizes="(max-width: 359px) 100vw, (max-width: 640px) 50vw, (max-width: 1024px) 25vw, 20vw"
          fallbackClassName="text-2xl font-semibold tracking-wide text-[var(--muted)]"
        />
      </div>
      <div className="min-w-0 space-y-0 p-3 sm:space-y-1 sm:p-4">
        <PosterCardTitle title={item.title} />
        <p className="break-words text-xs text-[var(--muted)] sm:text-sm">
          {item.year ?? "Year unknown"} · {mediaLabel}
        </p>
      </div>
    </>
  );
}

export function MediaCard({ item, onPreview, onMembershipChange }: MediaCardProps) {
  const router = useRouter();
  const { notify } = useNotifications();
  const [isPending, startTransition] = useTransition();
  const inLibrary = item.inLibrary;
  const mediaLabel = item.mediaType === "tv" ? "TV show" : "Movie";
  const actionLabel = inLibrary
    ? item.mediaType === "tv"
      ? "Remove from library"
      : "Remove from watchlist"
    : item.mediaType === "tv"
      ? "Add to library"
      : "Add to watchlist";
  const triggerId = `explore-preview-${item.mediaType}-${item.tmdbId}`;

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

      onMembershipChange(!inLibrary);
    });
  }

  return (
    <article className="relative min-w-0">
      <button
          id={triggerId}
          type="button"
          onClick={() => onPreview(item, triggerId)}
          aria-label={`Quick view: ${item.title}`}
          className="poster-interactive-surface block w-full min-w-0 cursor-pointer overflow-hidden rounded-xl border bg-[var(--surface)] text-left"
        >
          <CardContent item={item} mediaLabel={mediaLabel} />
      </button>
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
    </article>
  );
}
