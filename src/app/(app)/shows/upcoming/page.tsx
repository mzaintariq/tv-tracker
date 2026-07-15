import Link from "next/link";
import { redirect } from "next/navigation";
import { ShowSubnav } from "@/components/shows/show-subnav";
import { UpcomingRefreshCoordinator } from "@/components/shows/upcoming-refresh-coordinator";
import { UpcomingSections } from "@/components/shows/upcoming-sections";
import { loadUpcoming } from "@/lib/shows/upcoming-data";
import { createClient } from "@/lib/supabase/server";

export default async function UpcomingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const data = await loadUpcoming(user.id);

  return <main className="mx-auto w-full max-w-6xl space-y-8">
    <div><h1 className="text-3xl font-semibold tracking-tight">Upcoming</h1><p className="mt-2 text-[var(--muted)]">Announced releases from your active tracked shows.</p></div>
    <ShowSubnav current="upcoming" />
    {data.staleTmdbIds.length ? <UpcomingRefreshCoordinator tmdbIds={data.staleTmdbIds} /> : null}
    {!data.trackedShowCount ? <div className="rounded-xl border border-dashed border-[var(--border)] p-8 text-center"><h2 className="text-xl font-semibold">No active shows yet</h2><p className="mt-2 text-[var(--muted)]">Add a show in Explore to see its announced releases.</p><Link href="/explore?type=tv" className="mt-4 inline-block rounded-lg bg-[var(--accent)] px-4 py-2 font-semibold text-[var(--accent-foreground)]">Explore shows</Link></div>
      : data.groups.length ? <UpcomingSections groups={data.groups} today={data.today} />
        : <div className="rounded-xl border border-dashed border-[var(--border)] p-8 text-center"><h2 className="text-xl font-semibold">No upcoming episodes announced</h2><p className="mt-2 text-[var(--muted)]">Newly announced episodes will appear here after metadata updates.</p></div>}
  </main>;
}
