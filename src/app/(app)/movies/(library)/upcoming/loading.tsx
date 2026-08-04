export default function MovieUpcomingLoading() {
  return (
    <div className="space-y-8">
      <header>
        <div className="h-9 w-52 rounded bg-[var(--surface-elevated)]" />
        <div className="mt-2 h-5 w-44 rounded bg-[var(--surface-elevated)]" />
      </header>
      <p className="sr-only" role="status">
        Loading upcoming movie releases…
      </p>
      <div
        aria-hidden="true"
        data-skeleton-region="movie-release-list"
        className="mx-auto max-w-3xl space-y-3"
      >
        {Array.from({ length: 4 }, (_, i) => (
          <div
            key={i}
            className="grid min-h-28 grid-cols-[4rem_minmax(0,1fr)_3.75rem] gap-3 rounded-xl border border-[var(--border)] p-3 sm:min-h-36 sm:grid-cols-[5rem_minmax(0,1fr)_5rem] sm:gap-4 sm:p-4"
          >
            <div className="aspect-[2/3] w-16 rounded-lg bg-[var(--surface-elevated)] sm:w-20" />
            <div className="min-w-0 space-y-3 self-center">
              <div className="h-5 w-3/4 rounded bg-[var(--surface-elevated)]" />
              <div className="h-4 w-full rounded bg-[var(--surface-elevated)]" />
              <div className="h-4 w-4/5 rounded bg-[var(--surface-elevated)]" />
            </div>
            <div className="h-12 w-full self-center rounded bg-[var(--surface-elevated)]" />
          </div>
        ))}
      </div>
    </div>
  );
}
