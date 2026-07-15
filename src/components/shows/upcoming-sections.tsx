import Image from "next/image";
import Link from "next/link";
import { posterUrl, titleInitials } from "@/lib/media/types";
import { upcomingDateLabel, type UpcomingDateGroup, type UpcomingItem } from "@/lib/shows/upcoming";

function episodeNumber(season: number, episode: number) {
  return `S${String(season).padStart(2, "0")} | E${String(episode).padStart(2, "0")}`;
}

function Artwork({ item }: { item: UpcomingItem }) {
  const image = posterUrl(item.media.poster_path, "w185");
  return <Link href={`/shows/${item.media.tmdb_id}`} className="relative block min-h-28 bg-[var(--surface-elevated)]">
    {image ? <Image src={image} alt={`${item.media.title} poster`} fill className="object-cover" sizes="80px" /> : <span className="flex h-full items-center justify-center text-lg font-semibold text-[var(--muted)]">{titleInitials(item.media.title)}</span>}
  </Link>;
}

function UpcomingCard({ item, airDate }: { item: UpcomingItem; airDate: string }) {
  return <article className="grid grid-cols-[80px_1fr] overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
    <Artwork item={item} />
    <div className="min-w-0 p-4">
      <Link href={`/shows/${item.media.tmdb_id}`} className="font-semibold hover:underline">{item.media.title}</Link>
      {item.kind === "episode" ? <>
        <p className="mt-1 text-sm font-medium">{episodeNumber(item.episode.season_number, item.episode.episode_number)}</p>
        <p className="truncate text-sm text-[var(--muted)]">{item.episode.title}</p>
      </> : <details className="mt-1">
        <summary className="cursor-pointer text-sm"><span className="font-medium">Season {item.seasonNumber}</span><span className="block text-[var(--muted)]">{item.episodes.length} episodes releasing</span></summary>
        <ol className="mt-3 space-y-2 border-t border-[var(--border)] pt-3">
          {item.episodes.map((episode) => <li key={episode.id} className="text-sm"><span className="font-medium">{episodeNumber(episode.season_number, episode.episode_number)}</span><span className="text-[var(--muted)]"> — {episode.title}</span></li>)}
        </ol>
      </details>}
      <time dateTime={airDate} className="mt-2 block text-xs text-[var(--muted)]">{airDate}</time>
    </div>
  </article>;
}

export function UpcomingSections({ groups, today }: { groups: UpcomingDateGroup[]; today: string }) {
  return <div className="space-y-8">{groups.map((group) => <section key={group.airDate} className="space-y-3">
    <h2 className="text-2xl font-semibold tracking-tight">{upcomingDateLabel(group.airDate, today)}</h2>
    <ul className="grid gap-4 lg:grid-cols-2">{group.items.map((item) => <li key={item.key}><UpcomingCard item={item} airDate={group.airDate} /></li>)}</ul>
  </section>)}</div>;
}
