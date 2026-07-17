export default function MovieDetailLoading() {
  return <article className="mx-auto w-full max-w-5xl space-y-8">
    <p className="sr-only" role="status">Loading movie…</p>
    <div aria-hidden="true">
      <header data-skeleton-region="poster-header" className="grid gap-6 sm:grid-cols-[180px_1fr]"><div className="aspect-[2/3] rounded-xl bg-[var(--surface-elevated)]" /><div className="space-y-4"><div className="h-9 w-2/3 rounded bg-[var(--surface-elevated)]" /><div className="h-5 w-44 rounded bg-[var(--surface-elevated)]" /><div className="space-y-2"><div className="h-4 w-full rounded bg-[var(--surface-elevated)]" /><div className="h-4 w-4/5 rounded bg-[var(--surface-elevated)]" /></div><div className="h-5 w-28 rounded bg-[var(--surface-elevated)]" /><section data-skeleton-region="tracking-controls" className="h-40 rounded-xl border border-[var(--border)] bg-[var(--surface)]" /></div></header>
    </div>
  </article>;
}
