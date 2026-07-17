export default function ImportLoading() {
  return <main className="space-y-8">
    <p className="sr-only" role="status">Loading import…</p>
    <div aria-hidden="true" className="space-y-8">
      <header data-skeleton-region="heading" className="space-y-3"><div className="h-9 w-48 rounded bg-[var(--surface-elevated)]" /><div className="h-5 w-full max-w-2xl rounded bg-[var(--surface-elevated)]" /></header>
      <section data-skeleton-region="upload" className="space-y-4 rounded-xl border border-[var(--border)] p-5"><div className="h-7 w-44 rounded bg-[var(--surface-elevated)]" /><div className="h-12 w-full max-w-md rounded-lg bg-[var(--surface-elevated)]" /><div className="h-4 w-2/3 rounded bg-[var(--surface-elevated)]" /></section>
      <section data-skeleton-region="sessions" className="space-y-3"><div className="h-7 w-40 rounded bg-[var(--surface-elevated)]" />{Array.from({ length: 2 }, (_, index) => <div key={index} className="h-20 rounded-xl border border-[var(--border)] bg-[var(--surface)]" />)}</section>
      <section data-skeleton-region="cleanup" className="h-32 rounded-xl border border-[var(--border)] bg-[var(--surface)]" />
    </div>
  </main>;
}
