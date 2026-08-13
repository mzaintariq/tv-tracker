export default function ProfileLoading() {
  return (
    <section className="mx-auto w-full max-w-6xl">
      <p className="sr-only" role="status">
        Loading profile…
      </p>
      <div aria-hidden="true">
        <header data-skeleton-region="heading" className="space-y-1 sm:space-y-2">
          <div className="h-8 w-36 rounded bg-[var(--surface-elevated)] sm:h-9" />
          <div className="h-4 w-96 max-w-full rounded bg-[var(--surface-elevated)] sm:h-5" />
        </header>
        <section
          data-skeleton-region="overview"
          className="mt-6 space-y-2 rounded-xl border border-[var(--border)] p-3 sm:mt-8 sm:space-y-3 sm:p-5"
        >
          <div className="h-5 w-28 rounded bg-[var(--surface-elevated)] sm:h-6" />
          <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
            <div className="h-14 rounded-lg bg-[var(--surface-elevated)] sm:h-16" />
            <div className="h-14 rounded-lg bg-[var(--surface-elevated)] sm:h-16" />
          </div>
        </section>
        <section data-skeleton-region="statistics" className="mt-8 space-y-2 sm:mt-12 sm:space-y-3">
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
    </section>
  );
}
