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
    <ul className="mt-2 flex w-full min-w-0 gap-2 overflow-x-auto px-1 pb-2 pt-1 sm:mt-3 sm:gap-4 sm:pb-3">
      {items.map((item) => (
        <li key={item.membershipId} className="w-28 shrink-0 sm:w-36">
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
    <div className="min-w-0 space-y-6 sm:space-y-8">
      <section>
        <h2 className="break-words text-xl font-semibold sm:text-2xl">
          Statistics
        </h2>
        <dl className="mt-2 grid grid-cols-1 gap-2 min-[360px]:grid-cols-2 sm:mt-3 sm:grid-cols-4 sm:gap-3">
          {labels.map(([key, label]) => (
            <div
              key={key}
              className="min-w-0 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 sm:p-4"
            >
              <dt className="break-words text-xs text-[var(--muted)] sm:text-sm">
                {label}
              </dt>
              <dd className="mt-1 break-words text-xl font-semibold sm:text-2xl">
                {statistics[key]}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section>
        <h2 className="break-words text-xl font-semibold sm:text-2xl">
          Estimated watch time
        </h2>
        <div className="mt-2 grid gap-2 sm:mt-3 sm:grid-cols-3 sm:gap-3">
          {times.map(([label, minutes]) => {
            const value = formatDuration(minutes);
            return (
              <div
                key={label}
                className="min-w-0 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 sm:p-4"
              >
                <h3 className="break-words text-sm font-semibold sm:text-base">
                  {label}
                </h3>
                <p className="mt-1 break-words text-lg font-semibold sm:mt-2 sm:text-xl">
                  {value.daysAndHours}
                </p>
                <p className="break-words text-xs text-[var(--muted)] sm:text-sm">
                  {value.hours} · {value.minutes}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {favouriteShows.length ? (
        <section>
          <h2 className="break-words text-xl font-semibold sm:text-2xl">
            Favourite shows
          </h2>
          <FavouriteRail items={favouriteShows} kind="shows" />
        </section>
      ) : null}

      {favouriteMovies.length ? (
        <section>
          <h2 className="break-words text-xl font-semibold sm:text-2xl">
            Favourite movies
          </h2>
          <FavouriteRail items={favouriteMovies} kind="movies" />
        </section>
      ) : null}
    </div>
  );
}
