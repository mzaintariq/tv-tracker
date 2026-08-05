import type { ReactNode } from "react";
import type { CastProjection, DirectorProjection, ProviderGroups, TrailerProjection } from "@/lib/tmdb/extras-normalize";

const sectionClass = "min-w-0 space-y-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-6";
const linkClass = "interactive-control touch-target inline-flex max-w-full items-center rounded-lg border border-[var(--control-border)] px-3 py-2 font-semibold";

export function OptionalSectionSkeleton({ label }: { label: string }) {
  return <section aria-label={label} aria-busy="true" className={sectionClass}><p role="status" className="text-sm text-[var(--muted)]">Loading {label.toLowerCase()}…</p><div aria-hidden="true" className="h-16 rounded-lg bg-[var(--surface-elevated)]" /></section>;
}

export async function ProvidersSection({ regionLabel, promise }: { regionLabel: string | null; promise: Promise<ProviderGroups> | null }) {
  if (!regionLabel || !promise) return <section className={sectionClass}><h2 className="text-2xl font-semibold">Where to watch</h2><p className="text-[var(--muted)]">Choose a release and streaming region in Profile Settings to see availability.</p></section>;
  let providers: ProviderGroups;
  try { providers = await promise; } catch { return <LocalFailure title="Where to watch" />; }
  const labels = { stream: "Stream", free: "Free", ads: "Ad-supported", rent: "Rent", buy: "Buy" } as const;
  const available = Object.entries(providers.groups).filter((entry) => entry[1].length) as Array<[keyof typeof labels, ProviderGroups["groups"][keyof typeof labels]]>;
  return <section className={sectionClass}><div><h2 className="text-2xl font-semibold">Where to watch</h2><p className="text-sm text-[var(--muted)]">Availability in {regionLabel}</p></div>{available.length ? <div className="space-y-4">{available.map(([category, items]) => <div key={category}><h3 className="font-semibold">{labels[category]}</h3><ul aria-label={`${labels[category]} providers`} className="mt-2 flex min-w-0 flex-wrap gap-2">{items.map((provider) => <li key={provider.providerId} className="rounded-full border border-[var(--control-border)] px-3 py-2 text-sm">{provider.providerName}</li>)}</ul></div>)}</div> : <p className="text-[var(--muted)]">No watch providers are currently listed for this region.</p>}{providers.attributionLink ? <p className="text-sm text-[var(--muted)]">Availability data supplied by JustWatch via TMDB. <a className="underline underline-offset-4" href={providers.attributionLink} target="_blank" rel="noopener noreferrer">View availability on TMDB<span className="sr-only"> (opens in a new tab)</span></a>.</p> : <p className="text-sm text-[var(--muted)]">Availability data supplied by JustWatch via TMDB.</p>}</section>;
}

export async function CreditsSection({ promise }: { promise: Promise<{ cast: CastProjection[]; directors: DirectorProjection[] }> }) {
  let credits: { cast: CastProjection[]; directors: DirectorProjection[] };
  try { credits = await promise; } catch { return <LocalFailure title="Cast and creators" />; }
  if (!credits.cast.length && !credits.directors.length) return null;
  return <section className={sectionClass}><h2 className="text-2xl font-semibold">Cast and creators</h2>{credits.directors.length ? <div><h3 className="font-semibold">{credits.directors.length === 1 ? "Director" : "Directors"}</h3><p className="mt-1 break-words">{credits.directors.map((director) => director.name).join(", ")}</p></div> : null}{credits.cast.length ? <div><h3 className="font-semibold">Top cast</h3><ul className="mt-2 grid min-w-0 gap-2 sm:grid-cols-2">{credits.cast.map((person) => <li key={person.personId} className="min-w-0 rounded-lg bg-[var(--surface-elevated)] p-3"><p className="break-words font-medium">{person.name}</p>{person.character ? <p className="break-words text-sm text-[var(--muted)]">as {person.character}</p> : null}</li>)}</ul></div> : null}</section>;
}

export async function TrailerSection({ promise }: { promise: Promise<TrailerProjection | null> }) {
  let trailer: TrailerProjection | null;
  try { trailer = await promise; } catch { return <LocalFailure title="Trailer" />; }
  if (!trailer) return null;
  const url = `https://www.youtube.com/watch?v=${encodeURIComponent(trailer.key)}`;
  return <section className={sectionClass}><h2 className="text-2xl font-semibold">Trailer</h2><p className="break-words">{trailer.name}</p><a className={linkClass} href={url} target="_blank" rel="noopener noreferrer">Watch trailer on YouTube<span className="sr-only"> (opens in a new tab)</span></a></section>;
}

export async function ExternalLinksSection({ fallback, promise }: { fallback: { tmdb: string; imdb: string | null; homepage: string | null }; promise: Promise<{ tmdb: string; imdb: string | null; homepage: string | null }> }) {
  let links = fallback;
  try { links = await promise; } catch { /* Persisted trusted IDs still provide safe links. */ }
  const destinations: Array<[string, string | null]> = [["View on TMDB", links.tmdb], ["View on IMDb", links.imdb], ["Visit official website", links.homepage]];
  const available = destinations.filter((entry): entry is [string, string] => Boolean(entry[1]));
  if (!available.length) return null;
  return <section className={sectionClass}><h2 className="text-2xl font-semibold">External links</h2><div className="flex min-w-0 flex-wrap gap-2">{available.map(([label, url]) => <a key={label} className={linkClass} href={url} target="_blank" rel="noopener noreferrer">{label}<span className="sr-only"> (opens in a new tab)</span></a>)}</div></section>;
}

function LocalFailure({ title }: { title: string }): ReactNode {
  return <section className={sectionClass}><h2 className="text-2xl font-semibold">{title}</h2><p role="alert" className="text-[var(--muted)]">This information is temporarily unavailable. The rest of the movie page is still available.</p></section>;
}
