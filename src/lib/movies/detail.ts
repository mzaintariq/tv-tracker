import type { Json } from "@/types/database";

export type NamedFact = { id: number; name: string };

export function parseNamedFacts(value: Json): NamedFact[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const id = item.id,
      name = item.name;
    return typeof id === "number" &&
      Number.isInteger(id) &&
      id > 0 &&
      typeof name === "string" &&
      name.trim()
      ? [{ id, name: name.trim() }]
      : [];
  });
}

export function languageDisplayName(code: string | null): string | null {
  if (!code) return null;
  try {
    return (
      new Intl.DisplayNames(["en"], { type: "language" }).of(code) ??
      code.toUpperCase()
    );
  } catch {
    return code.toUpperCase();
  }
}

export function formatVoteCount(count: number): string {
  return new Intl.NumberFormat("en", {
    notation: count >= 1000 ? "compact" : "standard",
    maximumFractionDigits: 1,
  }).format(count);
}

export type ReleaseStatusInput = {
  today: string;
  theatrical: { release_date: string; release_type: number } | null;
  digital: { release_date: string } | null;
};

export function movieReleaseStatuses({
  today,
  theatrical,
  digital,
}: ReleaseStatusInput): string[] {
  const statuses: string[] = [];
  if (theatrical) {
    const limited = theatrical.release_type === 2;
    statuses.push(
      theatrical.release_date > today
        ? limited
          ? "Limited theatrical release upcoming"
          : "Coming to theatres"
        : theatrical.release_date === today
          ? limited
            ? "Limited theatrical release today"
            : "In theatres today"
          : limited
            ? "Limited theatrical release has begun"
            : "Released in theatres",
    );
  }
  statuses.push(
    digital
      ? digital.release_date > today
        ? "Digital release upcoming"
        : digital.release_date === today
          ? "Digital release today"
          : "Released digitally"
      : "Digital date not announced",
  );
  return statuses;
}
