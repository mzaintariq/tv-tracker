import { Suspense } from "react";

import { ExploreToolbar } from "@/components/explore/explore-toolbar";
import {
  ExploreEmptyState,
  ExploreErrorState,
} from "@/components/explore/explore-states";
import { MediaGrid } from "@/components/explore/media-grid";
import { TmdbAttribution } from "@/components/explore/tmdb-attribution";
import { loadExplorePageData } from "@/lib/media/explore";
import { createClient } from "@/lib/supabase/server";

type ExplorePageProps = {
  searchParams: Promise<{
    type?: string;
    q?: string;
  }>;
};

export default async function ExplorePage({ searchParams }: ExplorePageProps) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const data = await loadExplorePageData({
    userId: user.id,
    type: params.type,
    q: params.q,
  });

  const heading = data.query
    ? "Search results"
    : data.filter === "tv"
      ? "Trending TV shows"
      : data.filter === "movie"
        ? "Trending movies"
        : "Trending this week";

  return (
    <section className="mx-auto flex w-full max-w-6xl flex-col gap-6 sm:gap-8">
      <header className="space-y-1 sm:space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--foreground)] sm:text-3xl">
          Explore
        </h1>
        <p className="text-sm text-[var(--muted)] sm:text-base">
          Search TMDB or browse trending shows and movies, then add them to your
          library.
        </p>
      </header>

      <Suspense fallback={null}>
        <ExploreToolbar filter={data.filter} query={data.query}>
          <div className="space-y-2 sm:space-y-4">
            <h2 className="text-base font-semibold text-[var(--foreground)] sm:text-lg">
              {heading}
            </h2>

            {data.error ? <ExploreErrorState message={data.error} /> : null}

            {!data.error && data.items.length === 0 ? (
              <ExploreEmptyState query={data.query} />
            ) : null}

            {!data.error && data.items.length > 0 ? (
              <MediaGrid items={data.items} />
            ) : null}
          </div>
        </ExploreToolbar>
      </Suspense>

      <TmdbAttribution />
    </section>
  );
}
