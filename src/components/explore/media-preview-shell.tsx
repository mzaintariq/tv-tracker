"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";

export function MediaPreviewShell({ title, onClose, children, footer }: { title: string; onClose: () => void; children: ReactNode; footer?: ReactNode }) {
  const dialogRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const backgroundElements = [...document.body.children].filter(
      (element): element is HTMLElement => element instanceof HTMLElement && !element.contains(dialog),
    );
    const previousInert = backgroundElements.map((element) => [element, element.inert] as const);
    const previousOverflow = document.body.style.overflow;
    backgroundElements.forEach((element) => { element.inert = true; });
    document.body.style.overflow = "hidden";
    dialog.querySelector<HTMLElement>("button, a, [tabindex]:not([tabindex='-1'])")?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); onClose(); return; }
      if (event.key !== "Tab") return;
      const focusable = [...dialog.querySelectorAll<HTMLElement>("button:not(:disabled), a[href], [tabindex]:not([tabindex='-1'])")];
      if (!focusable.length) { event.preventDefault(); dialog.focus(); return; }
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previousInert.forEach(([element, inert]) => { element.inert = inert; });
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-end justify-end bg-black/55 motion-safe:animate-[fade-in_150ms_ease-out] sm:items-stretch" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="media-preview-title" tabIndex={-1} className="flex h-[100dvh] max-h-[100dvh] w-full min-w-0 flex-col overflow-hidden border border-[var(--border)] bg-[var(--background)] shadow-2xl motion-safe:animate-[sheet-in_180ms_ease-out] sm:h-auto sm:max-h-none sm:w-[min(42rem,80vw)] sm:rounded-l-2xl">
        <div className="flex min-h-14 shrink-0 items-center justify-between gap-3 border-b border-[var(--border)] px-4 pt-[var(--safe-area-top)] sm:px-5 sm:pt-0">
          <h2 id="media-preview-title" className="min-w-0 truncate text-base font-semibold">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close quick view" className="interactive-control touch-target grid h-11 w-11 shrink-0 place-items-center rounded-lg text-2xl">×</button>
        </div>
        <div className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-6">{children}</div>
        {footer ? <div className="shrink-0 border-t border-[var(--border)] bg-[var(--surface)] p-3 pb-[calc(0.75rem+var(--safe-area-bottom))] sm:p-4">{footer}</div> : null}
      </div>
    </div>,
    document.body,
  );
}
