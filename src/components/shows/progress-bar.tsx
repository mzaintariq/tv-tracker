import type { ShowProgress } from "@/lib/shows/progress";

export function ProgressBar({ progress }: { progress: ShowProgress }) {
  if (progress.state === "none") return <p className="text-sm text-[var(--muted)]">{progress.total ? `0 of ${progress.total} watched` : "No released episodes"}</p>;
  const color = progress.state === "complete" ? "bg-purple-600" : progress.state === "caught-up" ? "bg-green-600" : "bg-yellow-500";
  return <div aria-label={`${progress.percentage}% watched`}><div className="h-2 overflow-hidden rounded-full bg-[var(--surface-elevated)]"><div className={`h-full ${color}`} style={{ width: `${progress.percentage}%` }} /></div><p className="mt-1 text-sm text-[var(--muted)]">{progress.watched} of {progress.total} watched · {progress.percentage}%</p></div>;
}
