"use client";

import Link from "next/link";
import { useState } from "react";

export function ShowSubnav({
  current,
}: {
  current: "watch-list" | "upcoming";
}) {
  const [selection, setSelection] = useState({
    route: current,
    visual: current,
  });
  if (selection.route !== current) {
    setSelection({ route: current, visual: current });
  }
  const selected = selection.route === current ? selection.visual : current;
  const items = [
    { href: "/shows", label: "Watch List", value: "watch-list" },
    { href: "/shows/upcoming", label: "Upcoming", value: "upcoming" },
  ] as const;
  return (
    <div className="h-8">
      <nav
        aria-label="TV Shows views"
        className="app-section-subnav fixed z-30 inline-grid grid-cols-2 rounded-full border border-[var(--control-border)] bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] shadow-lg backdrop-blur-md"
      >
        <span
          aria-hidden="true"
          className={`pointer-events-none absolute inset-y-0 left-0 w-1/2 transition-transform duration-200 ease-out ${selected === "upcoming" ? "translate-x-full" : "translate-x-0"}`}
        >
          <span className="absolute inset-1 rounded-full bg-[var(--accent)] shadow-sm" />
        </span>
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setSelection({ route: current, visual: item.value })}
            aria-current={current === item.value ? "page" : undefined}
            className={`interactive-control touch-target relative z-10 inline-flex items-center justify-center rounded-full px-3 sm:px-4 text-xs sm:text-sm font-semibold transition-colors duration-200 ${selected === item.value ? "text-[var(--accent-foreground)]" : "text-[var(--muted)] hover:bg-[var(--surface-elevated)] hover:text-[var(--foreground)] active:bg-[var(--accent-soft)]"}`}
          >
            {item.label}
            {current === item.value ? (
              <span className="sr-only"> (current view)</span>
            ) : null}
          </Link>
        ))}
      </nav>
    </div>
  );
}
