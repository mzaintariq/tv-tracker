import { MediaPoster } from "@/components/media/media-poster";
import type { CandidateDisplay } from "@/lib/import/tv-time/matching-quality";

export function CandidateCard({ candidate, disabled, onUse }: { candidate: CandidateDisplay; disabled: boolean; onUse: () => void }) {
  return <article className="flex gap-3 rounded-lg border p-3"><div className="relative h-24 w-16 shrink-0 overflow-hidden rounded bg-[var(--surface-elevated)]"><MediaPoster source={candidate.posterPath} title={candidate.title ?? ""} alt="" sizes="64px" tmdbSize="w185" fallbackLabel="No poster" fallbackClassName="px-1 text-center text-xs text-[var(--muted)]" /></div><div className="flex min-w-0 flex-1 flex-col justify-between"><div><p className="font-medium">{candidate.title ?? `TMDB ${candidate.id}`}</p><p className="text-sm text-[var(--muted)]">{candidate.year ?? "Year unknown"} · TMDB {candidate.id}</p>{candidate.originalTitle && candidate.originalTitle !== candidate.title ? <p className="truncate text-xs text-[var(--muted)]">{candidate.originalTitle}</p> : null}</div><button disabled={disabled} className="mt-2 self-start rounded-lg border px-3 py-1.5" onClick={onUse}>Use this</button></div></article>;
}

export function candidatesForDisplay(ids: number[], metadata: CandidateDisplay[] | null | undefined): CandidateDisplay[] {
  const byId = new Map((metadata ?? []).map((candidate) => [candidate.id, candidate]));
  return ids.map((id) => byId.get(id) ?? { id });
}
