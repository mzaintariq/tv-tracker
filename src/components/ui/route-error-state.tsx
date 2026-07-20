"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type RouteErrorStateProps = { title: string; description: string; reset: () => void; backHref?: string; backLabel?: string };

export function RouteErrorState({ title, description, reset, backHref, backLabel = "Go back" }: RouteErrorStateProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  return <section className="mx-auto w-full max-w-3xl rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6">
    <div role="alert"><h1 className="text-2xl font-semibold text-[var(--foreground)]">{title}</h1><p className="mt-3 text-[var(--muted)]">{description}</p></div>
    <div className="mt-6 flex flex-wrap gap-3">
      <button type="button" disabled={pending} aria-busy={pending} onClick={() => { if (pending) return; setPending(true); reset(); router.refresh(); }} className="touch-target rounded-lg bg-[var(--accent)] px-4 py-2 font-semibold text-[var(--accent-foreground)]">{pending ? "Trying again…" : "Try again"}</button>
      {backHref ? <Link href={backHref} className="interactive-control touch-target inline-flex items-center rounded-lg border bg-[var(--surface)] px-4 py-2 font-semibold text-[var(--foreground)]">{backLabel}</Link> : null}
    </div>
  </section>;
}
