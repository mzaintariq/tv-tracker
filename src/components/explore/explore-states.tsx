"use client";

import { useRouter } from "next/navigation";

type ExploreEmptyStateProps = {
  query: string | null;
};

export function ExploreEmptyState({ query }: ExploreEmptyStateProps) {
  return (
    <div className="rounded-lg border border-dashed border-[var(--border)] bg-[var(--surface)] p-4 text-center sm:px-4 sm:py-10">
      <p className="text-sm font-medium text-[var(--foreground)] sm:text-base">
        {query ? `No results for “${query}”` : "No trending titles right now"}
      </p>
      <p className="mt-1 text-xs text-[var(--muted)] sm:mt-2 sm:text-sm">
        {query
          ? "Try another search or switch the media filter."
          : "Check back later or search for a title."}
      </p>
    </div>
  );
}

type ExploreErrorStateProps = {
  message: string;
};

export function ExploreErrorState({ message }: ExploreErrorStateProps) {
  const router = useRouter();
  return (
    <div
      className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 sm:px-4 sm:py-8"
      role="alert"
    >
      <p className="text-sm font-medium text-[var(--foreground)] sm:text-base">
        Could not load Explore
      </p>
      <p className="mt-1 text-xs text-[var(--danger)] sm:mt-2 sm:text-sm">
        {message}
      </p>
      <button
        type="button"
        onClick={() => router.refresh()}
        className="touch-target mt-3 rounded-lg bg-[var(--accent)] px-3 py-2 text-xs font-semibold text-[var(--accent-foreground)] sm:mt-4 sm:px-4 sm:text-base"
      >
        Retry
      </button>
    </div>
  );
}

export function ExploreSkeletonGrid() {
  return (
    <ul
      className="grid animate-pulse grid-cols-1 gap-2 sm:gap-4 min-[360px]:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4"
      aria-hidden="true"
    >
      {Array.from({ length: 10 }).map((_, index) => (
        <li key={index} className="space-y-1 sm:space-y-3">
          <div className="aspect-[2/3] rounded-xl bg-[var(--surface-elevated)]" />
          <div className="h-4 w-3/4 rounded bg-[var(--surface-elevated)]" />
          <div className="h-3 w-1/2 rounded bg-[var(--surface-elevated)]" />
        </li>
      ))}
    </ul>
  );
}
