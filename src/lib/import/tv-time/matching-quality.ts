export type TitleHint = { searchTitle: string; year: number | null };
export type CandidateDisplay = { id: number; title?: string; originalTitle?: string | null; year?: number | null; posterPath?: string | null };

export function extractTrailingYearHint(sourceTitle: string): TitleHint {
  const match = /^(.*\S)\s+\(((?:19|20)\d{2})\)\s*$/.exec(sourceTitle.trim());
  return match ? { searchTitle: match[1].trim(), year: Number(match[2]) } : { searchTitle: sourceTitle.trim(), year: null };
}

export function canonicalMatchTitle(value: string): string {
  return value.normalize("NFKC").toLocaleLowerCase("en-US").replace(/(?<=\p{L})!(?=\p{L})/gu, "i").replace(/[^\p{L}\p{N}]+/gu, "");
}

export function candidateYear(date: string | null | undefined): number | null {
  const year = date?.match(/^(\d{4})-/)?.[1];
  return year ? Number(year) : null;
}

export function candidateDisplay(candidate: { id: number; title?: string; name?: string; original_title?: string; original_name?: string; release_date?: string | null; first_air_date?: string | null; poster_path?: string | null }): CandidateDisplay {
  return { id: candidate.id, title: candidate.title ?? candidate.name, originalTitle: candidate.original_title ?? candidate.original_name ?? null, year: candidateYear(candidate.release_date ?? candidate.first_air_date), posterPath: candidate.poster_path ?? null };
}

export function parseCandidateMetadata(value: unknown): CandidateDisplay[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is CandidateDisplay => typeof item === "object" && item !== null && Number.isInteger((item as { id?: unknown }).id));
}

export function selectUniqueExactMovieCandidate<T extends { title: string; original_title?: string; release_date?: string | null }>(candidates: T[], normalizedTitle: string, knownYear: number | null, normalize: (value: string) => string): T | null {
  const exact = candidates.filter((item) => normalize(item.title) === normalizedTitle || normalize(item.original_title ?? "") === normalizedTitle);
  if (exact.length !== 1) return null;
  const year = candidateYear(exact[0].release_date);
  return knownYear && year !== knownYear ? null : exact[0];
}

export function withoutConflictingYear<T extends { release_date?: string | null; first_air_date?: string | null }>(candidates: T[], knownYear: number | null): T[] {
  if (!knownYear) return candidates;
  return candidates.filter((item) => { const year = candidateYear(item.release_date ?? item.first_air_date); return year === null || year === knownYear; });
}

export function shouldFallbackYearSearch(candidates: Array<{ title?: string; name?: string; original_title?: string; original_name?: string }>, normalizedTitle: string, normalize: (value: string) => string): boolean {
  return !candidates.some((item) => normalize(item.title ?? item.name ?? "") === normalizedTitle || normalize(item.original_title ?? item.original_name ?? "") === normalizedTitle);
}
