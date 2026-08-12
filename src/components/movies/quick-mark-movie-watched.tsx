"use client";

import { useRouter } from "next/navigation";
import { useRef, useTransition } from "react";

import { setMovieWatched } from "@/app/actions/movies";
import { useNotifications } from "@/components/ui/notifications";

type QuickMarkMovieWatchedProps = {
  title: string;
  tmdbId: number;
  mediaId: string;
};

export function QuickMarkMovieWatched({
  title,
  tmdbId,
  mediaId,
}: QuickMarkMovieWatchedProps) {
  const router = useRouter();
  const { notify } = useNotifications();
  const [pending, startTransition] = useTransition();
  const pendingRef = useRef(false);

  const onMarkWatched = () => {
    if (pendingRef.current || pending) return;
    pendingRef.current = true;
    const watchedAt = new Date().toISOString();
    startTransition(async () => {
      try {
        const response = await setMovieWatched(
          tmdbId,
          mediaId,
          true,
          watchedAt,
        );
        notify(
          response.error ?? response.success ?? "Movie updated.",
          response.error ? "error" : "success",
        );
        if (!response.error) router.refresh();
      } finally {
        pendingRef.current = false;
      }
    });
  };

  return (
    <div className="min-w-0">
      <button
        type="button"
        disabled={pending}
        aria-label={`Mark ${title} as watched`}
        aria-busy={pending}
        className="poster-overlay-action touch-target grid h-11 w-11 cursor-pointer place-items-center rounded-lg border text-xl font-semibold"
        onClick={onMarkWatched}
      >
        <span aria-hidden="true">{pending ? "…" : "✓"}</span>
      </button>
    </div>
  );
}
