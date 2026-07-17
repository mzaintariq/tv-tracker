export default function MoviesLoading() {
  return <div className="mx-auto w-full max-w-6xl space-y-10">
    <p className="sr-only" role="status">Loading movies…</p>
    <div aria-hidden="true" className="space-y-10">
      <header data-skeleton-region="heading" className="space-y-3"><div className="h-9 w-40 rounded bg-[var(--surface-elevated)]" /><div className="h-5 w-72 max-w-full rounded bg-[var(--surface-elevated)]" /></header>
      <section data-skeleton-region="movie-grid" className="space-y-4"><div className="h-7 w-36 rounded bg-[var(--surface-elevated)]" /><div className="grid grid-cols-1 gap-4 min-[360px]:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">{Array.from({ length: 4 }, (_, index) => <div key={index} className="min-w-0 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]"><div className="aspect-[2/3] bg-[var(--surface-elevated)]" /><div className="space-y-2 p-4"><div className="h-5 w-3/4 rounded bg-[var(--surface-elevated)]" /><div className="h-4 w-1/2 rounded bg-[var(--surface-elevated)]" /></div></div>)}</div></section>
    </div>
  </div>;
}
