import { ExploreSkeletonGrid } from "@/components/explore/explore-states";

export default function ExploreLoading() {
  return (
    <section className="mx-auto flex w-full max-w-6xl flex-col gap-8">
      <div className="animate-pulse space-y-3">
        <div className="h-9 w-40 rounded-md bg-[var(--surface-elevated)]" />
        <div className="h-5 w-full max-w-xl rounded-md bg-[var(--surface-elevated)]" />
      </div>
      <div className="h-11 w-full rounded-lg bg-[var(--surface-elevated)]" />
      <ExploreSkeletonGrid />
    </section>
  );
}
