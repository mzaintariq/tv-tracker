"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { removeMovie, setMovieWatched, toggleMovieFavourite, updateMovieWatchedAt, type MovieActionResult } from "@/app/actions/movies";
import type { UserMovie } from "@/types/database";

const button = "rounded-lg border border-[var(--border)] px-3 py-2 text-sm font-semibold disabled:opacity-50";
function Message({ result }: { result: MovieActionResult | null }) { return result ? <div aria-live="polite" className="text-sm">{result.error ? <p className="text-[var(--danger)]">{result.error}</p> : null}{result.success ? <p className="text-[var(--success)]">{result.success}</p> : null}</div> : null; }

export function MovieControls({ tmdbId, mediaId, membership }: { tmdbId: number; mediaId: string; membership: UserMovie }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [result, setResult] = useState<MovieActionResult | null>(null);
  const dateValue = membership.watched_at?.slice(0, 16) ?? "";
  const run = (task: () => Promise<MovieActionResult>) => start(async () => { const response = await task(); setResult(response); if (!response.error) router.refresh(); });
  return <section className="space-y-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
    <div className="flex flex-wrap gap-3"><button className={button} disabled={pending} onClick={() => run(() => setMovieWatched(tmdbId, mediaId, !membership.watched_at))}>{pending ? "Saving…" : membership.watched_at ? "Mark unwatched" : "Mark watched"}</button><button className={button} disabled={pending} onClick={() => run(() => toggleMovieFavourite(tmdbId, mediaId, !membership.is_favourite))}>{membership.is_favourite ? "★ Favourite" : "☆ Add favourite"}</button></div>
    {membership.watched_at ? <div className="flex flex-wrap items-end gap-2"><label className="text-sm">Watched date<input id="movie-watched-date" aria-label="Watched date" type="datetime-local" defaultValue={dateValue} max={new Date().toISOString().slice(0, 16)} className="mt-1 block rounded-lg border border-[var(--border)] bg-[var(--surface)] p-2" /></label><button className={button} disabled={pending} onClick={() => { const input = document.getElementById("movie-watched-date"); if (input instanceof HTMLInputElement) run(() => updateMovieWatchedAt(tmdbId, mediaId, input.value)); }}>Save date</button></div> : null}
    <div><button className={`${button} text-[var(--danger)]`} disabled={pending} onClick={() => { if (window.confirm("Remove this movie? Its watched date and favourite state will be permanently deleted.")) start(async () => { const response = await removeMovie(tmdbId, mediaId); setResult(response); if (!response.error) router.push("/movies"); }); }}>Remove from library</button><p className="mt-1 text-xs text-[var(--muted)]">Removing this movie permanently deletes its watched date and favourite state. Shared movie metadata is kept.</p></div>
    <Message result={result} />
  </section>;
}
