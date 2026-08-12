export default function MovieUpcomingLoading() {
  return (
    <div className="space-y-2 sm:space-y-3">
      <div className="h-7 w-52 rounded bg-[var(--surface-elevated)] sm:h-8" />
      <p className="sr-only" role="status">
        Loading upcoming movie releases…
      </p>
      <div
        aria-hidden="true"
        data-skeleton-region="movie-release-list"
        className="w-full space-y-2 sm:space-y-3"
      >
        {Array.from({ length: 4 }, (_, i) => (
          <div
            key={i}
            className="grid min-h-28 grid-cols-[4rem_minmax(0,1fr)_3.75rem] gap-3 rounded-xl border border-[var(--border)] p-3 sm:min-h-36 sm:grid-cols-[5rem_minmax(0,1fr)_5rem] sm:gap-4 sm:p-4"
          >
            <div className="aspect-[2/3] w-16 rounded-lg bg-[var(--surface-elevated)] sm:w-20" />
            <div className="min-w-0 space-y-2 self-center sm:space-y-3">
              <div className="h-4 w-3/4 rounded bg-[var(--surface-elevated)] sm:h-5" />
              <div className="h-3 w-full rounded bg-[var(--surface-elevated)] sm:h-4" />
              <div className="h-3 w-4/5 rounded bg-[var(--surface-elevated)] sm:h-4" />
            </div>
            <div className="h-12 w-full self-center rounded bg-[var(--surface-elevated)]" />
          </div>
        ))}
      </div>
    </div>
  );
}
