"use client";

export default function UpcomingError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <section><h1 className="text-3xl font-semibold">Could not load Upcoming</h1><p className="mt-3 text-[var(--muted)]">Cached episode data could not be loaded. Try again in a moment.</p><button className="mt-5 rounded-lg bg-[var(--accent)] px-4 py-2 font-semibold text-[var(--accent-foreground)]" onClick={reset}>Try again</button></section>;
}
