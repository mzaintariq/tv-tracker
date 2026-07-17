import Link from "next/link"; import { redirect } from "next/navigation";
import { NeedsEpisodeDataGrid, RecentlyWatchedList, ShowGrid, WatchListSection, WatchNextGrid } from "@/components/shows/watch-list-sections";
import { loadWatchList } from "@/lib/shows/data"; import { createClient } from "@/lib/supabase/server";
import { ShowSubnav } from "@/components/shows/show-subnav";

export default async function ShowsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const list = await loadWatchList(user.id);

  return <div className="mx-auto w-full max-w-6xl space-y-10">
    <div><h1 className="text-3xl font-semibold tracking-tight">TV Shows</h1><p className="mt-2 text-[var(--muted)]">Your watch list and television progress.</p></div>
    <ShowSubnav current="watch-list" />
    {!list.shows.length ? <div className="rounded-xl border border-dashed border-[var(--border)] p-8 text-center"><h2 className="text-xl font-semibold">No shows yet</h2><p className="mt-2 text-[var(--muted)]">Find a show in Explore and set your starting progress.</p><Link href="/explore?type=tv" className="mt-4 inline-block rounded-lg bg-[var(--accent)] px-4 py-2 font-semibold text-[var(--accent-foreground)]">Explore shows</Link></div> : <>
      <WatchListSection title="Watch Next" description="Continue active shows you have already started.">
        {list.watchNext.length ? <WatchNextGrid items={list.watchNext} /> : <p className="rounded-xl border border-dashed border-[var(--border)] p-6 text-center text-[var(--muted)]">No started shows have a released episode waiting.</p>}
      </WatchListSection>
      {list.recentlyWatched.length ? <WatchListSection title="Recently Watched" description="Your latest watched episodes from currently tracked shows."><RecentlyWatchedList items={list.recentlyWatched} /></WatchListSection> : null}
      {list.inactive.length ? <WatchListSection title="Haven't Watched for a While" description="Active shows with no watched episode in more than 30 days."><ShowGrid shows={list.inactive} /></WatchListSection> : null}
      {list.notStarted.length ? <WatchListSection title="Haven't Started"><ShowGrid shows={list.notStarted} /></WatchListSection> : null}
      {list.caughtUp.length ? <WatchListSection title="Caught Up"><ShowGrid shows={list.caughtUp} /></WatchListSection> : null}
      {list.completed.length ? <WatchListSection title="Completed"><ShowGrid shows={list.completed} /></WatchListSection> : null}
      {list.paused.length ? <WatchListSection title="Paused"><ShowGrid shows={list.paused} /></WatchListSection> : null}
      {list.dropped.length ? <WatchListSection title="Dropped"><ShowGrid shows={list.dropped} /></WatchListSection> : null}
      {list.needsEpisodeData.length ? <WatchListSection title="Needs Episode Data" description="Open these shows to synchronize their episodes before assigning a watch-list state."><NeedsEpisodeDataGrid shows={list.needsEpisodeData} /></WatchListSection> : null}
    </>}
  </div>;
}
