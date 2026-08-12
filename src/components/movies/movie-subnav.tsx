"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function MovieSubnav() {
  const pathname = usePathname();
  const upcoming = pathname === "/movies/upcoming";
  return (
    <div className="h-8">
      <nav
        aria-label="Movies views"
        className="app-section-subnav fixed z-30 inline-grid grid-cols-2 rounded-full border border-[var(--control-border)] bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] shadow-lg backdrop-blur-md"
      >
        <span
          aria-hidden="true"
          className={`pointer-events-none absolute inset-y-0 left-0 w-1/2 transition-transform duration-200 ${upcoming ? "translate-x-full" : "translate-x-0"}`}
        >
          <span className="absolute inset-1 rounded-full bg-[var(--accent)] shadow-sm" />
        </span>
        {(
          [
            { href: "/movies", label: "Watch List", selected: !upcoming },
            { href: "/movies/upcoming", label: "Upcoming", selected: upcoming },
          ] as const
        ).map((item) => (
          <Link
            key={item.href}
            href={item.href}
            aria-current={item.selected ? "page" : undefined}
            className={`interactive-control touch-target relative z-10 inline-flex items-center justify-center rounded-full px-3 sm:px-4 text-xs sm:text-sm font-semibold ${item.selected ? "text-[var(--accent-foreground)]" : "text-[var(--muted)] hover:bg-[var(--surface-elevated)] hover:text-[var(--foreground)]"}`}
          >
            {item.label}
            {item.selected ? (
              <span className="sr-only"> (current view)</span>
            ) : null}
          </Link>
        ))}
      </nav>
    </div>
  );
}
