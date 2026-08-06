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
  const [pullDistance, setPullDistance] = useState(0);
  const touchStart = useRef<number | null>(null);
  const distanceRef = useRef(0);
  const inFlight = useRef(false);
  const wheelEligible = useRef<boolean | null>(null);

  const refresh = useCallback(() => {
    if (inFlight.current) return;
    inFlight.current = true;
    startTransition(async () => {
      try {
        const response = await refreshAction(tmdbId, mediaId);
        const message = response.error ?? [response.success, response.warning].filter(Boolean).join(" ") ?? "Metadata refreshed.";
        notify(message || "Metadata refreshed.", response.error ? "error" : "success");
        if (!response.error) router.refresh();
      } finally {
        inFlight.current = false;
      }
    });
  }, [mediaId, notify, refreshAction, router, tmdbId]);

  useEffect(() => {
    let wheelEndTimer: number | undefined;
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
    const wheel = (event: WheelEvent) => {
      if (wheelEligible.current === null) {
        wheelEligible.current = window.scrollY <= 0 && event.deltaY < 0 && !inFlight.current && !startsInsideHorizontalScroller(event.target);
      }
      if (wheelEligible.current && window.scrollY <= 0 && event.deltaY < 0) {
        const distance = Math.min(96, distanceRef.current + Math.abs(event.deltaY) * 0.35);
        distanceRef.current = distance;
        setPullDistance(distance);
      }
      if (wheelEndTimer !== undefined) window.clearTimeout(wheelEndTimer);
      wheelEndTimer = window.setTimeout(() => {
        const shouldRefresh = wheelEligible.current === true && distanceRef.current >= THRESHOLD;
        wheelEligible.current = null;
        reset();
        if (shouldRefresh) refresh();
      }, 180);
    };
    window.addEventListener("touchstart", start, { passive: true });
    window.addEventListener("touchmove", move, { passive: true });
    window.addEventListener("touchend", end, { passive: true });
    window.addEventListener("touchcancel", reset, { passive: true });
    window.addEventListener("wheel", wheel, { passive: true });
    return () => { if (wheelEndTimer !== undefined) window.clearTimeout(wheelEndTimer); window.removeEventListener("touchstart", start); window.removeEventListener("touchmove", move); window.removeEventListener("touchend", end); window.removeEventListener("touchcancel", reset); window.removeEventListener("wheel", wheel); };
  }, [refresh]);

  const ready = pullDistance >= THRESHOLD;
  return (
    <div className="min-w-0 space-y-1">
      <div aria-hidden={pullDistance === 0 && !pending} className={`fixed left-1/2 top-[calc(0.75rem+var(--safe-area-top))] z-40 max-w-[calc(100vw-1.5rem)] -translate-x-1/2 whitespace-nowrap rounded-full border border-[var(--control-border)] bg-[var(--surface)] px-4 py-2 text-sm font-semibold shadow-lg transition-opacity motion-reduce:transition-none ${pullDistance > 0 || pending ? "opacity-100" : "pointer-events-none opacity-0"}`} role="status">
        {pending ? "Refreshing metadata…" : ready ? "Release to refresh" : "Pull to refresh"}
      </div>
    </div>
  );
}
