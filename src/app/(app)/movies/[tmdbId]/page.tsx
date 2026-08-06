import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { MediaPoster } from "@/components/media/media-poster";
import { MovieControls } from "@/components/movies/movie-controls";
import {
  CreditsSection,
  ExternalLinksFact,
  OptionalSectionSkeleton,
  ProvidersSection,
  TrailerSection,
} from "@/components/movies/movie-detail-sections";
import {
  formatVoteCount,
  languageDisplayName,
  movieReleaseStatuses,
  parseNamedFacts,
} from "@/lib/movies/detail";
import { loadMovieDetail, loadMovieRegionalContext } from "@/lib/movies/data";
import {
  MovieReleaseType,
  selectRegionalDigitalDate,
  selectRegionalMovieCertification,
  selectRegionalTheatricalDate,
} from "@/lib/movies/release-dates";
import { normalizeExternalLinks } from "@/lib/tmdb/extras-normalize";
import {
  loadMovieCredits,
  loadMovieExternalLinks,
  loadPreferredTrailer,
  loadRegionalWatchProviders,
} from "@/lib/tmdb/extras";
import { parseTmdbId } from "@/lib/shows/validation";
import { createClient } from "@/lib/supabase/server";
import { regionDisplayName } from "@/lib/regions";
import { dateInTimeZone } from "@/lib/date-time";

const sectionClass =
  "min-w-0 space-y-2 sm:space-y-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 sm:p-6";

function dateOnly(value: string | null): string | null {
  return value
    ? new Intl.DateTimeFormat("en-US", {
        dateStyle: "long",
        timeZone: "UTC",
      }).format(new Date(`${value}T00:00:00Z`))
    : null;
}

export default async function MovieDetailPage({
  params,
}: {
  params: Promise<{ tmdbId: string }>;
}) {
  const tmdbId = parseTmdbId((await params).tmdbId);
  if (tmdbId === null) notFound();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const movie = await loadMovieDetail(user.id, tmdbId);
  if (!movie) notFound();

  const regional = await loadMovieRegionalContext(user.id, movie.media.id);
  const regionName = regionDisplayName(regional.region);
  const regionLabel = regional.region
    ? `${regionName ?? regional.region} (${regional.region})`
    : null;
  const theatrical = regional.region
    ? selectRegionalTheatricalDate(regional.releases, regional.region)
    : null;
  const digital = regional.region
    ? selectRegionalDigitalDate(regional.releases, regional.region)
    : null;
  const certification = regional.region
    ? selectRegionalMovieCertification(regional.releases, regional.region)
    : null;
  const genres = parseNamedFacts(movie.media.genres);
  const companies = parseNamedFacts(movie.media.production_companies);
  const language = languageDisplayName(movie.media.original_language);
  const generalRelease = dateOnly(movie.media.release_date);
  const releaseStatuses = regional.region
    ? movieReleaseStatuses({
        today: dateInTimeZone(new Date(), regional.timeZone),
        theatrical,
        digital,
      })
    : [];

  // These public-metadata loaders begin in one wave. React cache deduplicates
  // identical calls within this request; endpoint caches bound cross-request work.
  const creditsPromise = loadMovieCredits(tmdbId);
  const trailerPromise = loadPreferredTrailer(
    "movie",
    tmdbId,
    movie.media.original_language ?? "en",
  );
  const providerPromise = regional.region
    ? loadRegionalWatchProviders("movie", tmdbId, regional.region)
    : null;
  const linksPromise = loadMovieExternalLinks(tmdbId);
  const fallbackLinks = normalizeExternalLinks(
    "movie",
    tmdbId,
    movie.media.imdb_id,
    null,
  );

  return (
    <article className="mx-auto w-full min-w-0 max-w-5xl space-y-6 sm:space-y-8">
      <header className="grid min-w-0 gap-4 sm:grid-cols-[180px_minmax(0,1fr)]">
        <div className="relative mx-auto aspect-[2/3] w-full max-w-[180px] overflow-hidden rounded-xl bg-[var(--surface-elevated)] sm:mx-0">
          <MediaPoster
            source={movie.media.poster_path}
            title={movie.media.title}
            alt={`${movie.media.title} poster`}
            sizes="180px"
            tmdbSize="w500"
            fallbackClassName="text-3xl font-semibold text-[var(--muted)]"
          />
        </div>
        <div className="min-w-0 space-y-2 sm:space-y-4">
          <div className="min-w-0">
            <h1 className="break-words text-2xl sm:text-3xl font-semibold">
              {movie.media.title}
            </h1>
            <p className="break-words text-[var(--muted)] text-sm sm:text-base">
              {generalRelease ?? "Release date unknown"}
              {movie.media.runtime_minutes
                ? ` · ${movie.media.runtime_minutes} min`
                : ""}
              {certification ? ` · ${certification}` : ""}
              {language ? ` · ${language}` : ""}
            </p>
          </div>
          {movie.media.overview ? (
            <p className="break-words text-sm sm:text-base">
              {movie.media.overview}
            </p>
          ) : null}
          {genres.length ? (
            <ul
              aria-label="Genres"
              className="flex min-w-0 flex-wrap gap-1 sm:gap-2"
            >
              {genres.map((genre) => (
                <li
                  key={genre.id}
                  className="rounded-full bg-[var(--surface-elevated)] px-2 py-1 text-xs sm:px-3 sm:text-sm"
                >
                  {genre.name}
                </li>
              ))}
            </ul>
          ) : null}
          <div className="min-w-0 text-sm flex items-center gap-2 sm:flex-row sm:gap-3">
            <Suspense fallback={null}>
              <TrailerSection promise={trailerPromise} />
            </Suspense>
            {movie.media.vote_average !== null ? (
              <p
                className="text-xs sm:text-sm"
                aria-label={`TMDB rating ${movie.media.vote_average.toFixed(1)} out of 10${movie.media.vote_count !== null ? ` from ${movie.media.vote_count} votes` : ""}`}
              >
                <span className="font-semibold">TMDB</span>{" "}
                {movie.media.vote_average.toFixed(1)} / 10
                {movie.media.vote_count !== null
                  ? ` · ${formatVoteCount(movie.media.vote_count)} votes`
                  : ""}
              </p>
            ) : null}
          </div>
          {releaseStatuses.length ? (
            <ul
              aria-label="Release status"
              className="flex min-w-0 flex-wrap gap-1 sm:gap-2"
            >
              {releaseStatuses.map((status) => (
                <li
                  key={status}
                  className="rounded-full bg-[var(--surface-elevated)] px-2 py-1 text-xs sm:px-3 sm:text-sm"
                >
                  {status}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </header>

      <MovieControls
        tmdbId={tmdbId}
        mediaId={movie.media.id}
        title={movie.media.title}
        timeZone={regional.timeZone}
        membership={movie.membership}
      />

      <div className="space-y-1 sm:space-y-2">
        <h2 className="text-lg sm:text-xl font-semibold">
          Release information
        </h2>
        <section className={sectionClass}>
          {regionLabel ? (
            <dl className="grid grid-cols-2 min-w-0 gap-4 sm:grid-cols-4">
              <ReleaseFact
                label={
                  theatrical?.release_type ===
                  MovieReleaseType.LimitedTheatrical
                    ? "Limited theatrical release"
                    : "Theatrical release"
                }
                value={
                  dateOnly(theatrical?.release_date ?? null) ?? "Not announced"
                }
              />
              <ReleaseFact
                label="Digital release"
                value={
                  dateOnly(digital?.release_date ?? null) ?? "Not announced"
                }
              />
            </dl>
          ) : (
            <p className="text-[var(--muted)]">
              Choose a release and streaming region in Profile Settings to see
              regional dates and certification.
            </p>
          )}
        </section>
      </div>

      <Suspense fallback={<OptionalSectionSkeleton label="Where to watch" />}>
        <ProvidersSection regionLabel={regionLabel} promise={providerPromise} />
      </Suspense>

      <Suspense
        fallback={<OptionalSectionSkeleton label="Cast and creators" />}
      >
        <CreditsSection promise={creditsPromise} />
      </Suspense>

      <div className="space-y-1 sm:space-y-2">
        <h2 className="text-lg sm:text-xl font-semibold">More information</h2>
        <section className={sectionClass}>
          <dl className="grid min-w-0 gap-2 sm:grid-cols-2">
            {companies.length ? (
              <ReleaseFact
                label="Production companies"
                value={companies.map((company) => company.name).join(", ")}
              />
            ) : null}
            {movie.media.original_title &&
            movie.media.original_title !== movie.media.title ? (
              <ReleaseFact
                label="Original title"
                value={movie.media.original_title}
              />
            ) : null}
            {movie.media.tmdb_status ? (
              <ReleaseFact label="Status" value={movie.media.tmdb_status} />
            ) : null}
            <Suspense fallback={null}>
              <ExternalLinksFact
                fallback={fallbackLinks}
                promise={linksPromise}
              />
            </Suspense>
          </dl>
        </section>
      </div>
    </article>
  );
}

function ReleaseFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs sm:text-sm font-semibold">{label}</dt>
      <dd className="text-xs sm:text-sm break-words text-[var(--muted)]">
        {value}
      </dd>
    </div>
  );
}
