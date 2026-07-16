import Image from "next/image";
import { posterUrl } from "@/lib/media/types";
import type { CandidateDisplay } from "@/lib/import/tv-time/matching-quality";

export function CandidateCard({ candidate, disabled, onUse }: { candidate: CandidateDisplay; disabled: boolean; onUse: () => void }) {
  const image = posterUrl(candidate.posterPath ?? null, "w185");
  return <article className="flex gap-3 rounded-lg border p-3"><div className="relative h-24 w-16 shrink-0 overflow-hidden rounded bg-[var(--surface-elevated)]">{image ? <Image src={image} alt="" fill sizes="64px" className="object-cover" /> : <span className="flex h-full items-center justify-center text-xs text-[var(--muted)]">No poster</span>}</div><div className="flex min-w-0 flex-1 flex-col justify-between"><div><p className="font-medium">{candidate.title ?? `TMDB ${candidate.id}`}</p><p className="text-sm text-[var(--muted)]">{candidate.year ?? "Year unknown"} · TMDB {candidate.id}</p>{candidate.originalTitle && candidate.originalTitle !== candidate.title ? <p className="truncate text-xs text-[var(--muted)]">{candidate.originalTitle}</p> : null}</div><button disabled={disabled} className="mt-2 self-start rounded-lg border px-3 py-1.5" onClick={onUse}>Use this</button></div></article>;
}

export function candidatesForDisplay(ids: number[], metadata: CandidateDisplay[] | null | undefined): CandidateDisplay[] {
  const byId = new Map((metadata ?? []).map((candidate) => [candidate.id, candidate]));
  return ids.map((id) => byId.get(id) ?? { id });
}
