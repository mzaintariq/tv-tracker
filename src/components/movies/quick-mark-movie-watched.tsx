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
    <div className="min-w-0 space-y-1">
      <button
        type="button"
        disabled={pending}
        aria-label={`Mark ${title} watched`}
        className="touch-target max-w-full whitespace-normal rounded-lg bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-[var(--accent-foreground)]"
        onClick={onMarkWatched}
      >
        {pending ? "Saving…" : "Mark watched"}
      </button>
      {result?.error ? (
        <p role="alert" className="break-words text-xs text-[var(--danger)]">
          {result.error}
        </p>
      ) : null}
      {result?.success ? (
        <p role="status" className="break-words text-xs text-[var(--success)]">
          {result.success}
        </p>
      ) : null}
    </div>
  );
}
