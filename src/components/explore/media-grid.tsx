"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { parsePreviewKey, type ExploreMediaItem, type PreviewKey } from "@/lib/media/types";

import { MediaCard } from "@/components/explore/media-card";
import { MediaPreview } from "@/components/explore/media-preview";

type MediaGridProps = {
  items: ExploreMediaItem[];
};

export function MediaGrid({ items }: MediaGridProps) {
  const [membershipOverrides, setMembershipOverrides] = useState<Record<string, boolean>>({});
  const [preview, setPreview] = useState<PreviewKey | null>(null);
  const openedHere = useRef(false);
  const triggerId = useRef<string | null>(null);

  const restoreFocus = useCallback(() => {
    const target = triggerId.current ? document.getElementById(triggerId.current) : null;
    (target ?? document.getElementById("explore-search-input") ?? document.getElementById("main-content"))?.focus();
  }, []);
  useEffect(() => {
    const sync = () => {
      const key = parsePreviewKey(new URL(window.location.href).searchParams.get("preview"));
      setPreview(key);
      if (!key) window.setTimeout(restoreFocus, 0);
    };
    sync();
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, [restoreFocus]);
  const close = useCallback(() => {
    if (openedHere.current && window.history.state?.tracktvPreview) {
      openedHere.current = false;
      window.history.back();
      window.setTimeout(restoreFocus, 0);
      return;
    }
    const url = new URL(window.location.href);
    url.searchParams.delete("preview");
    window.history.replaceState(window.history.state, "", url);
    setPreview(null);
    restoreFocus();
  }, [restoreFocus]);
  const open = (item: ExploreMediaItem, id: string) => {
    const key = { mediaType: item.mediaType, tmdbId: item.tmdbId } satisfies PreviewKey;
    const url = new URL(window.location.href);
    url.searchParams.set("preview", `${key.mediaType}:${key.tmdbId}`);
    triggerId.current = id;
    openedHere.current = true;
    window.history.pushState({ ...(window.history.state ?? {}), tracktvPreview: true }, "", url);
    setPreview(key);
  };
  const renderedItems = items.map((item) => ({ ...item, inLibrary: membershipOverrides[`${item.mediaType}:${item.tmdbId}`] ?? item.inLibrary }));
  const immediate = preview ? renderedItems.find((item) => item.mediaType === preview.mediaType && item.tmdbId === preview.tmdbId) ?? null : null;
  return (
    <>
      <ul className="grid grid-cols-1 gap-2 sm:gap-4 min-[360px]:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
      {renderedItems.map((item) => (
        <li key={`${item.mediaType}-${item.tmdbId}`} className="min-w-0">
          <MediaCard item={item} onPreview={open} onMembershipChange={(inLibrary) => setMembershipOverrides((values) => ({ ...values, [`${item.mediaType}:${item.tmdbId}`]: inLibrary }))} />
        </li>
      ))}
      </ul>
      {preview ? <MediaPreview key={`${preview.mediaType}:${preview.tmdbId}`} previewKey={preview} immediate={immediate} onClose={close} onMovieAdded={() => setMembershipOverrides((values) => ({ ...values, [`${preview.mediaType}:${preview.tmdbId}`]: true }))} /> : null}
    </>
  );
}
