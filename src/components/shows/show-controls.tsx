"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useSyncExternalStore, useTransition } from "react";

import { removeFromLibrary } from "@/app/actions/library";
import {
  initializeShow,
  markPreviousEpisodes,
  setEpisodeWatched,
  setSeasonWatched,
  syncShowMetadata,
  updateShowSettings,
  updateWatchedDate,
  type InitialMode,
  type ShowActionResult,
} from "@/app/actions/shows";
import { deriveInitialProgressOptions } from "@/lib/shows/initial-progress-options";
import { timestampToDateTimeLocal } from "@/lib/date-time";
import type { Episode, ShowTrackingStatus, UserShow, WatchedEpisode } from "@/types/database";

function ActionMessage({ id, result }: { id?: string; result: ShowActionResult | null }) {
  if (!result) return null;
  return <div className="min-w-0 space-y-1 break-words text-sm">
    {result.error ? <p id={id} className="text-[var(--danger)]" role="alert">{result.error}</p> : null}
    {result.success ? <p className="text-[var(--success)]" role="status">{result.success}</p> : null}
    {result.warning ? <p className="text-[var(--warning)]"><span className="font-semibold">Warning:</span> {result.warning}</p> : null}
  </div>;
}

const button = "interactive-control touch-target max-w-full cursor-pointer whitespace-normal rounded-lg border bg-[var(--surface)] px-3 py-2 text-sm font-semibold text-[var(--foreground)] transition-colors hover:bg-[var(--surface-elevated)]";
const primaryButton = "touch-target max-w-full whitespace-normal rounded-lg bg-[var(--accent)] px-4 py-2 font-semibold text-[var(--accent-foreground)]";

export function MetadataButton({ tmdbId, setup = false, missingEpisodes = false }: { tmdbId: number; setup?: boolean; missingEpisodes?: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [result, setResult] = useState<ShowActionResult | null>(null);
  const label = setup ? missingEpisodes ? "Retry episode sync" : "Load episode information" : "Refresh Metadata";
  return <div className="min-w-0"><button className={button} disabled={pending} onClick={() => start(async () => { const response = await syncShowMetadata(tmdbId); setResult(response); if (!response.error) router.refresh(); })}>{pending ? "Synchronizing…" : label}</button><ActionMessage result={result} /></div>;
}

export function RemoveShowButton({ tmdbId }: { tmdbId: number }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [result, setResult] = useState<ShowActionResult | null>(null);
  return <div className="min-w-0"><button className={`${button} text-[var(--danger)]`} disabled={pending} onClick={() => start(async () => { const response = await removeFromLibrary("tv", tmdbId); setResult(response); if (!response.error) router.push("/shows"); })}>{pending ? "Removing…" : "Remove from library"}</button><p className="mt-1 break-words text-xs text-[var(--muted)]">Watch history will be preserved.</p><ActionMessage result={result} /></div>;
}

export function SettingsControls({ tmdbId, mediaId, membership }: { tmdbId: number; mediaId: string; membership: UserShow }) {
  const [pending, start] = useTransition();
  const [result, setResult] = useState<ShowActionResult | null>(null);
  const run = (values: { status?: ShowTrackingStatus; isFavourite?: boolean }) => start(async () => setResult(await updateShowSettings(tmdbId, mediaId, values)));
  return <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center"><button className={button} disabled={pending} onClick={() => run({ isFavourite: !membership.is_favourite })}><span aria-hidden="true">{membership.is_favourite ? "★" : "☆"}</span> {membership.is_favourite ? "Favourite" : "Add favourite"}</button><div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center"><label htmlFor={`show-status-${mediaId}`} className="text-sm">Status</label><select id={`show-status-${mediaId}`} className="interactive-control touch-target w-full min-w-0 max-w-full rounded-lg border bg-[var(--surface)] px-3 text-[var(--foreground)] sm:w-auto" value={membership.status} disabled={pending} onChange={(event) => run({ status: event.target.value as ShowTrackingStatus })}><option value="active">Active</option><option value="paused">Paused</option><option value="dropped">Dropped</option></select></div><RemoveShowButton tmdbId={tmdbId} /><ActionMessage result={result} /></div>;
}

export function InitialProgressForm({ tmdbId, episodes }: { tmdbId: number; episodes: Episode[] }) {
  const options = deriveInitialProgressOptions(episodes);
  const regular = options.episodes;
  const seasons = options.seasons;
  const hasEpisodeOptions = regular.length > 0;
  const [mode, setMode] = useState<InitialMode["mode"]>("start");
  const [target, setTarget] = useState(regular[0] ? `${regular[0].season_number}:${regular[0].episode_number}` : "");
  const [selected, setSelected] = useState<number[]>([]);
  const [pending, start] = useTransition();
  const [result, setResult] = useState<ShowActionResult | null>(null);
  const effectiveTarget = target || (regular[0] ? `${regular[0].season_number}:${regular[0].episode_number}` : "");
  const selectionInvalid = (mode === "before_episode" && !effectiveTarget) || (mode === "seasons" && selected.length === 0);
  const helpId = `show-setup-help-${tmdbId}`;
  const unavailableId = `show-setup-unavailable-${tmdbId}`;
  const errorId = `show-setup-error-${tmdbId}`;

  function submit() {
    let selection: InitialMode = { mode: "start" };
    if (mode === "before_episode") {
      const [seasonNumber, episodeNumber] = effectiveTarget.split(":").map(Number);
      selection = { mode, seasonNumber, episodeNumber };
    } else if (mode === "seasons") selection = { mode, seasonNumbers: selected };
    start(async () => setResult(await initializeShow(tmdbId, selection)));
  }

  return <section className="min-w-0 space-y-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5">
    <h2 className="break-words text-xl font-semibold">Add show and set progress</h2>
    <p id={helpId} className="break-words text-sm text-[var(--muted)]">Choose where your regular-episode progress should begin. Specials in Season 0 are excluded.</p>
    {!hasEpisodeOptions ? <><p id={unavailableId} className="break-words text-sm text-[var(--warning)]"><span className="font-semibold">Warning:</span> Episode information could not be loaded. Retry to use episode- and season-based progress options.</p><MetadataButton tmdbId={tmdbId} setup missingEpisodes /></> : null}
    <form className="min-w-0" onSubmit={(event) => { event.preventDefault(); if (!selectionInvalid) submit(); }}>
      <fieldset aria-describedby={[helpId, !hasEpisodeOptions ? unavailableId : null, result?.error ? errorId : null].filter(Boolean).join(" ")} aria-invalid={selectionInvalid || undefined} className="min-w-0 space-y-4">
        <legend className="break-words font-semibold">Starting progress</legend>
        <div className="min-w-0"><input id={`progress-start-${tmdbId}`} name={`progress-mode-${tmdbId}`} type="radio" checked={mode === "start"} onChange={() => setMode("start")} /><label htmlFor={`progress-start-${tmdbId}`} className="ml-2 break-words">Start from Season 1, Episode 1</label></div>
        <div className="min-w-0"><input id={`progress-before-${tmdbId}`} name={`progress-mode-${tmdbId}`} type="radio" checked={mode === "before_episode"} disabled={!hasEpisodeOptions} onChange={() => setMode("before_episode")} /><label htmlFor={`progress-before-${tmdbId}`} className="ml-2 break-words">Mark everything before a selected episode</label></div>
        {mode === "before_episode" && hasEpisodeOptions ? <div className="min-w-0 space-y-2"><label htmlFor={`first-unwatched-${tmdbId}`} className="block break-words text-sm font-medium">Select the first unwatched episode</label><select id={`first-unwatched-${tmdbId}`} aria-describedby={helpId} aria-invalid={!effectiveTarget || undefined} className="interactive-control touch-target w-full min-w-0 max-w-full rounded-lg border bg-[var(--surface)] px-3 text-[var(--foreground)]" value={effectiveTarget} onChange={(event) => setTarget(event.target.value)}>{regular.map((episode) => <option key={episode.id} value={`${episode.season_number}:${episode.episode_number}`}>Season {episode.season_number}, Episode {episode.episode_number} — {episode.title}</option>)}</select></div> : null}
        <div className="min-w-0"><input id={`progress-seasons-${tmdbId}`} name={`progress-mode-${tmdbId}`} type="radio" checked={mode === "seasons"} disabled={!hasEpisodeOptions} onChange={() => setMode("seasons")} /><label htmlFor={`progress-seasons-${tmdbId}`} className="ml-2 break-words">Select complete watched seasons</label></div>
        {mode === "seasons" && hasEpisodeOptions ? <fieldset aria-describedby={helpId} aria-invalid={selected.length === 0 || undefined} className="min-w-0 space-y-2"><legend className="break-words text-sm font-medium">Watched regular seasons</legend><div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap">{seasons.map(({ seasonNumber, episodeCount }) => { const id = `watched-season-${tmdbId}-${seasonNumber}`; return <div key={seasonNumber} className="min-w-0"><input id={id} type="checkbox" checked={selected.includes(seasonNumber)} onChange={() => setSelected((current) => current.includes(seasonNumber) ? current.filter((item) => item !== seasonNumber) : [...current, seasonNumber])} /><label htmlFor={id} className="ml-2 break-words">Season {seasonNumber} ({episodeCount} episode{episodeCount === 1 ? "" : "s"})</label></div>; })}</div></fieldset> : null}
        <button type="submit" className={primaryButton} disabled={pending || selectionInvalid}>{pending ? "Synchronizing and adding…" : "Add to library"}</button>
      </fieldset>
    </form>
    <ActionMessage id={errorId} result={result} />
  </section>;
}

export function EpisodeControls({ tmdbId, mediaId, episode, watched, today, timeZone }: { tmdbId: number; mediaId: string; episode: Episode; watched: WatchedEpisode | undefined; today: string; timeZone: string }) {
  const displayTimeZone = useSyncExternalStore(
    () => () => undefined,
    () => Intl.DateTimeFormat().resolvedOptions().timeZone || timeZone,
    () => timeZone,
  );
  const [pending, start] = useTransition();
  const [actionResult, setActionResult] = useState<ShowActionResult | null>(null);
  const [dateResult, setDateResult] = useState<ShowActionResult | null>(null);
  const [editingDate, setEditingDate] = useState(false);
  const dateInputRef = useRef<HTMLInputElement>(null);
  const dateTriggerRef = useRef<HTMLButtonElement>(null);
  const released = episode.air_date !== null && episode.air_date <= today;
  const dateValue = watched ? timestampToDateTimeLocal(watched.watched_at, displayTimeZone) : "";
  const maximumDateValue = timestampToDateTimeLocal(new Date().toISOString(), displayTimeZone);
  const coordinate = `S${String(episode.season_number).padStart(2, "0")}E${String(episode.episode_number).padStart(2, "0")}`;
  const dateId = `date-${episode.id}`;
  const errorId = `date-error-${episode.id}`;
  return <div className="flex min-w-0 flex-col gap-2">
    <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
      <button className={button} disabled={pending || (!watched && !released)} onClick={() => start(async () => { setDateResult(null); setActionResult(await setEpisodeWatched(tmdbId, mediaId, episode.id, !watched)); })}>{pending ? "Saving…" : watched ? "Mark unwatched" : released ? "Mark watched" : "Unreleased"}</button>
      <button className={button} disabled={pending || episode.season_number === 0} onClick={() => start(async () => { setDateResult(null); setActionResult(await markPreviousEpisodes(tmdbId, mediaId, episode.season_number, episode.episode_number)); })}>Mark previous watched</button>
    </div>
    {watched ? <div className="min-w-0 space-y-2"><div className="flex min-w-0 items-center gap-3"><p className="min-w-0 break-words text-sm"><span className="font-semibold">Watched</span> · <time dateTime={watched.watched_at}>{new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short", timeZone: displayTimeZone }).format(new Date(watched.watched_at))}</time></p><button ref={dateTriggerRef} type="button" className="interactive-control touch-target shrink-0 cursor-pointer rounded px-2 text-sm font-medium no-underline underline-offset-4 hover:underline focus-visible:underline" aria-label={`${editingDate ? "Cancel editing" : "Edit"} watched date for ${coordinate}: ${episode.title}`} aria-expanded={editingDate} aria-controls={`date-editor-${episode.id}`} onClick={() => { if (editingDate) { setDateResult(null); setEditingDate(false); return; } setEditingDate(true); queueMicrotask(() => dateInputRef.current?.focus()); }}>{editingDate ? "Cancel" : "Edit"}</button></div>{editingDate ? <div id={`date-editor-${episode.id}`} className="flex w-full min-w-0 max-w-full flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center"><label htmlFor={dateId} className="break-words text-sm">Watched date for {coordinate}</label><input ref={dateInputRef} type="datetime-local" defaultValue={dateValue} max={maximumDateValue} className="interactive-control touch-target block w-full min-w-0 max-w-full rounded-lg border bg-[var(--surface)] px-3 text-base text-[var(--foreground)] sm:w-auto sm:text-sm" id={dateId} aria-describedby={dateResult?.error ? errorId : undefined} aria-invalid={dateResult?.error ? true : undefined} /><button aria-label={`Save watched date for ${coordinate}: ${episode.title}`} className={button} disabled={pending} onClick={() => { const value = dateInputRef.current?.value; if (value) start(async () => { setActionResult(null); const response = await updateWatchedDate(tmdbId, mediaId, episode.id, value, displayTimeZone); setDateResult(response); if (!response.error) { setEditingDate(false); queueMicrotask(() => dateTriggerRef.current?.focus()); } }); }}>Save</button></div> : null}</div> : null}
    <ActionMessage id={errorId} result={dateResult} />
    <ActionMessage result={actionResult} />
  </div>;
}

export function SeasonControls({ tmdbId, mediaId, season }: { tmdbId: number; mediaId: string; season: number }) {
  const [pending, start] = useTransition();
  const [result, setResult] = useState<ShowActionResult | null>(null);
  const run = (watched: boolean) => start(async () => setResult(await setSeasonWatched(tmdbId, mediaId, season, watched)));
  return <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap"><button className={button} disabled={pending} onClick={() => run(true)}>Mark season watched</button><button className={button} disabled={pending} onClick={() => run(false)}>Mark season unwatched</button><ActionMessage result={result} /></div>;
}
