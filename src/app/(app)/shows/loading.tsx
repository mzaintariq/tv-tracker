import { ShowSubnav } from "@/components/shows/show-subnav";
export default function ShowsLoading() {
  return <div className="mx-auto w-full max-w-6xl space-y-10"><div><h1 className="text-3xl font-semibold tracking-tight">TV Shows</h1><p className="mt-2 text-[var(--muted)]">Your watch list and television progress.</p></div><ShowSubnav current="watch-list" /><p className="sr-only" role="status">Loading watch list…</p><div aria-hidden="true" className="animate-pulse space-y-10">
    <section className="space-y-3"><div className="h-8 w-40 rounded bg-[var(--surface-elevated)]" /><div className="grid gap-4 lg:grid-cols-2">{Array.from({ length: 2 }, (_, index) => <div key={index} className="h-48 rounded-xl bg-[var(--surface-elevated)]" />)}</div></section>
    <section className="space-y-3"><div className="h-8 w-52 rounded bg-[var(--surface-elevated)]" /><div className="h-48 rounded-xl bg-[var(--surface-elevated)]" /></section>
    <section className="space-y-3"><div className="h-8 w-44 rounded bg-[var(--surface-elevated)]" /><div className="grid grid-cols-1 gap-4 min-[360px]:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">{Array.from({ length: 4 }, (_, index) => <div key={index} className="aspect-[2/3] rounded-xl bg-[var(--surface-elevated)]" />)}</div></section>
  </div></div>;
}
