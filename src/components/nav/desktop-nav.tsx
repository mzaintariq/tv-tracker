"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { APP_NAV_ITEMS } from "@/components/nav/nav-items";

export function DesktopNav() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-56 shrink-0 border-r border-[var(--border)] bg-[var(--surface)] md:flex md:flex-col">
      <div className="px-5 py-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
          TV Tracker
        </p>
      </div>
      <nav aria-label="Primary" className="flex flex-1 flex-col gap-1 px-3 pb-6">
        {APP_NAV_ITEMS.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                active
                  ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                  : "text-[var(--muted)] hover:bg-[var(--surface-elevated)] hover:text-[var(--foreground)]"
              }`}
              aria-current={active ? "page" : undefined}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
