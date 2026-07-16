import { TvTimeImportError } from "./errors";
import type { NormalizedTimestamp } from "./types";

export function parseTvTimeTimestamp(watchDate: string, createdAt: string): NormalizedTimestamp {
  if (/^\d{10}$/.test(watchDate)) {
    const date = new Date(Number(watchDate) * 1_000);
    if (!Number.isNaN(date.valueOf())) return { instant: date.toISOString(), source: "legacy_watch_date_epoch" };
  }
  if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(createdAt)) throw new TvTimeImportError("timestamp_invalid", "A watch event has an invalid timestamp.");
  const date = new Date(`${createdAt.replace(" ", "T")}Z`);
  if (Number.isNaN(date.valueOf())) throw new TvTimeImportError("timestamp_invalid", "A watch event has an invalid timestamp.");
  return { instant: date.toISOString(), source: "created_at_assumed_utc" };
}
