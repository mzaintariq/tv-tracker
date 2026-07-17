"use client";

import Link from "next/link";

type RouteErrorStateProps = {
  title: string;
  description: string;
  reset: () => void;
  backHref?: string;
  backLabel?: string;
};

export function RouteErrorState({ title, description, reset, backHref, backLabel = "Go back" }: RouteErrorStateProps) {
  return <section role="alert" className="mx-auto w-full max-w-3xl rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6">
    <h1 className="text-2xl font-semibold text-[var(--foreground)]">{title}</h1>
    <p className="mt-3 text-[var(--muted)]">{description}</p>
    <div className="mt-6 flex flex-wrap gap-3">
      <button type="button" onClick={reset} className="rounded-lg bg-[var(--accent)] px-4 py-2 font-semibold text-[var(--accent-foreground)]">Try again</button>
      {backHref ? <Link href={backHref} className="rounded-lg border border-[var(--border)] px-4 py-2 font-semibold">{backLabel}</Link> : null}
    </div>
  </section>;
}
