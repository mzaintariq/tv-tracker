"use client";

import { Children, useId, useRef, useState, type ReactNode } from "react";

import {
  formatSectionHeading,
  SECONDARY_SECTION_INITIAL_LIMIT,
} from "@/lib/shows/watch-list";

type LimitedWatchListSectionProps = {
  sectionId: string;
  title: string;
  description?: string;
  totalCount: number;
  initialLimit?: number;
  listAs?: "ul" | "ol";
  listClassName: string;
  children: ReactNode;
};

export function LimitedWatchListSection({
  sectionId,
  title,
  description,
  totalCount,
  initialLimit = SECONDARY_SECTION_INITIAL_LIMIT,
  listAs = "ul",
  listClassName,
  children,
}: LimitedWatchListSectionProps) {
  const reactId = useId();
  const headingId = `${sectionId}-heading-${reactId}`;
  const listId = `${sectionId}-items-${reactId}`;
  const toggleRef = useRef<HTMLButtonElement>(null);
  const [expanded, setExpanded] = useState(false);
  const needsLimit = totalCount > initialLimit;
  const items = Children.toArray(children);
  const visibleItems = needsLimit && !expanded ? items.slice(0, initialLimit) : items;
  const ListTag = listAs;

  const onToggle = () => {
    if (expanded) {
      let shouldRestoreFocus = false;
      if (typeof document !== "undefined") {
        const active = document.activeElement;
        const list = document.getElementById(listId);
        if (list && active instanceof Node && list.contains(active)) {
          shouldRestoreFocus = true;
        }
      }
      setExpanded(false);
      if (shouldRestoreFocus) {
        queueMicrotask(() => toggleRef.current?.focus());
      }
      return;
    }
    setExpanded(true);
  };

  return (
    <section className="min-w-0 space-y-3" aria-labelledby={headingId}>
      <div className="min-w-0">
        <h2 id={headingId} className="break-words text-2xl font-semibold tracking-tight">
          {formatSectionHeading(title, totalCount)}
        </h2>
        {description ? (
          <p className="mt-1 break-words text-sm text-[var(--muted)]">{description}</p>
        ) : null}
      </div>
      <ListTag id={listId} className={listClassName}>
        {visibleItems}
      </ListTag>
      {needsLimit ? (
        <button
          ref={toggleRef}
          type="button"
          className="interactive-control touch-target inline-flex max-w-full items-center whitespace-normal rounded-lg border bg-[var(--surface)] px-3 py-2 text-sm font-semibold text-[var(--foreground)]"
          aria-expanded={expanded}
          aria-controls={listId}
          onClick={onToggle}
        >
          {expanded ? "Show less" : `Show all ${totalCount}`}
        </button>
      ) : null}
    </section>
  );
}
