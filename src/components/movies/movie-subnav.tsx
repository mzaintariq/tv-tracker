"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function MovieSubnav() {
  const pathname = usePathname();
  const upcoming = pathname === "/movies/upcoming";
  return (
    <div className="sticky top-[calc(0.75rem+var(--safe-area-top))] z-30 flex justify-center pb-1">
      <nav aria-label="Movies views" className="relative inline-grid grid-cols-2 rounded-full border border-[var(--control-border)] bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] p-1 shadow-lg backdrop-blur-md">
        <span aria-hidden="true" className={`pointer-events-none absolute bottom-1 left-1 top-1 w-[calc(50%-0.25rem)] rounded-full bg-[var(--accent)] shadow-sm transition-transform duration-200 ${upcoming ? "translate-x-full" : "translate-x-0"}`} />
        {([{ href: "/movies", label: "Watch List", selected: !upcoming }, { href: "/movies/upcoming", label: "Upcoming", selected: upcoming }] as const).map((item) => (
          <Link key={item.href} href={item.href} aria-current={item.selected ? "page" : undefined} className={`interactive-control touch-target relative z-10 inline-flex items-center justify-center rounded-full px-4 text-sm font-semibold ${item.selected ? "text-[var(--accent-foreground)]" : "text-[var(--muted)] hover:bg-[var(--surface-elevated)] hover:text-[var(--foreground)]"}`}>
            {item.label}{item.selected ? <span className="sr-only"> (current view)</span> : null}
          </Link>
        ))}
      </nav>
    </div>
  );
}
