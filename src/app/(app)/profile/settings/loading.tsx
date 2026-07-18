export default function ProfileSettingsLoading() {
  return (
    <section className="mx-auto w-full max-w-6xl">
      <p className="sr-only" role="status">
        Loading settings…
      </p>
      <div aria-hidden="true">
        <header data-skeleton-region="heading" className="space-y-3">
          <div className="h-4 w-28 rounded bg-[var(--surface-elevated)]" />
          <div className="h-9 w-40 rounded bg-[var(--surface-elevated)]" />
          <div className="h-5 w-96 max-w-full rounded bg-[var(--surface-elevated)]" />
        </header>
        <section data-skeleton-region="preferences" className="mt-8 max-w-lg space-y-5">
          {Array.from({ length: 2 }, (_, index) => (
            <div key={index} className="space-y-2">
              <div className="h-4 w-28 rounded bg-[var(--surface-elevated)]" />
              <div className="h-12 rounded-lg bg-[var(--surface-elevated)]" />
            </div>
          ))}
          <div className="h-12 rounded-lg bg-[var(--surface-elevated)]" />
        </section>
        <section data-skeleton-region="theme" className="mt-8 max-w-lg space-y-3">
          <div className="h-4 w-20 rounded bg-[var(--surface-elevated)]" />
          {Array.from({ length: 3 }, (_, index) => (
            <div key={index} className="h-12 rounded-lg bg-[var(--surface-elevated)]" />
          ))}
        </section>
        <div data-skeleton-region="account-tools" className="mt-8 grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 2 }, (_, index) => (
            <div
              key={index}
              className="h-36 rounded-xl border border-[var(--border)] bg-[var(--surface)]"
            />
          ))}
        </div>
      </div>
    </section>
  );
}
