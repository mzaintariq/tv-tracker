"use client";

import { useRouter } from "next/navigation";

type ExploreEmptyStateProps = {
  query: string | null;
};

export function ExploreEmptyState({ query }: ExploreEmptyStateProps) {
  return (
    <div className="rounded-lg border border-dashed border-[var(--border)] bg-[var(--surface)] px-4 py-10 text-center">
      <p className="text-base font-medium text-[var(--foreground)]">
        {query ? `No results for “${query}”` : "No trending titles right now"}
      </p>
      <p className="mt-2 text-sm text-[var(--muted)]">
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
      className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-8"
      role="alert"
    >
      <p className="text-base font-medium text-[var(--foreground)]">
        Could not load Explore
      </p>
      <p className="mt-2 text-sm text-[var(--danger)]">{message}</p>
      <button type="button" onClick={() => router.refresh()} className="mt-4 rounded-lg bg-[var(--accent)] px-4 py-2 font-semibold text-[var(--accent-foreground)]">Retry</button>
    </div>
  );
}

export function ExploreSkeletonGrid() {
  return (
    <ul
      className="grid animate-pulse grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5"
      aria-hidden="true"
    >
      {Array.from({ length: 10 }).map((_, index) => (
        <li key={index} className="space-y-3">
          <div className="aspect-[2/3] rounded-lg bg-[var(--surface-elevated)]" />
          <div className="h-4 w-3/4 rounded bg-[var(--surface-elevated)]" />
          <div className="h-3 w-1/2 rounded bg-[var(--surface-elevated)]" />
          <div className="h-10 rounded-lg bg-[var(--surface-elevated)]" />
        </li>
      ))}
    </ul>
  );
}
