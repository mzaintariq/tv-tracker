import Link from "next/link";
import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { MediaPoster } from "@/components/media/media-poster";
import { EpisodeControls, InitialProgressForm, MetadataButton, SeasonControls, SettingsControls } from "@/components/shows/show-controls";
import { ProgressBar } from "@/components/shows/progress-bar";
import { OptionalShowSectionSkeleton, ShowCreditsSection, ShowExternalLinks, ShowProvidersSection, ShowTrailerSection } from "@/components/shows/show-detail-sections";
import { dateInTimeZone } from "@/lib/date-time";
import { formatVoteCount } from "@/lib/movies/detail";
import { regionDisplayName } from "@/lib/regions";
import { defaultOpenRegularSeason } from "@/lib/shows/season-disclosures";
import { formatDate, languageDisplayName, parseCountries, parseNamedFacts, showStatusSummary } from "@/lib/shows/detail";
import { loadShowPageData } from "@/lib/shows/detail-loader";
import { calculateShowProgress } from "@/lib/shows/progress";
import { parseTmdbId } from "@/lib/shows/validation";
import { createClient } from "@/lib/supabase/server";
import { normalizeExternalLinks } from "@/lib/tmdb/extras-normalize";
import { loadPreferredTrailer, loadRegionalWatchProviders, loadTvExternalLinks, loadTvRegionalCertification, loadTvTopCast } from "@/lib/tmdb/extras";
import type { Episode, MediaItem, UserShow, WatchedEpisode } from "@/types/database";

type View = "overview" | "episodes";
const sectionClass = "min-w-0 space-y-2 sm:space-y-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 sm:p-6";

export default async function ShowDetailPage({ params, searchParams }: { params: Promise<{ tmdbId: string }>; searchParams: Promise<{ view?: string | string[] }> }) {
  const { tmdbId: raw } = await params;
  const tmdbId = parseTmdbId(raw);
  if (tmdbId === null) notFound();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const [loaded, profileResult] = await Promise.all([
    loadShowPageData(user.id, tmdbId),
    supabase.from("profiles").select("timezone, region").eq("id", user.id).maybeSingle(),
  ]);
  if (profileResult.error) throw new Error("profile_context_read_failed");
  if (!loaded.detail) notFound();
  const detail = loaded.detail;
  const timeZone = profileResult.data?.timezone ?? "UTC";
  const region = profileResult.data?.region ?? null;
  const requestedView = (await searchParams).view;
  const view: View = !detail.membership ? "episodes" : requestedView === "episodes" ? "episodes" : "overview";
  const watchedMap = new Map(detail.watched.map((row) => [row.episode_id, row]));
  const watchedIds = new Set(watchedMap.keys());
  const today = dateInTimeZone(new Date(), timeZone);
  const progress = calculateShowProgress(detail.episodes, watchedIds, detail.media.tmdb_status, today);
  const genres = parseNamedFacts(detail.media.genres);
  const networks = parseNamedFacts(detail.media.networks);
  const language = languageDisplayName(detail.media.original_language);
  const statusSummary = showStatusSummary(detail.media);
  const trailerPromise = loadPreferredTrailer(
    "tv",
    tmdbId,
    detail.media.original_language ?? "en",
  );
  const certificationPromise = region ? loadTvRegionalCertification(tmdbId, region) : null;
  const certification = certificationPromise ? await certificationPromise.catch(() => null) : null;

  return <article className="mx-auto w-full min-w-0 max-w-5xl space-y-6 sm:space-y-8">
    <header className="grid min-w-0 gap-4 sm:grid-cols-[180px_minmax(0,1fr)]">
      <div className="relative mx-auto aspect-[2/3] w-full max-w-[180px] overflow-hidden rounded-xl bg-[var(--surface-elevated)] sm:mx-0"><MediaPoster source={detail.media.poster_path} title={detail.media.title} alt={`${detail.media.title} poster`} sizes="180px" tmdbSize="w500" fallbackClassName="text-3xl font-semibold text-[var(--muted)]" /></div>
      <div className="min-w-0 space-y-2 sm:space-y-4">
        <div className="min-w-0"><h1 className="break-words text-2xl sm:text-3xl font-semibold">{detail.media.title}</h1><p className="break-words text-[var(--muted)] text-sm sm:text-base">{formatDate(detail.media.release_date) ?? "First air date unknown"}{detail.media.average_episode_runtime_minutes ? ` · ${detail.media.average_episode_runtime_minutes} min average` : ""}{certification ? ` · ${certification}` : ""}{language ? ` · ${language}` : ""}</p></div>
        {detail.media.overview ? <p className="break-words text-sm sm:text-base">{detail.media.overview}</p> : null}
        {genres.length ? <ul aria-label="Genres" className="flex min-w-0 flex-wrap gap-1 sm:gap-2">{genres.map((genre) => <li key={genre.id} className="rounded-full bg-[var(--surface-elevated)] px-2 py-1 text-xs sm:px-3 sm:text-sm">{genre.name}</li>)}</ul> : null}
        <div className="min-w-0 text-sm flex flex-wrap items-center gap-2 sm:flex-row sm:gap-3"><Suspense fallback={null}><ShowTrailerSection promise={trailerPromise} /></Suspense>{detail.media.vote_average !== null ? <p className="text-xs sm:text-sm" aria-label={`TMDB rating ${detail.media.vote_average.toFixed(1)} out of 10${detail.media.vote_count !== null ? ` from ${detail.media.vote_count} votes` : ""}`}><span className="font-semibold">TMDB</span> {detail.media.vote_average.toFixed(1)} / 10{detail.media.vote_count !== null ? ` · ${formatVoteCount(detail.media.vote_count)} votes` : ""}</p> : null}</div>
        {networks.length || statusSummary ? <div className="flex min-w-0 flex-wrap items-center gap-2 text-xs sm:gap-3 sm:text-sm">{networks.length ? <p className="break-words text-[var(--muted)]"><span className="font-semibold text-[var(--foreground)]">Networks</span> · {networks.map((network) => network.name).join(", ")}</p> : null}{statusSummary ? <p>{statusSummary}</p> : null}</div> : null}
        {detail.membership ? <><ProgressBar progress={progress} /><SettingsControls tmdbId={tmdbId} mediaId={detail.media.id} membership={detail.membership} /></> : null}
        <MetadataButton tmdbId={tmdbId} />
        {loaded.syncError ? <p role="alert" className="break-words text-[var(--danger)]">{loaded.syncError}</p> : null}
      </div>
    </header>

    {detail.membership ? <nav aria-label="Show detail views" className="grid min-w-0 grid-cols-2 rounded-xl border border-[var(--control-border)] bg-[var(--surface)] p-1"><ViewLink tmdbId={tmdbId} view="overview" selected={view === "overview"}>Overview</ViewLink><ViewLink tmdbId={tmdbId} view="episodes" selected={view === "episodes"}>Episodes</ViewLink></nav> : null}
    {view === "overview" ? <Overview tmdbId={tmdbId} media={detail.media} region={region} certification={certification} /> : <Episodes tmdbId={tmdbId} detail={detail} watchedMap={watchedMap} watchedIds={watchedIds} today={today} timeZone={timeZone} />}
  </article>;
}

function ViewLink({ tmdbId, view, selected, children }: { tmdbId: number; view: View; selected: boolean; children: React.ReactNode }) { return <Link href={`/shows/${tmdbId}?view=${view}`} aria-current={selected ? "page" : undefined} className={`touch-target inline-flex items-center justify-center rounded-lg px-3 py-2 text-sm font-semibold ${selected ? "bg-[var(--accent)] text-[var(--accent-foreground)]" : "interactive-control text-[var(--muted)]"}`}>{children}</Link>; }

function Overview({ tmdbId, media, region, certification }: { tmdbId: number; media: MediaItem; region: string | null; certification: string | null }) {
  const creators = parseNamedFacts(media.creators), countries = parseCountries(media.origin_countries);
  const regionName = regionDisplayName(region), regionLabel = region ? `${regionName ?? region} (${region})` : null;
  const castPromise = loadTvTopCast(tmdbId), providerPromise = region ? loadRegionalWatchProviders("tv", tmdbId, region) : null, linksPromise = loadTvExternalLinks(tmdbId);
  const fallbackLinks = normalizeExternalLinks("tv", tmdbId, media.imdb_id, null);
  return <div className="min-w-0 space-y-6 sm:space-y-8">
    <div className="space-y-1 sm:space-y-2"><h2 className="text-lg sm:text-xl font-semibold">Show facts</h2><section className={sectionClass}><dl className="grid min-w-0 grid-cols-2 gap-4 sm:grid-cols-3"><Fact label="Status" value={showStatusSummary(media)} /><Fact label="First air date" value={formatDate(media.release_date)} /><Fact label="Last air date" value={formatDate(media.last_air_date)} /><Fact label="Average runtime" value={media.average_episode_runtime_minutes ? `${media.average_episode_runtime_minutes} min` : null} /><Fact label="Language" value={languageDisplayName(media.original_language)} /><Fact label="Certification" value={certification} /><Fact label="Origin countries" value={countries.length ? countries.join(", ") : null} /></dl></section></div>
    <Suspense fallback={<OptionalShowSectionSkeleton label="Where to watch" />}><ShowProvidersSection regionLabel={regionLabel} promise={providerPromise} /></Suspense>
    <Suspense fallback={<OptionalShowSectionSkeleton label="Cast and creators" />}><ShowCreditsSection creators={creators} promise={castPromise} /></Suspense>
    <div className="space-y-1 sm:space-y-2"><h2 className="text-lg sm:text-xl font-semibold">More information</h2><section className={sectionClass}><dl className="grid min-w-0 gap-2 sm:grid-cols-2"><Suspense fallback={null}><ShowExternalLinks fallback={fallbackLinks} promise={linksPromise} /></Suspense></dl></section></div>
  </div>;
}

function Fact({ label, value }: { label: string; value: string | null }) { if (!value) return null; return <div className="min-w-0"><dt className="text-xs sm:text-sm font-semibold">{label}</dt><dd className="text-xs sm:text-sm break-words text-[var(--muted)]">{value}</dd></div>; }

function Episodes({ tmdbId, detail, watchedMap, watchedIds, today, timeZone }: { tmdbId: number; detail: { media: MediaItem; membership: UserShow | null; episodes: Episode[]; watched: WatchedEpisode[] }; watchedMap: Map<string, WatchedEpisode>; watchedIds: Set<string>; today: string; timeZone: string }) {
  const seasons = new Map<number, Episode[]>(); for (const episode of detail.episodes) { const list = seasons.get(episode.season_number) ?? []; list.push(episode); seasons.set(episode.season_number, list); }
  const defaultOpenSeason = defaultOpenRegularSeason(seasons, watchedIds, today);
  return <div className="min-w-0 space-y-6">
    {!detail.membership ? <InitialProgressForm tmdbId={tmdbId} episodes={detail.episodes} /> : null}
    {detail.episodes.length === 0 ? <div className="rounded-xl border border-dashed border-[var(--border)] p-8 text-center text-[var(--muted)]">No episode metadata is available yet.</div> : [...seasons.entries()].map(([season, episodes]) => { const watchedCount = episodes.filter((episode) => watchedIds.has(episode.id)).length; return <details key={season} open={season === defaultOpenSeason} className="group min-w-0 rounded-xl border border-[var(--border)] bg-[var(--surface)]"><summary className="interactive-control touch-target grid min-w-0 cursor-pointer list-none grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-xl px-4 py-3 marker:content-none [&::-webkit-details-marker]:hidden"><div className="min-w-0"><h2 className="break-words text-2xl font-semibold">{season === 0 ? "Specials (Season 0)" : `Season ${season}`}</h2><p className="break-words text-sm text-[var(--muted)]">{watchedCount} of {episodes.length} watched{season === 0 ? " · Excluded from normal progress" : ""}</p></div><span aria-hidden="true" className="shrink-0 text-xl group-open:rotate-90">›</span></summary><div className="min-w-0 space-y-3 border-t border-[var(--border)] p-4">{detail.membership ? <SeasonControls tmdbId={tmdbId} mediaId={detail.media.id} season={season} /> : null}<ol className="min-w-0 divide-y divide-[var(--border)] rounded-xl border border-[var(--border)]">{episodes.map((episode) => { const isWatched = watchedIds.has(episode.id); return <li key={episode.id} className={`min-w-0 space-y-3 border-l-4 p-4 ${isWatched ? "border-l-[var(--success)] bg-[color-mix(in_srgb,var(--success)_9%,var(--surface))]" : "border-l-transparent"}`}><div className="min-w-0"><h3 className="break-words font-semibold">{isWatched ? <span className="mr-2 inline-flex rounded-full border border-[var(--success)] px-2 py-0.5 text-xs text-[var(--success)]"><span aria-hidden="true">✓&nbsp;</span>Watched</span> : null}S{String(episode.season_number).padStart(2, "0")} | E{String(episode.episode_number).padStart(2, "0")} — {episode.title}</h3><p className="break-words text-sm text-[var(--muted)]">{episode.air_date ?? "Air date unknown"}{episode.runtime_minutes ? ` · ${episode.runtime_minutes} min` : ""}</p></div>{detail.membership ? <EpisodeControls tmdbId={tmdbId} mediaId={detail.media.id} episode={episode} watched={watchedMap.get(episode.id)} today={today} timeZone={timeZone} /> : null}</li>; })}</ol></div></details>; })}
  </div>;
}
