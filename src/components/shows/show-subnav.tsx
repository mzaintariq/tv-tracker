"use client";

import Link from "next/link";
import { useState } from "react";

export function ShowSubnav({ current }: { current: "watch-list" | "upcoming" }) {
  const [selection, setSelection] = useState({ route: current, visual: current });
  if (selection.route !== current) {
    setSelection({ route: current, visual: current });
  }
  const selected = selection.route === current ? selection.visual : current;
  const items = [
    { href: "/shows", label: "Watch List", value: "watch-list" },
    { href: "/shows/upcoming", label: "Upcoming", value: "upcoming" },
  ] as const;
  return <div className="sticky top-[calc(0.75rem+var(--safe-area-top))] z-30 flex justify-center pb-1">
    <nav aria-label="TV Shows views" className="relative inline-grid grid-cols-2 rounded-full border border-[var(--control-border)] bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] p-1 shadow-lg backdrop-blur-md">
      <span aria-hidden="true" className={`pointer-events-none absolute bottom-1 left-1 top-1 w-[calc(50%-0.25rem)] rounded-full bg-[var(--accent)] shadow-sm transition-transform duration-200 ease-out ${selected === "upcoming" ? "translate-x-full" : "translate-x-0"}`} />
      {items.map((item) => <Link key={item.href} href={item.href} onClick={() => setSelection({ route: current, visual: item.value })} aria-current={current === item.value ? "page" : undefined} className={`interactive-control touch-target relative z-10 inline-flex items-center justify-center rounded-full px-4 text-sm font-semibold transition-colors duration-200 ${selected === item.value ? "text-[var(--accent-foreground)]" : "text-[var(--muted)] hover:bg-[var(--surface-elevated)] hover:text-[var(--foreground)] active:bg-[var(--accent-soft)]"}`}>{item.label}{current === item.value ? <span className="sr-only"> (current view)</span> : null}</Link>)}
    </nav>
  </div>;
}
