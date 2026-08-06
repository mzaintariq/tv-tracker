"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import {
  removeMovie,
  setMovieWatched,
  syncMovieMetadata,
  toggleMovieFavourite,
  updateMovieWatchedAt,
  type MovieActionResult,
} from "@/app/actions/movies";
import { MetadataRefreshControl } from "@/components/media/metadata-refresh-control";
import { timestampToDateTimeLocal } from "@/lib/date-time";
import type { UserMovie } from "@/types/database";
import { useNotifications } from "@/components/ui/notifications";

const button =
  "interactive-control touch-target rounded-lg border border-[var(--control-border)] bg-[var(--surface)] w-full px-3 py-2 text-sm font-semibold cursor-pointer hover:bg-[var(--surface-elevated)] active:bg-[var(--accent-soft)]";
const trackingButton =
  "interactive-control touch-target w-full max-w-full cursor-pointer whitespace-normal rounded-lg border bg-[var(--surface)] px-3 py-2 text-sm font-semibold text-[var(--foreground)] transition-colors hover:bg-[var(--surface-elevated)] sm:w-auto";

function DateError({
  result,
  id,
}: {
  result: MovieActionResult | null;
  id: string;
}) {
  return result?.error ? (
    <p
      id={id}
      className="break-words text-sm text-[var(--danger)]"
      role="alert"
    >
      {result.error}
    </p>
  ) : null;
}

export function MovieControls({
  tmdbId,
  mediaId,
  title,
  timeZone,
  membership,
}: {
  tmdbId: number;
  mediaId: string;
  title: string;
  timeZone: string;
  membership: UserMovie;
}) {
  const router = useRouter();
  const { notify } = useNotifications();
  const [pending, startTransition] = useTransition();
  const [editingDate, setEditingDate] = useState(false);
  const [dateResult, setDateResult] = useState<MovieActionResult | null>(null);
  const inFlight = useRef(false);
  const dateInput = useRef<HTMLInputElement>(null);
  const watched = membership.watched_at !== null;
  const dateValue = membership.watched_at
    ? timestampToDateTimeLocal(membership.watched_at, timeZone)
    : "";
  const watchedLabel = membership.watched_at
    ? new Intl.DateTimeFormat("en-US", { dateStyle: "long", timeZone }).format(
        new Date(membership.watched_at),
      )
    : null;

  const run = (
    task: () => Promise<MovieActionResult>,
    afterSuccess?: () => void,
    refreshAfterSuccess = true,
  ) => {
    if (inFlight.current) return;
    inFlight.current = true;
    startTransition(async () => {
      try {
        const response = await task();
        notify(
          response.error ?? response.success ?? "Movie updated.",
          response.error ? "error" : "success",
        );
        if (!response.error) {
          afterSuccess?.();
          if (refreshAfterSuccess) router.refresh();
        }
      } finally {
        inFlight.current = false;
      }
    });
  };

  return (
    <section
      aria-label="Movie tracking actions"
      className="min-w-0 space-y-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 sm:p-6"
    >
      <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap">
        <button
          type="button"
          className={trackingButton}
          disabled={pending}
          aria-pressed={watched}
          aria-label={`Mark ${title} ${watched ? "unwatched" : "watched"}`}
          onClick={() => run(() => setMovieWatched(tmdbId, mediaId, !watched))}
        >
          {watched ? "Mark unwatched" : "Mark watched"}
        </button>
        <button
          type="button"
          className={trackingButton}
          disabled={pending}
          aria-pressed={membership.is_favourite}
          aria-label={`${membership.is_favourite ? "Remove" : "Add"} ${title} ${membership.is_favourite ? "from favourites" : "to favourites"}`}
          onClick={() =>
            run(() =>
              toggleMovieFavourite(tmdbId, mediaId, !membership.is_favourite),
            )
          }
        >
          <span aria-hidden="true">{membership.is_favourite ? "★" : "☆"}</span>{" "}
          {membership.is_favourite ? "Favourite" : "Add favourite"}
        </button>
      </div>

      {watched && watchedLabel ? (
        <div className="min-w-0">
          <div className="flex min-w-0 flex-wrap items-center gap-2 text-sm">
            <p className="break-words">
              <span className="font-semibold">Watched on</span>{" "}
              <time dateTime={membership.watched_at ?? undefined}>
                {watchedLabel}
              </time>
            </p>
            <button
              type="button"
              className="interactive-control touch-target rounded px-2 text-sm font-medium underline-offset-4 hover:underline cursor-pointer"
              aria-expanded={editingDate}
              aria-controls="movie-watched-date-editor"
              onClick={() => {
                setDateResult(null);
                setEditingDate((current) => !current);
              }}
            >
              {editingDate ? "Cancel" : "Edit"}
            </button>
          </div>
          {editingDate ? (
            <div
              id="movie-watched-date-editor"
              className="flex w-full min-w-0 max-w-full flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end"
            >
              <input
                ref={dateInput}
                id="movie-watched-date"
                type="datetime-local"
                defaultValue={dateValue}
                max={timestampToDateTimeLocal(
                  new Date().toISOString(),
                  timeZone,
                )}
                aria-describedby={
                  dateResult?.error ? "movie-date-error" : undefined
                }
                aria-invalid={dateResult?.error ? true : undefined}
                className="interactive-control touch-target block w-full min-w-0 max-w-full rounded-lg border bg-[var(--surface)] px-3 text-base text-[var(--foreground)] sm:w-auto sm:text-sm"
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className={button}
                  disabled={pending}
                  onClick={() => {
                    const value = dateInput.current?.value;
                    if (!value || inFlight.current) return;
                    inFlight.current = true;
                    startTransition(async () => {
                      try {
                        const response = await updateMovieWatchedAt(
                          tmdbId,
                          mediaId,
                          value,
                          timeZone,
                        );
                        setDateResult(response.error ? response : null);
                        notify(
                          response.error ??
                            response.success ??
                            "Watched date updated.",
                          response.error ? "error" : "success",
                        );
                        if (!response.error) {
                          setEditingDate(false);
                          router.refresh();
                        }
                      } finally {
                        inFlight.current = false;
                      }
                    });
                  }}
                >
                  Save
                </button>
              </div>
            </div>
          ) : null}
          <DateError id="movie-date-error" result={dateResult} />
        </div>
      ) : null}

      <button
        type="button"
        className={`${trackingButton} text-[var(--danger)]`}
        disabled={pending}
        aria-label={`Remove ${title} from library`}
        onClick={() => {
          if (
            !window.confirm(
              `Remove ${title}? Its watched date and favourite state will be permanently deleted. Shared movie metadata will be kept.`,
            )
          )
            return;
          run(
            () => removeMovie(tmdbId, mediaId),
            () => router.push("/movies"),
            false,
          );
        }}
      >
        Remove from library
      </button>

      <p className="max-w-prose text-xs text-[var(--muted)]">
        Removing this movie permanently deletes its watched date and favourite
        state. Shared movie metadata is kept.
      </p>
      <MetadataRefreshControl
        tmdbId={tmdbId}
        mediaId={mediaId}
        refreshAction={syncMovieMetadata}
      />
    </section>
  );
}
