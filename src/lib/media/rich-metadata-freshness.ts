export const RICH_METADATA_FRESHNESS_MS = 7 * 24 * 60 * 60 * 1000;

export function isRichMetadataStale(
  syncedAt: string | null | undefined,
  now = new Date(),
): boolean {
  if (!syncedAt) return true;
  const timestamp = Date.parse(syncedAt);
  if (!Number.isFinite(timestamp)) return true;
  return now.getTime() - timestamp >= RICH_METADATA_FRESHNESS_MS;
}
