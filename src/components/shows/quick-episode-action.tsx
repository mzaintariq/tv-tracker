"use client";

import { useTransition } from "react";
import { setEpisodeWatched } from "@/app/actions/shows";
import { useNotifications } from "@/components/ui/notifications";

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
  const { notify } = useNotifications();
  const [pending, startTransition] = useTransition();
  const label = watched ? "Undo" : "Mark Watched";

  return (
    <div className="min-w-0 space-y-1">
      <button
        type="button"
        disabled={pending}
        className="w-full cursor-pointer whitespace-normal rounded-lg bg-[var(--accent)] px-2 py-2 sm:px-3 sm:py-2 text-xs sm:text-sm font-semibold text-[var(--accent-foreground)] transition-colors hover:bg-[color-mix(in_srgb,var(--accent)_88%,var(--foreground))]"
        onClick={() =>
          startTransition(async () => {
            const response = await setEpisodeWatched(
              tmdbId,
              mediaId,
              episodeId,
              !watched,
            );
            notify(
              response.error ?? response.success ?? "Episode updated.",
              response.error ? "error" : "success",
            );
          })
        }
      >
        {pending ? "Saving…" : label}
      </button>
    </div>
  );
}
