import Link from "next/link";
import { MediaPoster } from "@/components/media/media-poster";
import { yearFromDate } from "@/lib/media/types";
import type { ShowCardData } from "@/lib/shows/data";
import { ProgressBar } from "@/components/shows/progress-bar";

export function ShowCard({ show }: { show: ShowCardData }) { return <article className="min-w-0 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]"><Link href={`/shows/${show.media.tmdb_id}`} className="block min-w-0"><div className="relative aspect-[2/3] max-w-full bg-[var(--surface-elevated)]"><MediaPoster source={show.media.poster_path} title={show.media.title} alt="" sizes="(max-width: 359px) 100vw, (max-width: 640px) 50vw, 25vw" /></div><div className="min-w-0 space-y-3 p-4"><div className="min-w-0"><h2 className="break-words font-semibold">{show.media.title} {show.membership.is_favourite ? <><span aria-hidden="true">★</span><span className="sr-only"> Favourite.</span></> : null}</h2><p className="break-words text-sm capitalize text-[var(--muted)]">{yearFromDate(show.media.release_date) ?? "Year unknown"} · {show.membership.status}</p></div><ProgressBar progress={show.progress} /></div></Link></article>; }
