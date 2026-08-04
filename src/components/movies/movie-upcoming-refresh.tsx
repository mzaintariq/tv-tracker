"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { refreshStaleMovieUpcoming } from "@/app/actions/movies";

export function MovieUpcomingRefresh({ tmdbIds }: { tmdbIds: number[] }) {
  const attempted = useRef(false); const router = useRouter(); const [failed, setFailed] = useState<number | null>(null);
  useEffect(() => { if (attempted.current) return; attempted.current = true; void refreshStaleMovieUpcoming(tmdbIds).then((result) => { setFailed(result.failed); router.refresh(); }).catch(() => setFailed(tmdbIds.length)); }, [router, tmdbIds]);
  if (failed === null) return <p role="status" className="text-sm text-[var(--muted)]">Updating release metadata… Cached dates remain available.</p>;
  return failed > 0 ? <p role="status" className="text-sm text-[var(--warning)]"><span className="font-semibold">Warning:</span> Some release dates could not be refreshed. Showing available cached dates.</p> : null;
}
