import { ShowSubnav } from "@/components/shows/show-subnav";
export default function UpcomingLoading() {
  return <div className="mx-auto w-full max-w-6xl space-y-8"><ShowSubnav current="upcoming" /><p className="sr-only" role="status">Loading upcoming episodes…</p><div aria-hidden="true" className="animate-pulse space-y-8"><section className="space-y-3"><div className="h-8 w-28 rounded bg-[var(--surface-elevated)]" /><div className="grid gap-4 lg:grid-cols-2"><div className="h-36 rounded-xl bg-[var(--surface-elevated)]" /><div className="h-36 rounded-xl bg-[var(--surface-elevated)]" /></div></section></div></div>;
}
