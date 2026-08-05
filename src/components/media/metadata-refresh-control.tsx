"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useNotifications } from "@/components/ui/notifications";

const THRESHOLD = 64;
type RefreshResult = { error?: string; success?: string; warning?: string };

function startsInsideHorizontalScroller(target: EventTarget | null): boolean {
  let element = target instanceof Element ? target : null;
  while (element && element !== document.documentElement) {
    const style = window.getComputedStyle(element);
    if ((style.overflowX === "auto" || style.overflowX === "scroll") && element.scrollWidth > element.clientWidth) return true;
    element = element.parentElement;
  }
  return false;
}

export function MetadataRefreshControl({ tmdbId, mediaId, refreshAction }: { tmdbId: number; mediaId?: string; refreshAction: (tmdbId: number, mediaId: string | undefined) => Promise<RefreshResult> }) {
  const router = useRouter();
  const { notify } = useNotifications();
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<RefreshResult | null>(null);
  const [pullDistance, setPullDistance] = useState(0);
  const touchStart = useRef<number | null>(null);
  const distanceRef = useRef(0);
  const inFlight = useRef(false);

  const refresh = useCallback(() => {
    if (inFlight.current) return;
    inFlight.current = true;
    setResult(null);
    startTransition(async () => {
      try {
        const response = await refreshAction(tmdbId, mediaId);
        setResult(response);
        notify(response.error ?? response.success ?? "Metadata refreshed.", response.error ? "error" : "success");
        if (!response.error) router.refresh();
      } finally {
        inFlight.current = false;
      }
    });
  }, [mediaId, notify, refreshAction, router, tmdbId]);

  useEffect(() => {
    if (!window.matchMedia("(pointer: coarse)").matches) return;
    const reset = () => { touchStart.current = null; distanceRef.current = 0; setPullDistance(0); };
    const start = (event: TouchEvent) => {
      if (window.scrollY <= 0 && event.touches.length === 1 && !inFlight.current && !startsInsideHorizontalScroller(event.target)) touchStart.current = event.touches[0].clientY;
    };
    const move = (event: TouchEvent) => {
      if (touchStart.current === null || window.scrollY > 0 || event.touches.length !== 1) return;
      const distance = Math.min(96, Math.max(0, (event.touches[0].clientY - touchStart.current) * 0.5));
      distanceRef.current = distance; setPullDistance(distance);
    };
    const end = () => { const shouldRefresh = distanceRef.current >= THRESHOLD; reset(); if (shouldRefresh) refresh(); };
    window.addEventListener("touchstart", start, { passive: true });
    window.addEventListener("touchmove", move, { passive: true });
    window.addEventListener("touchend", end, { passive: true });
    window.addEventListener("touchcancel", reset, { passive: true });
    return () => { window.removeEventListener("touchstart", start); window.removeEventListener("touchmove", move); window.removeEventListener("touchend", end); window.removeEventListener("touchcancel", reset); };
  }, [refresh]);

  const ready = pullDistance >= THRESHOLD;
  return (
    <div className="min-w-0 space-y-1">
      <div aria-hidden={pullDistance === 0 && !pending} className={`fixed left-1/2 top-[calc(0.75rem+var(--safe-area-top))] z-40 max-w-[calc(100vw-1.5rem)] -translate-x-1/2 whitespace-nowrap rounded-full border border-[var(--control-border)] bg-[var(--surface)] px-4 py-2 text-sm font-semibold shadow-lg transition-opacity motion-reduce:transition-none ${pullDistance > 0 || pending ? "opacity-100" : "pointer-events-none opacity-0"}`} role="status">
        {pending ? "Refreshing metadata…" : ready ? "Release to refresh" : "Pull to refresh"}
      </div>
      <button className="interactive-control touch-target max-w-full rounded-lg border bg-[var(--surface)] px-3 py-2 text-sm font-semibold" disabled={pending} onClick={refresh}>
        {pending ? "Refreshing…" : "Refresh Metadata"}
      </button>
      {result?.error ? <p role="alert" className="break-words text-sm text-[var(--danger)]">{result.error}</p> : null}
      {result?.success ? <p role="status" className="break-words text-sm text-[var(--success)]">{result.success}</p> : null}
      {result?.warning ? <p className="break-words text-sm text-[var(--warning)]"><span className="font-semibold">Warning:</span> {result.warning}</p> : null}
    </div>
  );
}
