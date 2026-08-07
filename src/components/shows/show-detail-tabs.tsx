"use client";

import type { MouseEvent, ReactNode } from "react";
import { useEffect, useState } from "react";

export type ShowDetailView = "episodes" | "overview";

export function ShowDetailTabs({
  tmdbId,
  initialView,
  episodes,
  overview,
}: {
  tmdbId: number;
  initialView: ShowDetailView;
  episodes: ReactNode;
  overview: ReactNode;
}) {
  const [view, setView] = useState(initialView);

  useEffect(() => {
    const syncFromUrl = () => {
      const requested = new URL(window.location.href).searchParams.get("view");
      setView(requested === "overview" ? "overview" : "episodes");
    };
    window.addEventListener("popstate", syncFromUrl);
    return () => window.removeEventListener("popstate", syncFromUrl);
  }, []);

  const select = (nextView: ShowDetailView, event: MouseEvent<HTMLAnchorElement>) => {
    if (
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    )
      return;
    event.preventDefault();
    if (nextView === view) return;
    const url = new URL(window.location.href);
    url.searchParams.set("view", nextView);
    window.history.pushState(null, "", url);
    setView(nextView);
  };

  return (
    <>
      <nav
        aria-label="Show detail views"
        className="grid min-w-0 grid-cols-2 border-b border-[var(--border)] sm:flex sm:items-center sm:gap-6"
      >
        <ViewLink
          tmdbId={tmdbId}
          view="episodes"
          selected={view === "episodes"}
          onClick={select}
        >
          Episodes
        </ViewLink>
        <ViewLink
          tmdbId={tmdbId}
          view="overview"
          selected={view === "overview"}
          onClick={select}
        >
          Overview
        </ViewLink>
      </nav>
      <div hidden={view !== "episodes"}>{episodes}</div>
      <div hidden={view !== "overview"}>{overview}</div>
    </>
  );
}

function ViewLink({
  tmdbId,
  view,
  selected,
  onClick,
  children,
}: {
  tmdbId: number;
  view: ShowDetailView;
  selected: boolean;
  onClick: (
    view: ShowDetailView,
    event: MouseEvent<HTMLAnchorElement>,
  ) => void;
  children: ReactNode;
}) {
  return (
    <a
      href={`/shows/${tmdbId}?view=${view}`}
      aria-current={selected ? "page" : undefined}
      onClick={(event) => onClick(view, event)}
      className={`touch-target -mb-px inline-flex w-full items-center justify-center border-b-2 px-1 py-2 text-sm font-semibold sm:w-auto ${selected ? "border-[var(--accent)] text-[var(--foreground)]" : "interactive-control border-transparent text-[var(--muted)] hover:text-[var(--foreground)]"}`}
    >
      {children}
    </a>
  );
}
