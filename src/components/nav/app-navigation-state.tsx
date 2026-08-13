"use client";

import { usePathname } from "next/navigation";
import {
  createContext,
  useContext,
  useMemo,
  useState,
  type MouseEvent,
  type ReactNode,
} from "react";

import type { AppNavHref } from "@/components/nav/nav-items";

type AppNavigationContextValue = {
  pendingHref: AppNavHref | null;
  selectHref: (href: AppNavHref, event: MouseEvent<HTMLAnchorElement>) => void;
};

const AppNavigationContext = createContext<AppNavigationContextValue | null>(
  null,
);

export function AppNavigationProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [pending, setPending] = useState<{
    href: AppNavHref;
    fromPathname: string;
  } | null>(null);
  const pendingHref =
    pending?.fromPathname === pathname ? pending.href : null;

  const value = useMemo<AppNavigationContextValue>(
    () => ({
      pendingHref,
      selectHref: (href, event) => {
        if (
          event.defaultPrevented ||
          event.button !== 0 ||
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey ||
          pathname === href
        ) {
          return;
        }
        setPending({ href, fromPathname: pathname });
      },
    }),
    [pathname, pendingHref],
  );

  return (
    <AppNavigationContext.Provider value={value}>
      {children}
    </AppNavigationContext.Provider>
  );
}

export function AppNavigationContent({ children }: { children: ReactNode }) {
  const { pendingHref } = useAppNavigation();
  if (!pendingHref) return children;

  const label =
    pendingHref === "/shows"
      ? "TV Shows"
      : pendingHref === "/movies"
        ? "Movies"
        : pendingHref === "/explore"
          ? "Explore"
          : "Profile";

  return (
    <div className="mx-auto w-full max-w-6xl">
      <p className="sr-only" role="status">
        Loading {label}…
      </p>
      <div aria-hidden="true" className="animate-pulse space-y-3">
        <div className="h-8 w-40 rounded bg-[var(--surface-elevated)] sm:h-9" />
        <div className="h-4 w-full max-w-md rounded bg-[var(--surface-elevated)] sm:h-5" />
        <div className="grid grid-cols-2 gap-2 pt-3 sm:grid-cols-4 sm:gap-4 sm:pt-5">
          {Array.from({ length: 4 }, (_, index) => (
            <div
              key={index}
              className="aspect-[2/3] rounded-xl bg-[var(--surface-elevated)]"
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export function useAppNavigation(): AppNavigationContextValue {
  const context = useContext(AppNavigationContext);
  if (!context) {
    throw new Error("useAppNavigation must be used within AppNavigationProvider");
  }
  return context;
}
