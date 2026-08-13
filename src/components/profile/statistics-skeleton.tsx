export function StatisticsSkeleton() {
  return (
    <div className="min-w-0 space-y-6 sm:space-y-8">
      <p className="sr-only" role="status">
        Loading statistics…
      </p>
      <div aria-hidden="true">
        <section data-skeleton-region="statistics" className="space-y-2 sm:space-y-3">
          <div className="h-7 w-32 rounded bg-[var(--surface-elevated)] sm:h-8" />
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
            {Array.from({ length: 4 }, (_, index) => (
              <div
                key={index}
                className="h-20 rounded-xl border border-[var(--border)] bg-[var(--surface)] sm:h-24"
              />
            ))}
          </div>
          <div className="mt-6 grid gap-2 sm:mt-8 sm:grid-cols-3 sm:gap-3">
            {Array.from({ length: 3 }, (_, index) => (
              <div
                key={index}
                className="h-24 rounded-xl border border-[var(--border)] bg-[var(--surface)] sm:h-28"
              />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
