"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { removeMovie, setMovieWatched, toggleMovieFavourite, updateMovieWatchedAt, type MovieActionResult } from "@/app/actions/movies";
import type { UserMovie } from "@/types/database";

const button = "interactive-control touch-target max-w-full whitespace-normal rounded-lg border bg-[var(--surface)] px-3 py-2 text-sm font-semibold text-[var(--foreground)]";
function Message({ result }: { result: MovieActionResult | null }) { return result ? <div className="min-w-0 break-words text-sm">{result.error ? <p id="movie-date-error" className="text-[var(--danger)]" role="alert">{result.error}</p> : null}{result.success ? <p className="text-[var(--success)]" role="status">{result.success}</p> : null}</div> : null; }

export function MovieControls({ tmdbId, mediaId, membership }: { tmdbId: number; mediaId: string; membership: UserMovie }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [result, setResult] = useState<MovieActionResult | null>(null);
  const dateValue = membership.watched_at?.slice(0, 16) ?? "";
  const run = (task: () => Promise<MovieActionResult>) => start(async () => { const response = await task(); setResult(response); if (!response.error) router.refresh(); });
  return <section className="min-w-0 space-y-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5">
    <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap"><button className={button} disabled={pending} onClick={() => run(() => setMovieWatched(tmdbId, mediaId, !membership.watched_at))}>{pending ? "Saving…" : membership.watched_at ? "Mark unwatched" : "Mark watched"}</button><button className={button} disabled={pending} onClick={() => run(() => toggleMovieFavourite(tmdbId, mediaId, !membership.is_favourite))}><span aria-hidden="true">{membership.is_favourite ? "★" : "☆"}</span> {membership.is_favourite ? "Favourite" : "Add favourite"}</button></div>
    {membership.watched_at ? <div className="flex w-full min-w-0 max-w-full flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end"><label htmlFor="movie-watched-date" className="break-words text-sm">Watched date</label><div className="w-full min-w-0 max-w-full sm:w-auto"><input id="movie-watched-date" type="datetime-local" defaultValue={dateValue} max={new Date().toISOString().slice(0, 16)} aria-describedby={result?.error ? "movie-date-error" : undefined} aria-invalid={result?.error ? true : undefined} className="interactive-control touch-target block w-full min-w-0 max-w-full rounded-lg border bg-[var(--surface)] px-3 text-base text-[var(--foreground)] sm:w-auto sm:text-sm" /></div><button aria-label="Save movie watched date" className={button} disabled={pending} onClick={() => { const input = document.getElementById("movie-watched-date"); if (input instanceof HTMLInputElement) run(() => updateMovieWatchedAt(tmdbId, mediaId, input.value)); }}>Save date</button></div> : null}
    <div className="min-w-0"><button className={`${button} text-[var(--danger)]`} disabled={pending} onClick={() => { if (window.confirm("Remove this movie? Its watched date and favourite state will be permanently deleted.")) start(async () => { const response = await removeMovie(tmdbId, mediaId); setResult(response); if (!response.error) router.push("/movies"); }); }}>Remove from library</button><p className="mt-1 break-words text-xs text-[var(--muted)]">Removing this movie permanently deletes its watched date and favourite state. Shared movie metadata is kept.</p></div>
    <Message result={result} />
  </section>;
}
