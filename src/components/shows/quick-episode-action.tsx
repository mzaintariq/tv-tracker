"use client";

import { useState, useTransition } from "react";
import { setEpisodeWatched, type ShowActionResult } from "@/app/actions/shows";

export function QuickEpisodeAction({
  tmdbId,
  mediaId,
  episodeId,
  watched,
}: {
  tmdbId: number;
  mediaId: string;
  episodeId: string;
  watched: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<ShowActionResult | null>(null);
  const label = watched ? "Undo" : "Mark Watched";

  return <div className="space-y-1">
    <button
      type="button"
      disabled={pending}
      className="rounded-lg bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-[var(--accent-foreground)] disabled:opacity-50"
      onClick={() => startTransition(async () => setResult(await setEpisodeWatched(tmdbId, mediaId, episodeId, !watched)))}
    >
      {pending ? "Saving…" : label}
    </button>
    {result?.error ? <p role="alert" className="text-xs text-[var(--danger)]">{result.error}</p> : null}
    {result?.success ? <p aria-live="polite" className="text-xs text-[var(--success)]">{result.success}</p> : null}
  </div>;
}
