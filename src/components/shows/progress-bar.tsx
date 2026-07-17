import type { ShowProgress } from "@/lib/shows/progress";

export function ProgressBar({ progress }: { progress: ShowProgress }) {
  if (progress.state === "none") return <p className="break-words text-sm text-[var(--muted)]">{progress.total ? `0 of ${progress.total} watched` : "No released episodes"}</p>;
  const fill =
    progress.state === "complete"
      ? "bg-[var(--progress-complete)]"
      : progress.state === "caught-up"
        ? "bg-[var(--progress-caught-up)]"
        : "bg-[var(--progress-incomplete)]";
  const stateLabel =
    progress.state === "complete" ? "Complete" : progress.state === "caught-up" ? "Caught up" : "In progress";
  return (
    <div className="min-w-0">
      <div
        role="progressbar"
        aria-label="Show watch progress"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progress.percentage}
        aria-valuetext={`${stateLabel}: ${progress.watched} of ${progress.total} watched, ${progress.percentage}%`}
        className="progress-track h-2 overflow-hidden rounded-full"
      >
        <div className={`progress-fill h-full ${fill}`} style={{ width: `${progress.percentage}%` }} />
      </div>
      <p className="mt-1 break-words text-sm text-[var(--muted)]">
        <span className="font-medium text-[var(--foreground)]">{stateLabel}</span>
        {" · "}
        {progress.watched} of {progress.total} watched · {progress.percentage}%
      </p>
    </div>
  );
}
