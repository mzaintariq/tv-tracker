import { notFound, redirect } from "next/navigation";
import { MediaPoster } from "@/components/media/media-poster";
import { EpisodeControls, InitialProgressForm, MetadataButton, SeasonControls, SettingsControls } from "@/components/shows/show-controls";
import { ProgressBar } from "@/components/shows/progress-bar";
import { yearFromDate } from "@/lib/media/types";
import { loadShowPageData } from "@/lib/shows/detail-loader";
import { calculateShowProgress } from "@/lib/shows/progress";
import { parseTmdbId } from "@/lib/shows/validation";
import { createClient } from "@/lib/supabase/server";
import type { Episode } from "@/types/database";

export default async function ShowDetailPage({ params }: { params: Promise<{ tmdbId: string }> }) {
  const { tmdbId: raw } = await params;
  const tmdbId = parseTmdbId(raw);
  if (tmdbId === null) notFound();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const loaded = await loadShowPageData(user.id, tmdbId);
  const detail = loaded.detail;
  if (!detail) notFound();
  const watchedMap = new Map(detail.watched.map((row) => [row.episode_id, row]));
  const watchedIds = new Set(watchedMap.keys());
  const progress = calculateShowProgress(detail.episodes, watchedIds, detail.media.tmdb_status, new Date().toISOString().slice(0, 10));
  const seasons = new Map<number, Episode[]>();
  for (const episode of detail.episodes) {
    const list = seasons.get(episode.season_number) ?? [];
    list.push(episode);
    seasons.set(episode.season_number, list);
  }
  return (
    <article className="mx-auto w-full min-w-0 max-w-5xl space-y-8">
      <header className="grid min-w-0 gap-6 sm:grid-cols-[180px_minmax(0,1fr)]">
        <div className="relative mx-auto aspect-[2/3] w-full max-w-[180px] overflow-hidden rounded-xl bg-[var(--surface-elevated)] sm:mx-0">
          <MediaPoster source={detail.media.poster_path} title={detail.media.title} alt={`${detail.media.title} poster`} sizes="180px" tmdbSize="w500" fallbackClassName="text-3xl font-semibold text-[var(--muted)]" />
        </div>
        <div className="min-w-0 space-y-4">
          <div className="min-w-0">
            <h1 className="break-words text-3xl font-semibold">{detail.media.title}</h1>
            <p className="break-words text-[var(--muted)]">{yearFromDate(detail.media.release_date) ?? "Year unknown"} · {detail.media.tmdb_status ?? "Status unknown"}</p>
          </div>
          <p className="break-words">{detail.media.overview}</p>
          {detail.membership ? (
            <>
              <ProgressBar progress={progress} />
              <SettingsControls tmdbId={tmdbId} mediaId={detail.media.id} membership={detail.membership} />
            </>
          ) : null}
          <MetadataButton tmdbId={tmdbId} />
          {loaded.syncError ? <p role="alert" className="break-words text-[var(--danger)]">{loaded.syncError}</p> : null}
        </div>
      </header>
      {!detail.membership ? <InitialProgressForm tmdbId={tmdbId} episodes={detail.episodes} /> : null}
      {detail.episodes.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--border)] p-8 text-center text-[var(--muted)]">No episode metadata is available yet.</div>
      ) : (
        <div className="min-w-0 space-y-6">
          {[...seasons.entries()].map(([season, episodes]) => (
            <section key={season} className="min-w-0 space-y-3">
              <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <h2 className="break-words text-2xl font-semibold">{season === 0 ? "Specials (Season 0)" : `Season ${season}`}</h2>
                  {season === 0 ? <p className="break-words text-sm text-[var(--muted)]">Excluded from normal progress</p> : null}
                </div>
                {detail.membership ? <SeasonControls tmdbId={tmdbId} mediaId={detail.media.id} season={season} /> : null}
              </div>
              <ol className="min-w-0 divide-y divide-[var(--border)] rounded-xl border border-[var(--border)] bg-[var(--surface)]">
                {episodes.map((episode) => (
                  <li key={episode.id} className="min-w-0 space-y-3 p-4">
                    <div className="min-w-0">
                      <h3 className="break-words font-semibold">S{String(episode.season_number).padStart(2, "0")} | E{String(episode.episode_number).padStart(2, "0")} — {episode.title}</h3>
                      <p className="break-words text-sm text-[var(--muted)]">{episode.air_date ?? "Air date unknown"}{episode.runtime_minutes ? ` · ${episode.runtime_minutes} min` : ""}</p>
                    </div>
                    {detail.membership ? <EpisodeControls tmdbId={tmdbId} mediaId={detail.media.id} episode={episode} watched={watchedMap.get(episode.id)} /> : null}
                  </li>
                ))}
              </ol>
            </section>
          ))}
        </div>
      )}
    </article>
  );
}
