"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addToLibrary, prepareShowProgress } from "@/app/actions/library";
import { MediaPoster } from "@/components/media/media-poster";
import { useNotifications } from "@/components/ui/notifications";
import type { ExploreMediaItem } from "@/lib/media/types";
import type {
  PreviewCore,
  PreviewExtras,
  PreviewKey,
} from "@/lib/media/preview";
import { formatDateOnly } from "@/lib/date-time";
import { regionDisplayName } from "@/lib/regions";
import { MediaPreviewShell } from "@/components/explore/media-preview-shell";

type ExtrasResponse = PreviewExtras & { region: string | null };
type CoreResponse = PreviewCore & { inLibrary: boolean };
const date = (value: string | null) =>
  value ? formatDateOnly(value, { dateStyle: "long" }) : null;
const sectionClass =
  "min-w-0 space-y-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 sm:space-y-4 sm:p-6";

export function MediaPreview({
  previewKey,
  immediate,
  onClose,
  onMovieAdded,
}: {
  previewKey: PreviewKey;
  immediate: ExploreMediaItem | null;
  onClose: () => void;
  onMovieAdded: () => void;
}) {
  const router = useRouter();
  const { notify } = useNotifications();
  const [core, setCore] = useState<PreviewCore | null>(null);
  const [extras, setExtras] = useState<ExtrasResponse | null>(null);
  const [coreError, setCoreError] = useState<string | null>(null);
  const [extrasError, setExtrasError] = useState(false);
  const [inLibrary, setInLibrary] = useState(immediate?.inLibrary ?? false);
  const [pending, startTransition] = useTransition();
  const encoded = encodeURIComponent(
    `${previewKey.mediaType}:${previewKey.tmdbId}`,
  );
  const load = useCallback(() => {
    const controller = new AbortController();
    fetch(`/api/explore/preview?preview=${encoded}&section=core`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok)
          throw new Error(
            ((await response.json()) as { error?: string }).error ??
              "Preview details could not be loaded.",
          );
        return response.json() as Promise<CoreResponse>;
      })
      .then((value) => {
        setCore(value);
        setInLibrary(value.inLibrary);
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted)
          setCoreError(
            error instanceof Error
              ? error.message
              : "Preview details could not be loaded.",
          );
      });
    fetch(`/api/explore/preview?preview=${encoded}&section=extras`, {
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok) throw new Error();
        return response.json() as Promise<ExtrasResponse>;
      })
      .then(setExtras)
      .catch(() => {
        if (!controller.signal.aborted) setExtrasError(true);
      });
    return () => controller.abort();
  }, [encoded]);
  useEffect(load, [load]);

  const title = core?.title ?? immediate?.title ?? "Media quick view";
  const poster = core?.posterPath ?? immediate?.posterPath ?? null;
  const detailsHref = `/${previewKey.mediaType === "movie" ? "movies" : "shows"}/${previewKey.tmdbId}`;
  const add = () =>
    startTransition(async () => {
      const result =
        previewKey.mediaType === "movie"
          ? await addToLibrary("movie", previewKey.tmdbId)
          : await prepareShowProgress(previewKey.tmdbId);
      if (result.error) {
        notify(result.error, "error");
        return;
      }
      notify(result.success ?? "Library updated.");
      if (previewKey.mediaType === "tv") {
        router.push(detailsHref);
        return;
      }
      setInLibrary(true);
      onMovieAdded();
    });

  const footer =
    core || immediate ? (
      inLibrary ? (
        <Link
          href={detailsHref}
          className="touch-target inline-flex w-full items-center justify-center rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--accent-foreground)]"
        >
          Open full details
        </Link>
      ) : (
        <button
          type="button"
          onClick={add}
          disabled={pending}
          aria-busy={pending}
          className="touch-target w-full rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--accent-foreground)]"
        >
          {pending
            ? "Working…"
            : previewKey.mediaType === "tv"
              ? "Add show & set progress"
              : "Add to watchlist"}
        </button>
      )
    ) : (
      <button
        type="button"
        disabled
        className="touch-target w-full rounded-lg bg-[var(--surface-elevated)] px-4 py-2 text-sm font-semibold text-[var(--muted)]"
      >
        Loading…
      </button>
    );

  return (
    <MediaPreviewShell title={title} onClose={onClose} footer={footer}>
      <div className="space-y-6 sm:space-y-8">
        <header className="grid min-w-0 grid-cols-[100px_minmax(0,1fr)] gap-3 sm:grid-cols-[180px_minmax(0,1fr)] sm:gap-4">
          <div className="relative aspect-[2/3] w-full overflow-hidden rounded-xl bg-[var(--surface-elevated)]">
            <MediaPoster
              source={poster}
              title={title}
              alt={`${title} poster`}
              sizes="180px"
              tmdbSize="w500"
              fallbackClassName="text-2xl font-semibold text-[var(--muted)]"
            />
          </div>
          <div className="min-w-0 space-y-1 sm:space-y-4">
            <h1 className="break-words text-xl font-semibold sm:text-3xl">
              {title}
            </h1>
            {core ? (
              <div className="min-w-0 space-y-2 sm:space-y-4">
                <p className="text-xs sm:text-sm text-[var(--muted)]">
                  {date(core.date) ?? "Date unknown"}
                  {core.runtimeMinutes
                    ? ` · ${core.runtimeMinutes} min${core.mediaType === "tv" ? " average" : ""}`
                    : ""}
                  {extras?.certification ? ` · ${extras.certification}` : ""}
                </p>
                {core.genres.length ? (
                  <ul aria-label="Genres" className="flex flex-wrap gap-1">
                    {core.genres.map((genre) => (
                      <li
                        key={genre.id}
                        className="rounded-full bg-[var(--surface-elevated)] px-2 py-1 text-xs"
                      >
                        {genre.name}
                      </li>
                    ))}
                  </ul>
                ) : null}
                {core.voteAverage !== null ? (
                  <p className="text-xs sm:text-sm">
                    <strong>TMDB</strong> {core.voteAverage.toFixed(1)} / 10
                    {core.voteCount !== null
                      ? ` · ${core.voteCount.toLocaleString()} votes`
                      : ""}
                  </p>
                ) : null}
                {extras?.trailer ? (
                  <div>
                    <TrailerButton trailer={extras.trailer} />
                  </div>
                ) : null}
              </div>
            ) : !coreError ? (
              <p role="status" className="text-sm text-[var(--muted)]">
                Loading details…
              </p>
            ) : null}
          </div>
        </header>

        {coreError ? (
          <section
            role="alert"
            className="space-y-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4"
          >
            <p>{coreError}</p>
            <button
              type="button"
              onClick={() => {
                setCoreError(null);
                setExtrasError(false);
                setCore(null);
                setExtras(null);
                load();
              }}
              className="touch-target rounded-lg bg-[var(--accent)] px-4 py-2 font-semibold text-[var(--accent-foreground)]"
            >
              Retry
            </button>
          </section>
        ) : null}
        {!coreError && (core?.overview || immediate?.overview) ? (
          <section className="space-y-1 sm:space-y-2">
            <h2 className="text-lg font-semibold sm:text-xl">Overview</h2>
            <p className="break-words text-xs sm:text-sm">
              {core?.overview || immediate?.overview}
            </p>
          </section>
        ) : null}
        {core?.mediaType === "tv" ? (
          <PreviewSection title="Show facts">
            <dl className="grid grid-cols-2 gap-4 text-xs sm:grid-cols-3 sm:text-sm">
              <Fact label="Status" value={core.status} />
              <Fact label="Last air date" value={date(core.lastAirDate)} />
              <Fact
                label="Creators"
                value={
                  core.creators.map((item) => item.name).join(", ") || null
                }
              />
              <Fact
                label="Networks"
                value={
                  core.networks.map((item) => item.name).join(", ") || null
                }
              />
            </dl>
          </PreviewSection>
        ) : null}
        {extras ? (
          <Extras data={extras} mediaType={previewKey.mediaType} />
        ) : !extrasError ? (
          <section
            aria-busy="true"
            className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4"
          >
            <p role="status" className="text-sm text-[var(--muted)]">
              Loading cast, providers, and trailer…
            </p>
          </section>
        ) : (
          <p role="alert" className="text-sm text-[var(--muted)]">
            Some additional information is temporarily unavailable.
          </p>
        )}
        {core ? (
          <PreviewSection title="More information">
            <dl>
              <ExternalLinks links={core.links} />
            </dl>
          </PreviewSection>
        ) : null}
      </div>
    </MediaPreviewShell>
  );
}

function Fact({ label, value }: { label: string; value: string | null }) {
  return value ? (
    <div>
      <dt className="font-semibold">{label}</dt>
      <dd className="break-words text-[var(--muted)]">{value}</dd>
    </div>
  ) : null;
}
function Extras({
  data,
  mediaType,
}: {
  data: ExtrasResponse;
  mediaType: "movie" | "tv";
}) {
  const labels = {
    stream: "Stream",
    free: "Free",
    ads: "Ad-supported",
    rent: "Rent",
    buy: "Buy",
  } as const;
  const available = data.providers
    ? (Object.keys(labels) as Array<keyof typeof labels>).filter(
        (key) => data.providers?.groups[key].length,
      )
    : [];
  return (
    <div className="space-y-6 sm:space-y-8">
      {mediaType === "movie" && data.region ? (
        <PreviewSection title="Release information">
          <dl className="grid grid-cols-2 gap-4 text-xs sm:text-sm">
            <Fact
              label="Theatrical"
              value={
                date(data.theatrical?.release_date ?? null) ?? "Not announced"
              }
            />
            <Fact
              label="Digital"
              value={
                date(data.digital?.release_date ?? null) ?? "Not announced"
              }
            />
          </dl>
          <p className="text-xs text-[var(--muted)]">
            For {regionDisplayName(data.region) ?? data.region}; no regional
            fallback.
          </p>
        </PreviewSection>
      ) : null}
      {data.directors.length || data.cast.length ? (
        <PreviewSection title="Cast and creators">
          {data.directors.length ? (
            <div>
              <h3 className="text-xs font-semibold sm:text-sm">
                Director{data.directors.length > 1 ? "s" : ""}
              </h3>
              <p className="break-words text-xs sm:mt-1 sm:text-sm">
                {data.directors.map((item) => item.name).join(", ")}
              </p>
            </div>
          ) : null}
          {data.cast.length ? (
            <div>
              <h3 className="text-xs font-semibold sm:text-sm">Top cast</h3>
              <ul
                aria-label="Top cast"
                className="mt-1 grid min-w-0 grid-cols-2 gap-1 sm:mt-2 sm:gap-2"
              >
                {data.cast.map((person) => (
                  <li
                    key={person.personId}
                    className="min-w-0 rounded-lg bg-[var(--surface-elevated)] p-2 sm:p-3"
                  >
                    <p className="break-words text-xs font-medium sm:text-sm">
                      {person.name}
                    </p>
                    {person.character ? (
                      <p className="break-words text-xs text-[var(--muted)] sm:text-sm">
                        as {person.character}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </PreviewSection>
      ) : null}
      <PreviewSection title="Where to watch">
        {!data.region ? (
          <p className="text-xs text-[var(--muted)] sm:text-sm">
            Choose a region in Profile Settings to see availability.
          </p>
        ) : available.length ? (
          <div className="space-y-3 sm:space-y-4">
            {available.map((category) => (
              <div key={category} className="space-y-1">
                <h3 className="text-xs font-semibold sm:text-sm">
                  {labels[category]}
                </h3>
                <ul
                  aria-label={`${labels[category]} providers`}
                  className="flex min-w-0 gap-1 overflow-x-auto whitespace-nowrap [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:flex-wrap sm:gap-2 sm:overflow-x-visible sm:whitespace-normal"
                >
                  {data.providers?.groups[category].map((provider) => (
                    <li
                      key={provider.providerId}
                      className="shrink-0 rounded-full bg-[var(--surface-elevated)] px-2 py-1 text-xs sm:px-3 sm:py-2 sm:text-sm"
                    >
                      {provider.providerName}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-[var(--muted)] sm:text-sm">
            No providers are currently listed for this region.
          </p>
        )}
        <p className="text-xs text-[var(--muted)]">
          Availability data supplied by JustWatch via TMDB.
          {data.providers?.attributionLink ? (
            <>
              {" "}
              <a
                className="underline underline-offset-4"
                href={data.providers.attributionLink}
                target="_blank"
                rel="noopener noreferrer"
              >
                View availability on TMDB
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
              .
            </>
          ) : null}
        </p>
      </PreviewSection>
      {data.failures.length ? (
        <p className="text-xs text-[var(--muted)]">
          Some additional information is temporarily unavailable.
        </p>
      ) : null}
    </div>
  );
}
function PreviewSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1 sm:space-y-2">
      <h2 className="text-lg font-semibold sm:text-xl">{title}</h2>
      <section className={sectionClass}>{children}</section>
    </div>
  );
}
function TrailerButton({
  trailer,
}: {
  trailer: NonNullable<PreviewExtras["trailer"]>;
}) {
  return (
    <a
      className="inline-flex max-w-full items-center gap-1 rounded-full border border-[var(--control-border)] px-2 py-1 text-xs font-semibold sm:px-3 sm:text-sm"
      href={`https://www.youtube.com/watch?v=${encodeURIComponent(trailer.key)}`}
      target="_blank"
      rel="noopener noreferrer"
    >
      <svg
        aria-hidden="true"
        xmlns="http://www.w3.org/2000/svg"
        width="12"
        height="12"
        fill="currentColor"
        viewBox="2 2 20 20"
      >
        <path d="M6.51 18.87c.15.09.32.13.49.13s.36-.05.51-.14l10-6c.3-.18.49-.51.49-.86s-.18-.68-.49-.86l-10-6a.99.99 0 0 0-1.01-.01c-.31.18-.51.51-.51.87v12c0 .36.19.69.51.87Z" />
      </svg>
      Trailer
      <span className="sr-only">
        : {trailer.name} on YouTube (opens in a new tab)
      </span>
    </a>
  );
}
function ExternalLinks({ links }: { links: PreviewCore["links"] }) {
  const values: Array<[string, string | null]> = [
    ["Web", links.homepage],
    ["TMDB", links.tmdb],
    ["IMDb", links.imdb],
  ];
  return (
    <div className="min-w-0">
      <dt className="text-xs font-semibold sm:text-sm">Open in</dt>
      <dd className="mt-1 flex min-w-0 flex-wrap gap-2">
        {values
          .filter((entry): entry is [string, string] => Boolean(entry[1]))
          .map(([label, href]) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex max-w-full items-center rounded-full border border-[var(--control-border)] px-2 py-1 text-xs font-semibold"
            >
              {label}
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          ))}
      </dd>
    </div>
  );
}
