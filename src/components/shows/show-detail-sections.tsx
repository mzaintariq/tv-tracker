import type { ReactNode } from "react";
import type { CastProjection, ProviderGroups, TrailerProjection } from "@/lib/tmdb/extras-normalize";

const sectionClass = "min-w-0 space-y-2 sm:space-y-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 sm:p-6";

export function OptionalShowSectionSkeleton({ label }: { label: string }) {
  return <section aria-label={label} aria-busy="true" className={sectionClass}><p role="status" className="text-sm text-[var(--muted)]">Loading {label.toLowerCase()}…</p><div aria-hidden="true" className="h-16 rounded-lg bg-[var(--surface-elevated)]" /></section>;
}

export async function ShowProvidersSection({ regionLabel, promise }: { regionLabel: string | null; promise: Promise<ProviderGroups> | null }) {
  if (!regionLabel || !promise) return <Section title="Where to watch"><p className="text-xs sm:text-sm text-[var(--muted)]">Choose a release and streaming region in Profile Settings to see availability.</p></Section>;
  let providers: ProviderGroups;
  try { providers = await promise; } catch { return <LocalFailure title="Where to watch" />; }
  const labels = { stream: "Stream", free: "Free", ads: "Ad-supported", rent: "Rent", buy: "Buy" } as const;
  const available = (Object.keys(labels) as Array<keyof typeof labels>).filter((key) => providers.groups[key].length);
  return <Section title="Where to watch">
    <p className="text-xs sm:text-sm text-[var(--muted)]">Availability for {regionLabel}</p>
    {available.length ? <div className="space-y-3 sm:space-y-4">{available.map((category) => <div key={category}><div className="flex items-center gap-1"><ProviderCategoryIcon category={category} /><h3 className="text-xs font-semibold sm:text-sm">{labels[category]}</h3></div><ul aria-label={`${labels[category]} providers`} className="mt-1 flex min-w-0 gap-1 overflow-x-auto whitespace-nowrap [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:flex-wrap sm:gap-2 sm:overflow-x-visible sm:whitespace-normal">{providers.groups[category].map((provider) => <li key={provider.providerId} className="shrink-0 rounded-full bg-[var(--surface-elevated)] px-2 py-1 text-xs sm:px-3 sm:py-2 sm:text-sm">{provider.providerName}</li>)}</ul></div>)}</div> : <p className="text-xs sm:text-sm text-[var(--muted)]">No watch providers are currently listed for this region.</p>}
    <p className="text-xs text-[var(--muted)]">Availability data supplied by JustWatch via TMDB.{providers.attributionLink ? <> <a className="underline underline-offset-4" href={providers.attributionLink} target="_blank" rel="noopener noreferrer">View availability on TMDB<span className="sr-only"> (opens in a new tab)</span></a>.</> : null}</p>
  </Section>;
}

export async function ShowCreditsSection({ creators, promise }: { creators: Array<{ id: number; name: string }>; promise: Promise<CastProjection[]> }) {
  let cast: CastProjection[];
  try { cast = await promise; } catch { return <LocalFailure title="Cast and creators" />; }
  if (!creators.length && !cast.length) return null;
  return <Section title="Cast and creators">
    {creators.length ? <div><h3 className="text-xs sm:text-sm font-semibold">{creators.length === 1 ? "Creator" : "Creators"}</h3><p className="text-xs sm:text-sm sm:mt-1">{creators.map((creator) => creator.name).join(", ")}</p></div> : null}
    {cast.length ? <div><h3 className="text-xs sm:text-sm font-semibold">Top cast</h3><ul aria-label="Top cast" className="mt-1 sm:mt-2 grid min-w-0 grid-cols-2 gap-1 sm:grid-cols-5 sm:gap-2">{cast.map((person) => <li key={person.personId} className="min-w-0 rounded-lg bg-[var(--surface-elevated)] p-2 sm:p-3"><p className="break-words text-xs sm:text-sm font-medium">{person.name}</p>{person.character ? <p className="break-words text-xs sm:text-sm text-[var(--muted)]">as {person.character}</p> : null}</li>)}</ul></div> : null}
  </Section>;
}

export async function ShowTrailerSection({ promise }: { promise: Promise<TrailerProjection | null> }) {
  let trailer: TrailerProjection | null;
  try { trailer = await promise; } catch { return null; }
  if (!trailer) return null;
  return <a className="inline-flex max-w-full items-center gap-1 rounded-full border border-[var(--control-border)] px-2 py-1 text-xs font-semibold sm:px-3 sm:text-sm" href={`https://www.youtube.com/watch?v=${encodeURIComponent(trailer.key)}`} target="_blank" rel="noopener noreferrer"><svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="2 2 20 20"><path d="M6.51 18.87c.15.09.32.13.49.13s.36-.05.51-.14l10-6c.3-.18.49-.51.49-.86s-.18-.68-.49-.86l-10-6a.99.99 0 0 0-1.01-.01c-.31.18-.51.51-.51.87v12c0 .36.19.69.51.87Z" /></svg>Trailer<span className="sr-only">: {trailer.name} on YouTube (opens in a new tab)</span></a>;
}

export async function ShowExternalLinks({ fallback, promise }: { fallback: { tmdb: string; imdb: string | null; homepage: string | null }; promise: Promise<{ tmdb: string; imdb: string | null; homepage: string | null }> }) {
  let links = fallback;
  try { links = await promise; } catch { /* Safe persisted links remain useful. */ }
  const destinations = [["Official website", links.homepage], ["TMDB", links.tmdb], ["IMDb", links.imdb]].filter((entry): entry is [string, string] => Boolean(entry[1]));
  if (!destinations.length) return null;
  return <div className="min-w-0"><dt className="text-xs sm:text-sm font-semibold">Open in</dt><dd className="mt-1 flex min-w-0 flex-wrap gap-2">{destinations.map(([label, url]) => <a key={label} className="inline-flex max-w-full items-center rounded-full border border-[var(--control-border)] px-2 py-1 text-xs font-semibold" href={url} target="_blank" rel="noopener noreferrer">{label === "Official website" ? "Web" : label}<span className="sr-only"> (opens in a new tab)</span></a>)}</dd></div>;
}

function Section({ title, children }: { title: string; children: ReactNode }) { return <div className="space-y-1 sm:space-y-2"><h2 className="text-lg sm:text-xl font-semibold">{title}</h2><section className={sectionClass}>{children}</section></div>; }
function LocalFailure({ title }: { title: string }) { return <section className={sectionClass}><h2 className="text-lg font-semibold sm:text-xl">{title}</h2><p role="alert" className="text-sm text-[var(--muted)]">This information is temporarily unavailable. The rest of the show page is still available.</p></section>; }

function ProviderCategoryIcon({ category }: { category: keyof ProviderGroups["groups"] }) {
  if (category === "stream") return <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="2 2 20 20"><path d="M6.51 18.87c.15.09.32.13.49.13s.36-.05.51-.14l10-6c.3-.18.49-.51.49-.86s-.18-.68-.49-.86l-10-6a.99.99 0 0 0-1.01-.01c-.31.18-.51.51-.51.87v12c0 .36.19.69.51.87Z" /></svg>;
  if (category === "rent") return <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M21 4H6.17l-.18-1.15C5.91 2.36 5.49 2 5 2H2v2h2.14l1.87 12.15c.08.49.5.85.99.85h12v-2H7.86l-.31-2H19c.45 0 .84-.3.96-.73l2-7a.99.99 0 0 0-.16-.88c-.19-.25-.49-.4-.8-.4ZM8 18a2 2 0 1 0 0 4 2 2 0 1 0 0-4m9 0a2 2 0 1 0 0 4 2 2 0 1 0 0-4" /></svg>;
  if (category === "buy") return <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M13.71 3.29A1 1 0 0 0 13 3H4c-.55 0-1 .45-1 1v9c0 .27.11.52.29.71l8 8c.2.2.45.29.71.29s.51-.1.71-.29l9-9a.996.996 0 0 0 0-1.41zM9 11c-1.11 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2" /></svg>;
  return null;
}
