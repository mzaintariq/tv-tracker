import Link from "next/link";

import { MediaPoster } from "@/components/media/media-poster";
import {
  formatDuration,
  type ProfileFavourite,
  type ProfileStatistics,
} from "@/lib/profile/statistics";

const labels: Array<
  [
    keyof Pick<
      ProfileStatistics,
      | "trackedShows"
      | "episodesWatched"
      | "moviesInLibrary"
      | "moviesWatched"
      | "favouriteShows"
      | "favouriteMovies"
      | "completedShows"
      | "caughtUpShows"
    >,
    string,
  ]
> = [
  ["trackedShows", "Tracked shows"],
  ["episodesWatched", "Episodes watched"],
  ["moviesInLibrary", "Movies in library"],
  ["moviesWatched", "Movies watched"],
  ["favouriteShows", "Favourite shows"],
  ["favouriteMovies", "Favourite movies"],
  ["completedShows", "Completed shows"],
  ["caughtUpShows", "Caught-up shows"],
];

function FavouriteRail({
  items,
  kind,
}: {
  items: ProfileFavourite[];
  kind: "shows" | "movies";
}) {
  return (
    <ul className="mt-3 flex w-full min-w-0 gap-4 overflow-x-auto px-1 pb-3 pt-1">
      {items.map((item) => (
        <li key={item.membershipId} className="w-32 shrink-0 sm:w-36">
          <Link
            href={`/${kind}/${item.tmdbId}`}
            aria-label={item.title}
            title={item.title}
            className="poster-interactive-surface relative block aspect-[2/3] overflow-hidden rounded-xl border bg-[var(--surface-elevated)]"
          >
            <MediaPoster
              source={item.posterPath}
              title={item.title}
              alt=""
              sizes="144px"
            />
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function StatisticsSummary({
  statistics,
  favouriteShows,
  favouriteMovies,
}: {
  statistics: ProfileStatistics;
  favouriteShows: ProfileFavourite[];
  favouriteMovies: ProfileFavourite[];
}) {
  const times = [
    ["Television", statistics.tvMinutes],
    ["Movies", statistics.movieMinutes],
    ["Combined", statistics.totalMinutes],
  ] as const;

  return (
    <div className="min-w-0 space-y-8">
      <section>
        <h2 className="break-words text-2xl font-semibold">Statistics</h2>
        <dl className="mt-3 grid grid-cols-1 gap-3 min-[360px]:grid-cols-2 sm:grid-cols-4">
          {labels.map(([key, label]) => (
            <div
              key={key}
              className="min-w-0 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4"
            >
              <dt className="break-words text-sm text-[var(--muted)]">
                {label}
              </dt>
              <dd className="mt-1 break-words text-2xl font-semibold">
                {statistics[key]}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section>
        <h2 className="break-words text-2xl font-semibold">
          Estimated watch time
        </h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {times.map(([label, minutes]) => {
            const value = formatDuration(minutes);
            return (
              <div
                key={label}
                className="min-w-0 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4"
              >
                <h3 className="break-words font-semibold">{label}</h3>
                <p className="mt-2 break-words text-xl font-semibold">
                  {value.daysAndHours}
                </p>
                <p className="break-words text-sm text-[var(--muted)]">
                  {value.hours} · {value.minutes}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {favouriteShows.length ? (
        <section>
          <h2 className="break-words text-2xl font-semibold">
            Favourite shows
          </h2>
          <FavouriteRail items={favouriteShows} kind="shows" />
        </section>
      ) : null}

      {favouriteMovies.length ? (
        <section>
          <h2 className="break-words text-2xl font-semibold">
            Favourite movies
          </h2>
          <FavouriteRail items={favouriteMovies} kind="movies" />
        </section>
      ) : null}
    </div>
  );
}
