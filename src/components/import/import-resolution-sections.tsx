"use client";

import { useMemo, useState } from "react";

import { skipUnresolvedImportItemsByType } from "@/app/actions/imports";
import type { CandidateDisplay } from "@/lib/import/tv-time/matching-quality";
import { mutationError } from "@/lib/import/tv-time/ui-state";
import { ResolutionControls } from "./import-controls";
import { notifyResolutionRefresh } from "./resolution-events";

export type ResolutionItem = { id: string; mediaType: "tv" | "movie"; sourceTitle: string; matchStatus: string; importMode: string; candidates: number[]; candidateMetadata: CandidateDisplay[] };
type Filter = "all" | "ambiguous" | "unmatched";

function ResolutionSection({ importId, mediaType, items }: { importId: string; mediaType: "tv" | "movie"; items: ResolutionItem[] }) {
  const [filter, setFilter] = useState<Filter>("all"); const [search, setSearch] = useState(""); const [pending, setPending] = useState(false); const [message, setMessage] = useState<string | null>(null);
  const label = mediaType === "tv" ? "TV shows" : "Movies";
  const visible = useMemo(() => items.filter((item) => (filter === "all" || (filter === "ambiguous" ? item.matchStatus === "ambiguous" : item.matchStatus !== "ambiguous")) && item.sourceTitle.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())), [filter, items, search]);
  const skipAll = async () => {
    if (!window.confirm(`Skip all ${items.length} unresolved ${label.toLocaleLowerCase()}? Confirmed, pending, matching, applied, and episode-coordinate records will not change.`)) return;
    setPending(true); setMessage(null); const result = await skipUnresolvedImportItemsByType(importId, mediaType); setPending(false); setMessage(result.error ? mutationError(result) : result.success ?? null); if (!result.error) notifyResolutionRefresh(importId);
  };
  const searchId = `resolution-search-${mediaType}`;
  return <section className="min-w-0 space-y-3"><div className="min-w-0"><h2 className="break-words text-xl font-semibold">{label} needing resolution ({items.length})</h2><div className="mt-3 flex flex-wrap gap-2" role="group" aria-label={`Filter unresolved ${label.toLocaleLowerCase()}`}><button className="max-w-full whitespace-normal rounded-lg border px-3 py-2" aria-pressed={filter === "all"} onClick={() => setFilter("all")}>All</button><button className="max-w-full whitespace-normal rounded-lg border px-3 py-2" aria-pressed={filter === "ambiguous"} onClick={() => setFilter("ambiguous")}>Several possible matches</button><button className="max-w-full whitespace-normal rounded-lg border px-3 py-2" aria-pressed={filter === "unmatched"} onClick={() => setFilter("unmatched")}>No match found</button></div>{items.length > 10 ? <div className="mt-3 min-w-0"><label htmlFor={searchId} className="block break-words text-sm font-medium">Search unresolved {label.toLocaleLowerCase()}</label><input id={searchId} className="mt-2 w-full min-w-0 max-w-sm rounded-lg border px-3 py-2" placeholder="Search by title" value={search} onChange={(event) => setSearch(event.target.value)} /></div> : null}</div><button disabled={pending || items.length === 0} className="max-w-full whitespace-normal rounded-lg border px-3 py-2 text-[var(--danger)]" onClick={() => void skipAll()}>{pending ? "Skipping…" : `Skip all unresolved ${label} (${items.length})`}</button>{message ? <p className="break-words" role={message.includes("could not") ? "alert" : "status"}>{message}</p> : null}{visible.map((item) => <article key={item.id} className="min-w-0 space-y-2 rounded-xl border p-4"><p className="break-words font-medium">{item.sourceTitle} <span className="text-[var(--muted)]">({item.mediaType === "tv" ? "TV show" : "Movie"})</span></p><p className="break-words text-sm text-[var(--muted)]">{item.matchStatus === "ambiguous" ? "Several possible matches" : "No match found"}</p><ResolutionControls importId={importId} itemId={item.id} itemLabel={item.sourceTitle} candidates={item.candidates} candidateMetadata={item.candidateMetadata} /></article>)}</section>;
}

export function ImportResolutionSections({ importId, items }: { importId: string; items: ResolutionItem[] }) {
  const sorted = [...items].sort((left, right) => left.sourceTitle.localeCompare(right.sourceTitle, undefined, { sensitivity: "base" }));
  const tv = sorted.filter((item) => item.mediaType === "tv"); const movies = sorted.filter((item) => item.mediaType === "movie");
  return <div className="space-y-8">{tv.length ? <ResolutionSection importId={importId} mediaType="tv" items={tv} /> : null}{movies.length ? <ResolutionSection importId={importId} mediaType="movie" items={movies} /> : null}{!items.length ? <p className="text-[var(--muted)]">No media needs manual resolution.</p> : null}</div>;
}
