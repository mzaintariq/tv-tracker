import "server-only";

import { loadShowDetail, type ShowDetailData } from "@/lib/shows/data";
import { synchronizeShow } from "@/lib/shows/sync";
import { TmdbApiError } from "@/lib/tmdb/client";
import { isRichMetadataStale } from "@/lib/media/rich-metadata-freshness";

type Dependencies = {
  load: typeof loadShowDetail;
  synchronize: typeof synchronizeShow;
};
const dependencies: Dependencies = {
  load: loadShowDetail,
  synchronize: synchronizeShow,
};

export type ShowPageData = {
  detail: ShowDetailData | null;
  syncError: string | null;
  tmdbNotFound: boolean;
};

export async function loadShowPageData(
  userId: string,
  tmdbId: number,
  overrides: Partial<Dependencies> = {},
  now = new Date(),
): Promise<ShowPageData> {
  const { load, synchronize } = { ...dependencies, ...overrides };
  let detail = await load(userId, tmdbId);
  const needsEpisodes = !detail?.episodes.length;
  const needsRichMetadata = Boolean(
    detail && isRichMetadataStale(detail.media.rich_metadata_synced_at, now),
  );
  if (detail && !needsEpisodes && !needsRichMetadata)
    return { detail, syncError: null, tmdbNotFound: false };
  try {
    await synchronize(tmdbId);
    detail = await load(userId, tmdbId);
  } catch (error) {
    if (!detail && error instanceof TmdbApiError && error.status === 404)
      return { detail: null, syncError: null, tmdbNotFound: true };
    // Shared metadata is persisted before season reconciliation. Reload it so
    // a later episode failure cannot become a false not-found response.
    detail = await load(userId, tmdbId);
    if (!detail) throw error;
    return {
      detail,
      syncError: needsEpisodes
        ? "Episode metadata could not be synchronized. You can retry below."
        : "Metadata could not be refreshed. Cached information is still available.",
      tmdbNotFound: false,
    };
  }
  if (!detail)
    throw new Error(
      "Show metadata synchronization completed without a readable media item.",
    );
  return { detail, syncError: null, tmdbNotFound: false };
}
