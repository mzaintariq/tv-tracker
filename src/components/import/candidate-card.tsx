import { MediaPoster } from "@/components/media/media-poster";
import type { CandidateDisplay } from "@/lib/import/tv-time/matching-quality";

export function CandidateCard({ candidate, disabled, onUse }: { candidate: CandidateDisplay; disabled: boolean; onUse: () => void }) {
  const title = candidate.title ?? `TMDB ${candidate.id}`;
  return <article className="flex min-w-0 flex-col gap-3 rounded-lg border border-[var(--border)] p-3 min-[360px]:flex-row"><div className="relative aspect-[2/3] w-16 max-w-full shrink-0 overflow-hidden rounded bg-[var(--surface-elevated)]"><MediaPoster source={candidate.posterPath} title={candidate.title ?? ""} alt="" sizes="64px" tmdbSize="w185" fallbackLabel="No poster" fallbackClassName="px-1 text-center text-xs text-[var(--muted)]" /></div><div className="flex min-w-0 flex-1 flex-col justify-between"><div className="min-w-0"><p className="break-words font-medium">{title}</p><p className="break-words text-sm text-[var(--muted)]">{candidate.year ?? "Year unknown"} · TMDB {candidate.id}</p>{candidate.originalTitle && candidate.originalTitle !== candidate.title ? <p className="break-words text-xs text-[var(--muted)]">{candidate.originalTitle}</p> : null}</div><button aria-label={`Use ${title} as the match`} disabled={disabled} className="interactive-control touch-target mt-2 max-w-full self-start whitespace-normal rounded-lg border bg-[var(--surface)] px-3 py-2 text-sm font-semibold text-[var(--foreground)]" onClick={onUse}>Use this</button></div></article>;
}

export function candidatesForDisplay(ids: number[], metadata: CandidateDisplay[] | null | undefined): CandidateDisplay[] {
  const byId = new Map((metadata ?? []).map((candidate) => [candidate.id, candidate]));
  return ids.map((id) => byId.get(id) ?? { id });
}
