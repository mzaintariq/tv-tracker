"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";

import { setMovieWatched, type MovieActionResult } from "@/app/actions/movies";

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
  const [pending, startTransition] = useTransition();
  const pendingRef = useRef(false);
  const [result, setResult] = useState<MovieActionResult | null>(null);

  const onMarkWatched = () => {
    if (pendingRef.current || pending) return;
    pendingRef.current = true;
    const watchedAt = new Date().toISOString();
    startTransition(async () => {
      try {
        const response = await setMovieWatched(tmdbId, mediaId, true, watchedAt);
        setResult(response);
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
      {result?.error ? (
        <p role="alert" className="sr-only">
          {result.error}
        </p>
      ) : null}
      {result?.success ? (
        <p role="status" className="sr-only">
          {result.success}
        </p>
      ) : null}
    </div>
  );
}
