import Link from "next/link";
import { redirect } from "next/navigation";

import {
  SecondaryNeedsEpisodeDataSection,
  SecondaryRecentlyWatchedSection,
  SecondaryShowSection,
  WatchNextWatchListSection,
} from "@/components/shows/watch-list-sections";
import { ShowSubnav } from "@/components/shows/show-subnav";
import { loadWatchList } from "@/lib/shows/data";
import { createClient } from "@/lib/supabase/server";

export default async function ShowsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const list = await loadWatchList(user.id);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-10">
      <ShowSubnav current="watch-list" />
      {!list.shows.length ? (
        <div className="rounded-xl border border-dashed border-[var(--border)] p-8 text-center">
          <h2 className="text-xl font-semibold">No shows yet</h2>
          <p className="mt-2 text-[var(--muted)]">
            Find a show in Explore and set your starting progress.
          </p>
          <Link
            href="/explore?type=tv"
            className="mt-4 inline-block rounded-lg bg-[var(--accent)] px-4 py-2 font-semibold text-[var(--accent-foreground)]"
          >
            Explore shows
          </Link>
        </div>
      ) : (
        <>
          <WatchNextWatchListSection items={list.watchNext} />
          <SecondaryRecentlyWatchedSection items={list.recentlyWatched} timeZone={list.timeZone} />
          <SecondaryShowSection
            sectionId="inactive"
            title="Haven't Watched for a While"
            description="Active shows with no recent watching and no newly aired episode in the last 30 days."
            shows={list.inactive}
          />
          <SecondaryShowSection sectionId="not-started" title="Haven't Started" shows={list.notStarted} />
          <SecondaryShowSection sectionId="caught-up" title="Caught Up" shows={list.caughtUp} />
          <SecondaryShowSection sectionId="completed" title="Completed" shows={list.completed} />
          <SecondaryShowSection sectionId="paused" title="Paused" shows={list.paused} />
          <SecondaryShowSection sectionId="dropped" title="Dropped" shows={list.dropped} />
          <SecondaryNeedsEpisodeDataSection shows={list.needsEpisodeData} />
        </>
      )}
    </div>
  );
}
