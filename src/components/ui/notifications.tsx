"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

type NotificationKind = "success" | "error";
type Notification = { id: number; kind: NotificationKind; message: string };
type NotificationContextValue = { notify: (message: string, kind?: NotificationKind) => void };

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notification, setNotification] = useState<Notification | null>(null);
  const nextId = useRef(0);
  const notify = useCallback((message: string, kind: NotificationKind = "success") => {
    nextId.current += 1;
    setNotification({ id: nextId.current, kind, message });
  }, []);

  useEffect(() => {
    if (!notification) return;
    const timeout = globalThis.setTimeout(
      () => setNotification((current) => current?.id === notification.id ? null : current),
      notification.kind === "error" ? 6000 : 4000,
    );
    return () => globalThis.clearTimeout(timeout);
  }, [notification]);

  const value = useMemo(() => ({ notify }), [notify]);
  return (
    <NotificationContext.Provider value={value}>
      {children}
      {notification ? (
        <div className="fixed left-1/2 top-[calc(0.75rem+var(--safe-area-top))] z-[70] flex w-[calc(100vw-1.5rem-var(--safe-area-left)-var(--safe-area-right))] -translate-x-1/2 items-center gap-3 rounded-xl border border-[var(--control-border)] bg-[var(--surface)] px-4 py-3 text-sm font-medium shadow-xl sm:w-auto sm:max-w-md" role={notification.kind === "error" ? "alert" : "status"}>
          <span aria-hidden="true" className={notification.kind === "error" ? "text-[var(--danger)]" : "text-[var(--success)]"}>{notification.kind === "error" ? "!" : "✓"}</span>
          <span className="min-w-0 flex-1 break-words">{notification.message}</span>
          <button type="button" className="interactive-control -mr-2 shrink-0 cursor-pointer rounded p-2 text-[var(--muted)] hover:text-[var(--foreground)]" aria-label="Dismiss notification" onClick={() => setNotification(null)}>×</button>
        </div>
      ) : null}
    </NotificationContext.Provider>
  );
}

export function useNotifications(): NotificationContextValue {
  const context = useContext(NotificationContext);
  if (!context) throw new Error("useNotifications must be used within NotificationProvider");
  return context;
}
