"use client";

import Image from "next/image";
import { useState } from "react";

import { buildImportIssueDisplayModel, issueStatusLabel, issueTypeLabel, type ImportIssueForDisplay } from "@/lib/import/tv-time/issues-ui";
import { posterUrl } from "@/lib/media/types";
import { IssueDecision } from "./import-controls";

function DisclosureButton({ expanded, controls, children, onClick }: { expanded: boolean; controls: string; children: React.ReactNode; onClick: () => void }) {
  return <button type="button" className="flex w-full items-center justify-between gap-3 text-left" aria-expanded={expanded} aria-controls={controls} onClick={onClick}><span>{children}</span><span aria-hidden="true">{expanded ? "▾" : "▸"}</span></button>;
}

function CoordinateText({ issue }: { issue: ImportIssueForDisplay }) {
  return <><p className="font-medium">{issue.sourceTitle ?? "Unknown show"} — Season {issue.seasonNumber ?? "?"}, Episode {issue.episodeNumber ?? "?"}</p><p className="text-sm text-[var(--muted)]">{issue.status === "resolved" ? "This episode was previously unavailable in TMDB metadata and was imported after metadata reconciliation." : "No matching TMDB episode was found. This individual history record will not be imported."}</p>{issue.seasonNumber === 0 ? <p className="text-sm text-[var(--muted)]">Specials are also excluded from normal progress.</p> : null}</>;
}

function IssueRow({ importId, issue }: { importId: string; issue: ImportIssueForDisplay }) {
  const active = issue.status === "open" && issue.is_blocking;
  const image = posterUrl(issue.selectedCandidate?.posterPath ?? null, "w92");
  return <article className="space-y-2 rounded-lg border p-3">
    {issue.issue_type === "missing_episode_coordinate" ? <CoordinateText issue={issue} /> : <>
      <p className="font-medium">{issue.issue_type === "movie_favourites_confirmation" ? issueTypeLabel(issue.issue_type) : issue.sourceTitle ?? issueTypeLabel(issue.issue_type)}</p>
      <p className="text-sm text-[var(--muted)]">{issue.mediaType ? `${issue.mediaType === "tv" ? "TV show" : "Movie"} · ` : ""}{issueStatusLabel(issue.status)}</p>
      {issue.issue_type === "movie_favourites_confirmation" && issue.status === "open" ? <><p className="text-sm">TV Time’s export does not identify which cached movies were favourites. Choose whether to apply the importer’s possible movie-favourite records.</p><p className="text-sm text-[var(--muted)]">This decision must be made before the import can be applied.</p></> : null}
      {issue.status === "resolved" && issue.selectedTmdbId ? <div className="flex items-center gap-3">{image ? <Image src={image} alt="" width={46} height={69} className="rounded object-cover" /> : null}<p className="text-sm">Matched to {issue.selectedCandidate?.title ?? "TMDB title"}{issue.selectedCandidate?.year ? ` (${issue.selectedCandidate.year})` : ""} · TMDB {issue.selectedTmdbId}</p></div> : null}
      {issue.status === "skipped" && issue.mediaType ? <p className="text-sm">{issue.mediaType === "tv" ? "TV show" : "Movie"} · Skipped from this import</p> : null}
    </>}
    {active ? <span className="inline-block rounded-full border border-[var(--danger)] px-2 py-0.5 text-xs text-[var(--danger)]">Blocking</span> : null}
    {issue.issue_type === "movie_favourites_confirmation" && issue.status === "open" ? <IssueDecision importId={importId} issueId={issue.id} /> : null}
  </article>;
}

function Notice({ issue }: { issue: ImportIssueForDisplay }) {
  if (issue.issue_type === "aggregate_count_discrepancy") return <article className="rounded-lg border p-3"><p className="font-medium">TV Time movie totals differed</p><p className="text-sm text-[var(--muted)]">The export summary reported {issue.cachedCount ?? "an unknown number of"} cached movies while {issue.detailedCount ?? "the available"} detailed movie records were present. The importer uses the detailed records as authoritative. No action is required.</p></article>;
  return <article className="rounded-lg border p-3"><p className="font-medium">{issueTypeLabel(issue.issue_type)}</p><p className="text-sm text-[var(--muted)]">Informational only. No action is required.</p></article>;
}

function CoordinateNoticeGroups({ importId, issues, groups, toggle }: { importId: string; issues: ImportIssueForDisplay[]; groups: Set<string>; toggle: (key: string) => void }) {
  const byShow = new Map<string, ImportIssueForDisplay[]>();
  for (const issue of issues) { const key = issue.importItemId ?? `title:${issue.sourceTitle ?? "unknown"}`; byShow.set(key, [...(byShow.get(key) ?? []), issue]); }
  const sorted = [...byShow.entries()].map(([key, rows]) => [key, rows.sort((left, right) => (left.seasonNumber ?? 0) - (right.seasonNumber ?? 0) || (left.episodeNumber ?? 0) - (right.episodeNumber ?? 0))] as const).sort((left, right) => (left[1][0]?.sourceTitle ?? "Unknown show").localeCompare(right[1][0]?.sourceTitle ?? "Unknown show", undefined, { sensitivity: "base" }));
  return <div className="space-y-2">{sorted.map(([key, rows], index) => { const stateKey = `excluded-show:${key}`; const open = groups.has(stateKey); const controls = `excluded-show-${index}`; return <section key={key} className="rounded-lg border p-3"><DisclosureButton expanded={open} controls={controls} onClick={() => toggle(stateKey)}><span>{rows[0]?.sourceTitle ?? "Unknown show"} — {rows.length} record{rows.length === 1 ? "" : "s"}</span></DisclosureButton>{open ? <div id={controls} className="mt-3 space-y-2">{rows.map((issue) => <IssueRow key={issue.id} importId={importId} issue={issue} />)}</div> : null}</section>; })}</div>;
}

export function ImportIssuesDisclosure({ importId, issues, initialExpanded, initialCompletedExpanded = false, initialExpandedGroups = [] }: { importId: string; issues: ImportIssueForDisplay[]; initialExpanded?: boolean; initialCompletedExpanded?: boolean; initialExpandedGroups?: string[] }) {
  const model = buildImportIssueDisplayModel(issues); const [expanded, setExpanded] = useState(initialExpanded ?? model.openBlocking > 0); const [attention, setAttention] = useState(model.needsAttention.length > 0); const [completed, setCompleted] = useState(initialCompletedExpanded); const [groups, setGroups] = useState(() => new Set(initialExpandedGroups));
  if (!model.total) return null;
  const toggle = (key: string) => setGroups((current) => { const next = new Set(current); if (next.has(key)) next.delete(key); else next.add(key); return next; });
  return <section className="rounded-xl border p-4"><DisclosureButton expanded={expanded} controls="import-issues-content" onClick={() => setExpanded((value) => !value)}><span className="font-semibold">Decisions and issues ({model.total})<span className="mt-1 block text-sm font-normal text-[var(--muted)]">{model.openBlocking} open blocking · {model.openNonBlocking} informational · {model.resolved} resolved · {model.skipped} skipped</span></span></DisclosureButton>{expanded ? <div id="import-issues-content" className="mt-4 space-y-4">
    {model.needsAttention.length ? <section className="rounded-lg border p-3"><DisclosureButton expanded={attention} controls="issues-attention" onClick={() => setAttention((value) => !value)}><b>Needs attention ({model.needsAttention.length})</b></DisclosureButton>{attention ? <div id="issues-attention" className="mt-3 space-y-3">{model.needsAttention.map((issue) => <IssueRow key={issue.id} importId={importId} issue={issue} />)}</div> : null}</section> : null}
    {model.notices.length ? <section className="space-y-2 rounded-lg border p-3"><h3 className="font-medium">Information and notices ({model.notices.length})</h3>{model.notices.map((issue) => <Notice key={issue.id} issue={issue} />)}</section> : null}
    {model.completedGroups.length ? <section className="rounded-lg border p-3"><DisclosureButton expanded={completed} controls="issues-completed" onClick={() => setCompleted((value) => !value)}><b>Resolved or skipped ({model.resolved + model.skipped})</b></DisclosureButton>{completed ? <div id="issues-completed" className="mt-3 space-y-2">{model.completedGroups.map((group, index) => { const open = groups.has(group.key); const controls = `completed-group-${index}`; return <section key={group.key} className="rounded-lg border p-3">{group.expandable ? <DisclosureButton expanded={open} controls={controls} onClick={() => toggle(group.key)}><span>{group.label} — {group.issues.length}</span></DisclosureButton> : <p>{group.label} — {group.issues.length}</p>}{group.key === "coordinates:skipped" ? <p className="mt-2 text-sm text-[var(--muted)]">The show and all other successfully matched episode history will still be imported.</p> : null}{group.expandable && open ? <div id={controls} className="mt-3 space-y-2">{group.key === "coordinates:skipped" ? <CoordinateNoticeGroups importId={importId} issues={group.issues} groups={groups} toggle={toggle} /> : group.issues.map((issue) => <IssueRow key={issue.id} importId={importId} issue={issue} />)}</div> : null}</section>; })}</div> : null}</section> : null}
  </div> : null}</section>;
}
