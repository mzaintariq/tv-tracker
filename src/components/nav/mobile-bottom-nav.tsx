"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { APP_NAV_ITEMS } from "@/components/nav/nav-items";
import { useAppNavigation } from "@/components/nav/app-navigation-state";

export function MobileBottomNav() {
  const pathname = usePathname();
  const { pendingHref, selectHref } = useAppNavigation();
  const selectedPath = pendingHref ?? pathname;

  return (
    <nav
      aria-label="Primary"
      className="mobile-bottom-nav fixed inset-x-0 bottom-0 z-40 border-t border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur md:hidden"
    >
      <ul className="mx-auto grid max-w-lg grid-cols-4">
        {APP_NAV_ITEMS.map((item) => {
          const active =
            selectedPath === item.href ||
            selectedPath.startsWith(`${item.href}/`);

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={(event) => selectHref(item.href, event)}
                className={`flex min-h-14 flex-col items-center justify-center gap-1 px-2 text-xs font-medium transition ${
                  active
                    ? "text-[var(--accent)]"
                    : "text-[var(--muted)] hover:text-[var(--foreground)]"
                }`}
                aria-current={active ? "page" : undefined}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    active ? "bg-[var(--accent)]" : "bg-transparent"
                  }`}
                  aria-hidden
                />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
