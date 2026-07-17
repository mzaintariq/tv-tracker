"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { refreshStaleUpcoming, type UpcomingRefreshResult } from "@/app/actions/shows";

export function UpcomingRefreshCoordinator({ tmdbIds }: { tmdbIds: number[] }) {
  const attempted = useRef(false);
  const router = useRouter();
  const [updating, setUpdating] = useState(true);
  const [result, setResult] = useState<UpcomingRefreshResult | null>(null);

  useEffect(() => {
    if (attempted.current) return;
    attempted.current = true;
    void refreshStaleUpcoming(tmdbIds).then((response) => {
      setResult(response);
      setUpdating(false);
      router.refresh();
    }).catch(() => {
      setResult({ attempted: tmdbIds.length, failed: tmdbIds.length, partial: 0 });
      setUpdating(false);
    });
  }, [router, tmdbIds]);

  if (updating) return <p role="status" className="text-sm text-[var(--muted)]">Updating episode data… Cached releases remain available.</p>;
  if (result && (result.failed > 0 || result.partial > 0)) return <p role="status" className="text-sm text-[var(--warning)]"><span className="font-semibold">Warning:</span> Some episode data could not be refreshed. Showing available cached releases.</p>;
  return null;
}
