"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

import type { ExploreMediaFilter } from "@/lib/media/types";
import { MAX_SEARCH_QUERY_LENGTH } from "@/lib/media/types";

const FILTERS: { value: ExploreMediaFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "tv", label: "TV Shows" },
  { value: "movie", label: "Movies" },
];

type ExploreToolbarProps = {
  filter: ExploreMediaFilter;
  query: string | null;
};

export function ExploreToolbar({ filter, query }: ExploreToolbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [searchValue, setSearchValue] = useState(query ?? "");
  const skipDebounceRef = useRef(false);

  function updateUrl(nextFilter: ExploreMediaFilter, nextQuery: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("type", nextFilter);

    const trimmed = nextQuery.trim().slice(0, MAX_SEARCH_QUERY_LENGTH);
    if (trimmed.length === 0) {
      params.delete("q");
    } else {
      params.set("q", trimmed);
    }

    const queryString = params.toString();
    startTransition(() => {
      router.replace(queryString ? `${pathname}?${queryString}` : pathname);
    });
  }

  useEffect(() => {
    if (skipDebounceRef.current) {
      skipDebounceRef.current = false;
      return;
    }

    const handle = window.setTimeout(() => {
      const normalized = searchValue.trim().slice(0, MAX_SEARCH_QUERY_LENGTH);
      const current = (query ?? "").trim();

      if (normalized === current) {
        return;
      }

      updateUrl(filter, searchValue);
    }, 350);

    return () => window.clearTimeout(handle);
    // Debounce only on search text changes; filter clicks update the URL directly.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional
  }, [searchValue]);

  return (
    <div className="space-y-4">
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-end">
        <label className="flex min-w-0 flex-1 flex-col gap-2">
          <span className="text-sm font-medium text-[var(--foreground)]">
            Search shows and movies
          </span>
          <input
            type="search"
            name="q"
            value={searchValue}
            maxLength={MAX_SEARCH_QUERY_LENGTH}
            placeholder="Search TMDB…"
            autoComplete="off"
            onChange={(event) => setSearchValue(event.target.value)}
            className="interactive-control touch-target h-11 w-full min-w-0 max-w-full rounded-lg border bg-[var(--surface)] px-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)]"
            aria-describedby="explore-search-hint"
          />
          <span id="explore-search-hint" className="sr-only">
            Results update after you stop typing. Leave empty to browse trending.
          </span>
        </label>
      </div>

      <div
        className="flex flex-wrap gap-2"
        role="group"
        aria-label="Media type filter"
      >
        {FILTERS.map((item) => {
          const selected = filter === item.value;

          return (
            <button
              key={item.value}
              type="button"
              aria-pressed={selected}
              disabled={isPending}
              onClick={() => {
                skipDebounceRef.current = true;
                updateUrl(item.value, searchValue);
              }}
              className={
                selected
                  ? "touch-target min-h-11 rounded-lg bg-[var(--accent)] px-4 text-sm font-semibold text-[var(--accent-foreground)] shadow-[inset_0_0_0_2px_var(--foreground)]"
                  : "interactive-control touch-target min-h-11 rounded-lg border bg-[var(--surface)] px-4 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--surface-elevated)]"
              }
            >
              {item.label}
            </button>
          );
        })}
      </div>

      {isPending ? (
        <p className="text-sm text-[var(--muted)]" aria-live="polite">
          Updating results…
        </p>
      ) : null}
    </div>
  );
}
