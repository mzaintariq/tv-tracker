import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { MediaPoster } from "@/components/media/media-poster";
import { MovieControls } from "@/components/movies/movie-controls";
import { CreditsSection, ExternalLinksSection, OptionalSectionSkeleton, ProvidersSection, TrailerSection } from "@/components/movies/movie-detail-sections";
import { formatVoteCount, languageDisplayName, parseNamedFacts } from "@/lib/movies/detail";
import { loadMovieDetail, loadMovieRegionalContext } from "@/lib/movies/data";
import { MovieReleaseType, selectRegionalDigitalDate, selectRegionalMovieCertification, selectRegionalTheatricalDate } from "@/lib/movies/release-dates";
import { normalizeExternalLinks } from "@/lib/tmdb/extras-normalize";
import { loadMovieCredits, loadMovieExternalLinks, loadPreferredTrailer, loadRegionalWatchProviders } from "@/lib/tmdb/extras";
import { parseTmdbId } from "@/lib/shows/validation";
import { createClient } from "@/lib/supabase/server";
import { regionDisplayName } from "@/lib/regions";

const sectionClass = "min-w-0 space-y-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-6";

function dateOnly(value: string | null): string | null {
  return value ? new Intl.DateTimeFormat("en-US", { dateStyle: "long", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`)) : null;
}

export default async function MovieDetailPage({ params }: { params: Promise<{ tmdbId: string }> }) {
  const tmdbId = parseTmdbId((await params).tmdbId);
  if (tmdbId === null) notFound();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const movie = await loadMovieDetail(user.id, tmdbId);
  if (!movie) notFound();

  const regional = await loadMovieRegionalContext(user.id, movie.media.id);
  const regionName = regionDisplayName(regional.region);
  const regionLabel = regional.region ? `${regionName ?? regional.region} (${regional.region})` : null;
  const theatrical = regional.region ? selectRegionalTheatricalDate(regional.releases, regional.region) : null;
  const digital = regional.region ? selectRegionalDigitalDate(regional.releases, regional.region) : null;
  const certification = regional.region ? selectRegionalMovieCertification(regional.releases, regional.region) : null;
  const genres = parseNamedFacts(movie.media.genres);
  const companies = parseNamedFacts(movie.media.production_companies);
  const language = languageDisplayName(movie.media.original_language);
  const generalRelease = dateOnly(movie.media.release_date);
  const watchedAt = movie.membership.watched_at
    ? new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: regional.timeZone }).format(new Date(movie.membership.watched_at))
    : null;

  // These public-metadata loaders begin in one wave. React cache deduplicates
  // identical calls within this request; endpoint caches bound cross-request work.
  const creditsPromise = loadMovieCredits(tmdbId);
  const trailerPromise = loadPreferredTrailer("movie", tmdbId, movie.media.original_language ?? "en");
  const providerPromise = regional.region ? loadRegionalWatchProviders("movie", tmdbId, regional.region) : null;
  const linksPromise = loadMovieExternalLinks(tmdbId);
  const fallbackLinks = normalizeExternalLinks("movie", tmdbId, movie.media.imdb_id, null);

  return (
    <article className="mx-auto w-full min-w-0 max-w-5xl space-y-8">
      <header className="grid min-w-0 gap-6 sm:grid-cols-[180px_minmax(0,1fr)]">
        <div className="relative mx-auto aspect-[2/3] w-full max-w-[180px] overflow-hidden rounded-xl bg-[var(--surface-elevated)] sm:mx-0">
          <MediaPoster source={movie.media.poster_path} title={movie.media.title} alt={`${movie.media.title} poster`} sizes="180px" tmdbSize="w500" fallbackClassName="text-3xl font-semibold text-[var(--muted)]" />
        </div>
        <div className="min-w-0 space-y-4">
          <div className="min-w-0 space-y-2">
            <h1 className="break-words text-3xl font-semibold">{movie.media.title}</h1>
            <p className="break-words text-[var(--muted)]">{generalRelease ?? "Release date unknown"}{movie.media.runtime_minutes ? ` · ${movie.media.runtime_minutes} min` : ""}{certification ? ` · ${certification}` : ""}</p>
          </div>
          {genres.length ? <ul aria-label="Genres" className="flex min-w-0 flex-wrap gap-2">{genres.map((genre) => <li key={genre.id} className="rounded-full bg-[var(--surface-elevated)] px-3 py-1 text-sm">{genre.name}</li>)}</ul> : null}
          <dl className="grid min-w-0 gap-2 text-sm sm:grid-cols-2">
            {movie.media.vote_average !== null ? <div><dt className="font-semibold">TMDB rating</dt><dd aria-label={`${movie.media.vote_average.toFixed(1)} out of 10${movie.media.vote_count !== null ? ` from ${movie.media.vote_count} votes` : ""}`}>{movie.media.vote_average.toFixed(1)} / 10{movie.media.vote_count !== null ? ` · ${formatVoteCount(movie.media.vote_count)} votes` : ""}</dd></div> : null}
            {language ? <div><dt className="font-semibold">Original language</dt><dd>{language}</dd></div> : null}
            <div><dt className="font-semibold">Library status</dt><dd>{watchedAt ? `Watched ${watchedAt}` : "Watch Next"}{movie.membership.is_favourite ? " · Favourite" : ""}</dd></div>
          </dl>
        </div>
      </header>

      <MovieControls tmdbId={tmdbId} mediaId={movie.media.id} membership={movie.membership} />

      {movie.media.overview ? <section className={sectionClass}><h2 className="text-2xl font-semibold">Overview</h2><p className="max-w-prose break-words leading-7">{movie.media.overview}</p></section> : null}

      <section className={sectionClass}>
        <h2 className="text-2xl font-semibold">Release information</h2>
        {regionLabel ? <dl className="grid min-w-0 gap-4 sm:grid-cols-2">
          <ReleaseFact label={theatrical?.release_type === MovieReleaseType.LimitedTheatrical ? "Limited theatrical release" : "Theatrical release"} value={dateOnly(theatrical?.release_date ?? null) ?? "Not announced for this region"} />
          <ReleaseFact label="Digital release" value={dateOnly(digital?.release_date ?? null) ?? "Not announced for this region"} />
          <ReleaseFact label="Certification" value={certification ?? "Not listed for this region"} />
          <ReleaseFact label="Region" value={regionLabel} />
        </dl> : <p className="text-[var(--muted)]">Choose a release and streaming region in Profile Settings to see regional dates and certification.</p>}
      </section>

      <Suspense fallback={<OptionalSectionSkeleton label="Where to watch" />}><ProvidersSection regionLabel={regionLabel} promise={providerPromise} /></Suspense>
      <Suspense fallback={<OptionalSectionSkeleton label="Cast and creators" />}><CreditsSection promise={creditsPromise} /></Suspense>
      <Suspense fallback={<OptionalSectionSkeleton label="Trailer" />}><TrailerSection promise={trailerPromise} /></Suspense>

      {(companies.length || movie.media.original_title || movie.media.tmdb_status) ? <section className={sectionClass}><h2 className="text-2xl font-semibold">Production information</h2><dl className="grid min-w-0 gap-4 sm:grid-cols-2">{companies.length ? <ReleaseFact label="Production companies" value={companies.map((company) => company.name).join(", ")} /> : null}{movie.media.original_title && movie.media.original_title !== movie.media.title ? <ReleaseFact label="Original title" value={movie.media.original_title} /> : null}{movie.media.tmdb_status ? <ReleaseFact label="Status" value={movie.media.tmdb_status} /> : null}</dl></section> : null}

      <Suspense fallback={<OptionalSectionSkeleton label="External links" />}><ExternalLinksSection fallback={fallbackLinks} promise={linksPromise} /></Suspense>
    </article>
  );
}

function ReleaseFact({ label, value }: { label: string; value: string }) {
  return <div className="min-w-0"><dt className="font-semibold">{label}</dt><dd className="break-words text-[var(--muted)]">{value}</dd></div>;
}
