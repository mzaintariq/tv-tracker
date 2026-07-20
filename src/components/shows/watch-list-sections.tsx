import Link from "next/link";
import { MediaPoster } from "@/components/media/media-poster";
import { formatSectionHeading } from "@/lib/shows/watch-list";
import { LimitedWatchListSection } from "@/components/shows/limited-watch-list-section";
import { ProgressBar } from "@/components/shows/progress-bar";
import { QuickEpisodeAction } from "@/components/shows/quick-episode-action";
import { ShowCard } from "@/components/shows/show-card";
import type { DerivedShow, RecentlyWatchedItem, WatchNextItem } from "@/lib/shows/watch-list";

function episodeNumber(season: number, episode: number) {
  return `S${String(season).padStart(2, "0")} | E${String(episode).padStart(2, "0")}`;
}

const SHOW_GRID_CLASS =
  "grid grid-cols-1 gap-4 min-[360px]:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4";
const RECENT_LIST_CLASS =
  "min-w-0 divide-y divide-[var(--border)] overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]";
const NEEDS_DATA_GRID_CLASS = "grid min-w-0 gap-4 sm:grid-cols-2 lg:grid-cols-3";

export function ShowGrid({ shows }: { shows: DerivedShow[] }) {
  return (
    <ul className={SHOW_GRID_CLASS}>
      {shows.map((show) => (
        <li key={show.membership.id} className="min-w-0">
          <ShowCard show={show} />
        </li>
      ))}
    </ul>
  );
}

export function WatchNextGrid({ items }: { items: WatchNextItem[] }) {
  return (
    <ul className="grid min-w-0 gap-4 lg:grid-cols-2">
      {items.map((item) => (
        <li key={item.membership.id} className="min-w-0">
          <article className="grid h-full min-w-0 grid-cols-[72px_minmax(0,1fr)] rounded-xl border border-[var(--border)] bg-[var(--surface)] min-[360px]:grid-cols-[88px_minmax(0,1fr)] sm:grid-cols-[120px_minmax(0,1fr)]">
            <Link
              href={`/shows/${item.media.tmdb_id}`}
              className="poster-interactive-surface relative min-h-32 overflow-hidden rounded-l-xl border border-transparent bg-[var(--surface-elevated)] sm:min-h-40"
            >
              <MediaPoster
                source={item.media.poster_path}
                title={item.media.title}
                alt={`${item.media.title} poster`}
                sizes="(max-width: 359px) 72px, (max-width: 639px) 88px, 120px"
                fallbackClassName="text-xl font-semibold text-[var(--muted)]"
              />
            </Link>
            <div className="flex min-w-0 flex-col justify-between gap-4 p-4">
              <div className="min-w-0">
                <Link href={`/shows/${item.media.tmdb_id}`} className="break-words font-semibold hover:underline">
                  {item.media.title}
                </Link>
                <p className="mt-1 text-sm font-medium">
                  {episodeNumber(item.episode.season_number, item.episode.episode_number)}
                </p>
                <p className="break-words text-sm text-[var(--muted)]">{item.episode.title}</p>
              </div>
              <ProgressBar progress={item.progress} />
              <QuickEpisodeAction
                tmdbId={item.media.tmdb_id}
                mediaId={item.media.id}
                episodeId={item.episode.id}
                watched={false}
              />
            </div>
          </article>
        </li>
      ))}
    </ul>
  );
}

export function RecentlyWatchedList({ items }: { items: RecentlyWatchedItem[] }) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  });
  return (
    <ol className={RECENT_LIST_CLASS}>
      {items.map((item) => (
        <li
          key={item.watched.id}
          className="flex min-w-0 flex-col justify-between gap-3 p-4 sm:flex-row sm:items-center"
        >
          <div className="min-w-0">
            <Link href={`/shows/${item.media.tmdb_id}`} className="break-words font-semibold hover:underline">
              {item.media.title}
            </Link>
            <p className="break-words text-sm">
              {episodeNumber(item.episode.season_number, item.episode.episode_number)} — {item.episode.title}
            </p>
            <time dateTime={item.watched.watched_at} className="break-words text-sm text-[var(--muted)]">
              {formatter.format(new Date(item.watched.watched_at))} UTC
            </time>
          </div>
          <QuickEpisodeAction
            tmdbId={item.media.tmdb_id}
            mediaId={item.media.id}
            episodeId={item.episode.id}
            watched
          />
        </li>
      ))}
    </ol>
  );
}

export function NeedsEpisodeDataGrid({ shows }: { shows: DerivedShow[] }) {
  return (
    <ul className={NEEDS_DATA_GRID_CLASS}>
      {shows.map((show) => (
        <li
          key={show.membership.id}
          className="min-w-0 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5"
        >
          <h3 className="break-words font-semibold">{show.media.title}</h3>
          <p className="mt-2 break-words text-sm text-[var(--muted)]">
            Episode data has not been synchronized yet.
          </p>
          <Link
            href={`/shows/${show.media.tmdb_id}`}
            className="interactive-control touch-target mt-4 inline-flex max-w-full items-center whitespace-normal rounded-lg border bg-[var(--surface)] px-3 py-2 text-sm font-semibold text-[var(--foreground)]"
          >
            Open and synchronize
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function WatchNextWatchListSection({
  items,
}: {
  items: WatchNextItem[];
}) {
  return (
    <section className="min-w-0 space-y-3">
      <div className="min-w-0">
        <h2 className="break-words text-2xl font-semibold tracking-tight">
          {formatSectionHeading("Watch Next", items.length)}
        </h2>
        <p className="mt-1 break-words text-sm text-[var(--muted)]">
          Continue shows you watched recently or that recently aired a new episode.
        </p>
      </div>
      {items.length ? (
        <WatchNextGrid items={items} />
      ) : (
        <p className="rounded-xl border border-dashed border-[var(--border)] p-6 text-center text-[var(--muted)]">
          No started shows have a released episode waiting.
        </p>
      )}
    </section>
  );
}

export function SecondaryShowSection({
  sectionId,
  title,
  description,
  shows,
}: {
  sectionId: string;
  title: string;
  description?: string;
  shows: DerivedShow[];
}) {
  if (!shows.length) return null;
  return (
    <LimitedWatchListSection
      sectionId={sectionId}
      title={title}
      description={description}
      totalCount={shows.length}
      listClassName={SHOW_GRID_CLASS}
    >
      {shows.map((show) => (
        <li key={show.membership.id} className="min-w-0">
          <ShowCard show={show} />
        </li>
      ))}
    </LimitedWatchListSection>
  );
}

export function SecondaryRecentlyWatchedSection({
  items,
}: {
  items: RecentlyWatchedItem[];
}) {
  if (!items.length) return null;
  const formatter = new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  });
  return (
    <details className="group min-w-0 rounded-xl border border-[var(--border)] bg-[var(--surface)]">
      <summary className="interactive-control touch-target flex cursor-pointer list-none items-center justify-between gap-3 rounded-xl px-4 py-3 marker:content-none [&::-webkit-details-marker]:hidden"><span className="text-2xl font-semibold">Recently Watched · {items.length}</span><span aria-hidden="true" className="text-xl group-open:rotate-90">›</span></summary>
      <div className="border-t border-[var(--border)] p-4"><LimitedWatchListSection
      sectionId="recently-watched"
      title="Recently Watched episodes"
      description="Your latest watched episodes from currently tracked shows."
      totalCount={items.length}
      listAs="ol"
      listClassName={RECENT_LIST_CLASS}
      showHeading={false}
    >
      {items.map((item) => (
        <li
          key={item.watched.id}
          className="flex min-w-0 flex-col justify-between gap-3 p-4 sm:flex-row sm:items-center"
        >
          <div className="min-w-0">
            <Link href={`/shows/${item.media.tmdb_id}`} className="break-words font-semibold hover:underline">
              {item.media.title}
            </Link>
            <p className="break-words text-sm">
              {episodeNumber(item.episode.season_number, item.episode.episode_number)} — {item.episode.title}
            </p>
            <time dateTime={item.watched.watched_at} className="break-words text-sm text-[var(--muted)]">
              {formatter.format(new Date(item.watched.watched_at))} UTC
            </time>
          </div>
          <QuickEpisodeAction
            tmdbId={item.media.tmdb_id}
            mediaId={item.media.id}
            episodeId={item.episode.id}
            watched
          />
        </li>
      ))}
    </LimitedWatchListSection></div></details>
  );
}

export function SecondaryNeedsEpisodeDataSection({
  shows,
}: {
  shows: DerivedShow[];
}) {
  if (!shows.length) return null;
  return (
    <LimitedWatchListSection
      sectionId="needs-episode-data"
      title="Needs Episode Data"
      description="Open these shows to synchronize their episodes before assigning a watch-list state."
      totalCount={shows.length}
      listClassName={NEEDS_DATA_GRID_CLASS}
    >
      {shows.map((show) => (
        <li
          key={show.membership.id}
          className="min-w-0 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5"
        >
          <h3 className="break-words font-semibold">{show.media.title}</h3>
          <p className="mt-2 break-words text-sm text-[var(--muted)]">
            Episode data has not been synchronized yet.
          </p>
          <Link
            href={`/shows/${show.media.tmdb_id}`}
            className="interactive-control touch-target mt-4 inline-flex max-w-full items-center whitespace-normal rounded-lg border bg-[var(--surface)] px-3 py-2 text-sm font-semibold text-[var(--foreground)]"
          >
            Open and synchronize
          </Link>
        </li>
      ))}
    </LimitedWatchListSection>
  );
}
