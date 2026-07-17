import Link from "next/link";
import { MediaPoster } from "@/components/media/media-poster";
import { ProgressBar } from "@/components/shows/progress-bar";
import { QuickEpisodeAction } from "@/components/shows/quick-episode-action";
import { ShowCard } from "@/components/shows/show-card";
import type { DerivedShow, RecentlyWatchedItem, WatchNextItem } from "@/lib/shows/watch-list";

function episodeNumber(season: number, episode: number) {
  return `S${String(season).padStart(2, "0")} | E${String(episode).padStart(2, "0")}`;
}

export function WatchListSection({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return <section className="space-y-3">
    <div>
      <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
      {description ? <p className="mt-1 text-sm text-[var(--muted)]">{description}</p> : null}
    </div>
    {children}
  </section>;
}

export function ShowGrid({ shows }: { shows: DerivedShow[] }) {
  return <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
    {shows.map((show) => <li key={show.membership.id}><ShowCard show={show} /></li>)}
  </ul>;
}

export function WatchNextGrid({ items }: { items: WatchNextItem[] }) {
  return <ul className="grid gap-4 lg:grid-cols-2">
    {items.map((item) => {
      return <li key={item.membership.id}>
        <article className="grid h-full grid-cols-[96px_1fr] overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] sm:grid-cols-[120px_1fr]">
          <Link href={`/shows/${item.media.tmdb_id}`} className="relative min-h-40 bg-[var(--surface-elevated)]">
            <MediaPoster source={item.media.poster_path} title={item.media.title} alt={`${item.media.title} poster`} sizes="120px" fallbackClassName="text-xl font-semibold text-[var(--muted)]" />
          </Link>
          <div className="flex min-w-0 flex-col justify-between gap-4 p-4">
            <div>
              <Link href={`/shows/${item.media.tmdb_id}`} className="font-semibold hover:underline">{item.media.title}</Link>
              <p className="mt-1 text-sm font-medium">{episodeNumber(item.episode.season_number, item.episode.episode_number)}</p>
              <p className="truncate text-sm text-[var(--muted)]">{item.episode.title}</p>
            </div>
            <ProgressBar progress={item.progress} />
            <QuickEpisodeAction tmdbId={item.media.tmdb_id} mediaId={item.media.id} episodeId={item.episode.id} watched={false} />
          </div>
        </article>
      </li>;
    })}
  </ul>;
}

export function RecentlyWatchedList({ items }: { items: RecentlyWatchedItem[] }) {
  const formatter = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" });
  return <ol className="divide-y divide-[var(--border)] overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
    {items.map((item) => <li key={item.watched.id} className="flex flex-col justify-between gap-3 p-4 sm:flex-row sm:items-center">
      <div className="min-w-0">
        <Link href={`/shows/${item.media.tmdb_id}`} className="font-semibold hover:underline">{item.media.title}</Link>
        <p className="text-sm">{episodeNumber(item.episode.season_number, item.episode.episode_number)} — {item.episode.title}</p>
        <time dateTime={item.watched.watched_at} className="text-sm text-[var(--muted)]">{formatter.format(new Date(item.watched.watched_at))} UTC</time>
      </div>
      <QuickEpisodeAction tmdbId={item.media.tmdb_id} mediaId={item.media.id} episodeId={item.episode.id} watched />
    </li>)}
  </ol>;
}

export function NeedsEpisodeDataGrid({ shows }: { shows: DerivedShow[] }) {
  return <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
    {shows.map((show) => <li key={show.membership.id} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
      <h3 className="font-semibold">{show.media.title}</h3>
      <p className="mt-2 text-sm text-[var(--muted)]">Episode data has not been synchronized yet.</p>
      <Link href={`/shows/${show.media.tmdb_id}`} className="mt-4 inline-block rounded-lg border border-[var(--border)] px-3 py-2 text-sm font-semibold">Open and synchronize</Link>
    </li>)}
  </ul>;
}
