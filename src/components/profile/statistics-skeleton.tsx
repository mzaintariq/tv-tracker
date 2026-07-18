export function StatisticsSkeleton() {
  return (
    <div className="min-w-0 space-y-8">
      <p className="sr-only" role="status">
        Loading statistics…
      </p>
      <div aria-hidden="true">
        <section data-skeleton-region="statistics" className="space-y-4">
          <div className="h-8 w-32 rounded bg-[var(--surface-elevated)]" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {Array.from({ length: 4 }, (_, index) => (
              <div
                key={index}
                className="h-24 rounded-xl border border-[var(--border)] bg-[var(--surface)]"
              />
            ))}
          </div>
          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            {Array.from({ length: 3 }, (_, index) => (
              <div
                key={index}
                className="h-28 rounded-xl border border-[var(--border)] bg-[var(--surface)]"
              />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
