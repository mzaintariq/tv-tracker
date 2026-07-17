export default function ImportDetailLoading() {
  return <div className="space-y-8">
    <p className="sr-only" role="status">Loading import details…</p>
    <div aria-hidden="true" className="space-y-8">
      <header data-skeleton-region="heading" className="space-y-3"><div className="h-9 w-52 rounded bg-[var(--surface-elevated)]" /><div className="h-5 w-28 rounded bg-[var(--surface-elevated)]" /><div className="h-4 w-full max-w-3xl rounded bg-[var(--surface-elevated)]" /></header>
      <section data-skeleton-region="summary" className="grid gap-3 sm:grid-cols-4">{Array.from({ length: 4 }, (_, index) => <div key={index} className="h-20 rounded-xl border border-[var(--border)] bg-[var(--surface)]" />)}</section>
      <section data-skeleton-region="progress" className="space-y-4 rounded-xl border border-[var(--border)] p-5"><div className="h-7 w-48 rounded bg-[var(--surface-elevated)]" /><div className="h-3 rounded-full bg-[var(--surface-elevated)]" /><div className="h-4 w-2/3 rounded bg-[var(--surface-elevated)]" /></section>
      <section data-skeleton-region="resolution" className="space-y-3 rounded-xl border border-[var(--border)] p-5"><div className="h-7 w-56 rounded bg-[var(--surface-elevated)]" /><div className="h-24 rounded-lg bg-[var(--surface-elevated)]" /><div className="h-24 rounded-lg bg-[var(--surface-elevated)]" /></section>
    </div>
  </div>;
}
