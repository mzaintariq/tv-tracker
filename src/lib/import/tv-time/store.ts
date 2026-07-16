import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/types/database";
import { itemDigest, matchContext } from "./normalize";
import type { NormalizedTvTimeImport } from "./types";
import { TvTimeImportDatabaseError } from "./errors";

export async function createImportSession(userId: string, fingerprint: string, normalized: NormalizedTvTimeImport): Promise<string> {
  const admin = createAdminClient();
  const items: Json[] = [
    ...normalized.shows.map((show) => ({ mediaType: "tv", sourceKey: show.sourceKey, sourceTitle: show.title.slice(0, 500), releaseDate: null, importMode: show.importMode, matchContext: matchContext(show), sourceRecordCount: show.sourceRecordCount, normalizedEventCount: show.episodeEvents.length, collapsedEventCount: show.sourceRecordCount - show.episodeEvents.length, sourceItemDigest: itemDigest(show) })),
    ...normalized.movies.map((movie) => ({ mediaType: "movie", sourceKey: movie.sourceKey, sourceTitle: movie.title.slice(0, 500), releaseDate: movie.releaseDate, importMode: movie.state === "watched" ? "watched_movie" : "watch_next_movie", matchContext: matchContext(movie), sourceRecordCount: movie.sourceRecordCount, normalizedEventCount: movie.sourceEventCount, collapsedEventCount: Math.max(0, movie.sourceEventCount - 1), sourceItemDigest: itemDigest(movie) })),
  ] as Json[];
  const issues: Json[] = [];
  if (normalized.summary.possibleMovieFavourites > 0) issues.push({ issueKey: "movie-favourites-confirmation", issueType: "movie_favourites_confirmation", isBlocking: true, details: { itemCount: normalized.summary.possibleMovieFavourites } });
  if (normalized.summary.cachedMovieCount !== null && normalized.summary.cachedMovieCount !== normalized.summary.detailedMovieCount) issues.push({ issueKey: "movie-count-discrepancy", issueType: "aggregate_count_discrepancy", isBlocking: false, details: { detailedCount: normalized.summary.detailedMovieCount, cachedCount: normalized.summary.cachedMovieCount } });
  const result = await admin.rpc("initialize_tv_time_import", {
    p_user_id: userId,
    p_source_fingerprint: fingerprint,
    p_summary: normalized.summary as unknown as Json,
    p_assumptions: { timezone: "Timezone-less TV Time created_at values are interpreted as UTC; historical local timezone is unknown.", rewatches: "Latest source event is canonical.", existingData: "Existing TrackTV watched dates win." },
    p_items: items,
    p_issues: issues,
  });
  if (result.error || !result.data) throw new TvTimeImportDatabaseError(result.error?.code);
  return result.data;
}

export async function recalculateImportStatus(userId: string, importId: string): Promise<string> {
  const admin = createAdminClient();
  const result = await admin.rpc("recalculate_tv_time_import_status", { p_user_id: userId, p_import_id: importId });
  if (result.error) throw new Error(result.error.message);
  return result.data;
}
