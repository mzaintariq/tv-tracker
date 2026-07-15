export default function ShowsLoading() {
  return <div className="mx-auto w-full max-w-6xl animate-pulse space-y-10">
    <div className="space-y-3"><div className="h-10 w-48 rounded bg-[var(--surface-elevated)]" /><div className="h-5 w-72 max-w-full rounded bg-[var(--surface-elevated)]" /></div>
    <section className="space-y-3"><div className="h-8 w-40 rounded bg-[var(--surface-elevated)]" /><div className="grid gap-4 lg:grid-cols-2">{Array.from({ length: 2 }, (_, index) => <div key={index} className="h-48 rounded-xl bg-[var(--surface-elevated)]" />)}</div></section>
    <section className="space-y-3"><div className="h-8 w-52 rounded bg-[var(--surface-elevated)]" /><div className="h-48 rounded-xl bg-[var(--surface-elevated)]" /></section>
    <section className="space-y-3"><div className="h-8 w-44 rounded bg-[var(--surface-elevated)]" /><div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">{Array.from({ length: 4 }, (_, index) => <div key={index} className="aspect-[2/3] rounded-xl bg-[var(--surface-elevated)]" />)}</div></section>
  </div>;
}
