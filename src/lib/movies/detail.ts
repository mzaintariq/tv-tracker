import type { Json } from "@/types/database";

export type NamedFact = { id: number; name: string };

export function parseNamedFacts(value: Json): NamedFact[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const id = item.id, name = item.name;
    return typeof id === "number" && Number.isInteger(id) && id > 0 && typeof name === "string" && name.trim()
      ? [{ id, name: name.trim() }]
      : [];
  });
}

export function languageDisplayName(code: string | null): string | null {
  if (!code) return null;
  try {
    return new Intl.DisplayNames(["en"], { type: "language" }).of(code) ?? code.toUpperCase();
  } catch {
    return code.toUpperCase();
  }
}

export function formatVoteCount(count: number): string {
  return new Intl.NumberFormat("en", { notation: count >= 1000 ? "compact" : "standard", maximumFractionDigits: 1 }).format(count);
}
