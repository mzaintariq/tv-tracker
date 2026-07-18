export default function ProfileLoading() {
  return (
    <section className="mx-auto w-full max-w-6xl">
      <p className="sr-only" role="status">
        Loading profile…
      </p>
      <div aria-hidden="true">
        <header data-skeleton-region="heading" className="space-y-3">
          <div className="h-9 w-36 rounded bg-[var(--surface-elevated)]" />
          <div className="h-5 w-96 max-w-full rounded bg-[var(--surface-elevated)]" />
        </header>
        <section data-skeleton-region="overview" className="mt-8 space-y-3 rounded-xl border border-[var(--border)] p-4 sm:p-5">
          <div className="h-6 w-28 rounded bg-[var(--surface-elevated)]" />
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="h-16 rounded-lg bg-[var(--surface-elevated)]" />
            <div className="h-16 rounded-lg bg-[var(--surface-elevated)]" />
          </div>
        </section>
        <section data-skeleton-region="statistics" className="mt-12 space-y-4">
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
    </section>
  );
}
