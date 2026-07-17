import Link from "next/link";
import { MediaPoster } from "@/components/media/media-poster";
import { upcomingDateLabel, type UpcomingDateGroup, type UpcomingItem } from "@/lib/shows/upcoming";

function episodeNumber(season: number, episode: number) {
  return `S${String(season).padStart(2, "0")} | E${String(episode).padStart(2, "0")}`;
}

function Artwork({ item }: { item: UpcomingItem }) {
  return <Link href={`/shows/${item.media.tmdb_id}`} className="relative block min-h-24 bg-[var(--surface-elevated)] min-[360px]:min-h-28">
    <MediaPoster source={item.media.poster_path} title={item.media.title} alt={`${item.media.title} poster`} sizes="(max-width: 359px) 64px, 80px" tmdbSize="w185" fallbackClassName="text-lg font-semibold text-[var(--muted)]" />
  </Link>;
}

function UpcomingCard({ item, airDate }: { item: UpcomingItem; airDate: string }) {
  return <article className="grid min-w-0 grid-cols-[64px_minmax(0,1fr)] overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] min-[360px]:grid-cols-[80px_minmax(0,1fr)]">
    <Artwork item={item} />
    <div className="min-w-0 p-4">
      <Link href={`/shows/${item.media.tmdb_id}`} className="break-words font-semibold hover:underline">{item.media.title}</Link>
      {item.kind === "episode" ? <>
        <p className="mt-1 text-sm font-medium">{episodeNumber(item.episode.season_number, item.episode.episode_number)}</p>
        <p className="break-words text-sm text-[var(--muted)]">{item.episode.title}</p>
      </> : <details className="mt-1">
        <summary className="min-w-0 cursor-pointer break-words text-sm"><span className="font-medium">Season {item.seasonNumber}</span><span className="block break-words text-[var(--muted)]">{item.episodes.length} episodes releasing</span></summary>
        <ol className="mt-3 space-y-2 border-t border-[var(--border)] pt-3">
          {item.episodes.map((episode) => <li key={episode.id} className="break-words text-sm"><span className="font-medium">{episodeNumber(episode.season_number, episode.episode_number)}</span><span className="text-[var(--muted)]"> — {episode.title}</span></li>)}
        </ol>
      </details>}
      <time dateTime={airDate} className="mt-2 block text-xs text-[var(--muted)]">{airDate}</time>
    </div>
  </article>;
}

export function UpcomingSections({ groups, today }: { groups: UpcomingDateGroup[]; today: string }) {
  return <div className="min-w-0 space-y-8">{groups.map((group) => <section key={group.airDate} className="min-w-0 space-y-3">
    <h2 className="break-words text-2xl font-semibold tracking-tight">{upcomingDateLabel(group.airDate, today)}</h2>
    <ul className="grid min-w-0 gap-4 lg:grid-cols-2">{group.items.map((item) => <li key={item.key} className="min-w-0"><UpcomingCard item={item} airDate={group.airDate} /></li>)}</ul>
  </section>)}</div>;
}
