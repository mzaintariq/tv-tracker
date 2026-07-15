"use client";
export default function MovieError({ reset }: { error: Error; reset: () => void }) { return <div role="alert" className="rounded-xl border border-[var(--border)] p-6"><h1 className="text-xl font-semibold">Could not load this movie</h1><button className="mt-4 rounded-lg border border-[var(--border)] px-3 py-2 font-semibold" onClick={reset}>Try again</button></div>; }
