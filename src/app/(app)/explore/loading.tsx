import { ExploreSkeletonGrid } from "@/components/explore/explore-states";

export default function ExploreLoading() {
  return (
    <section className="mx-auto flex w-full max-w-6xl flex-col gap-6 sm:gap-8">
      <p className="sr-only" role="status">
        Loading Explore…
      </p>
      <div aria-hidden="true" className="contents">
        <div className="animate-pulse space-y-1 sm:space-y-2">
          <div className="h-8 w-40 rounded-md bg-[var(--surface-elevated)] sm:h-9" />
          <div className="h-4 w-full max-w-xl rounded-md bg-[var(--surface-elevated)] sm:h-5" />
        </div>
        <div className="h-11 w-full rounded-lg bg-[var(--surface-elevated)]" />
        <ExploreSkeletonGrid />
      </div>
    </section>
  );
}
