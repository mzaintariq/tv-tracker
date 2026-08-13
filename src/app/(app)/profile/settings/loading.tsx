export default function ProfileSettingsLoading() {
  return (
    <section className="mx-auto w-full max-w-6xl">
      <p className="sr-only" role="status">
        Loading settings…
      </p>
      <div aria-hidden="true">
        <header data-skeleton-region="heading" className="space-y-1 sm:space-y-2">
          <div className="h-3 w-28 rounded bg-[var(--surface-elevated)] sm:h-4" />
          <div className="h-8 w-40 rounded bg-[var(--surface-elevated)] sm:h-9" />
          <div className="h-4 w-96 max-w-full rounded bg-[var(--surface-elevated)] sm:h-5" />
        </header>
        <section
          data-skeleton-region="preferences"
          className="mt-6 max-w-lg space-y-3 sm:mt-8 sm:space-y-5"
        >
          {Array.from({ length: 2 }, (_, index) => (
            <div key={index} className="space-y-1 sm:space-y-2">
              <div className="h-3 w-28 rounded bg-[var(--surface-elevated)] sm:h-4" />
              <div className="h-11 rounded-lg bg-[var(--surface-elevated)] sm:h-12" />
            </div>
          ))}
          <div className="h-11 rounded-lg bg-[var(--surface-elevated)] sm:h-12" />
        </section>
        <section
          data-skeleton-region="theme"
          className="mt-6 max-w-lg space-y-2 sm:mt-8 sm:space-y-3"
        >
          <div className="h-3 w-20 rounded bg-[var(--surface-elevated)] sm:h-4" />
          {Array.from({ length: 3 }, (_, index) => (
            <div
              key={index}
              className="h-11 rounded-lg bg-[var(--surface-elevated)] sm:h-12"
            />
          ))}
        </section>
        <div
          data-skeleton-region="account-tools"
          className="mt-6 grid gap-2 sm:mt-8 sm:grid-cols-2 sm:gap-4"
        >
          {Array.from({ length: 2 }, (_, index) => (
            <div
              key={index}
              className="h-28 rounded-xl border border-[var(--border)] bg-[var(--surface)] sm:h-36"
            />
          ))}
        </div>
      </div>
    </section>
  );
}
