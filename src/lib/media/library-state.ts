import { libraryKey } from "@/lib/tmdb/mappers";

export const EXPLORE_LIBRARY_PAGE_SIZE = 500;
export const EXPLORE_MEDIA_ID_CHUNK_SIZE = 200;

export type LibraryReadStage = "user_shows" | "user_movies" | "media_items" | "missing_media";
export type MembershipMediaRow = { media_item_id: string };
export type LibraryMediaRow = { id: string; tmdb_id: number; media_type: "tv" | "movie" };

export class ExploreLibraryReadError extends Error {
  constructor(readonly stage: LibraryReadStage) {
    super("explore_library_read_failed");
    this.name = "ExploreLibraryReadError";
  }
}

export function requireLibraryRows<T>(result: { data: T[] | null; error: unknown }, stage: LibraryReadStage): T[] {
  if (result.error) throw new ExploreLibraryReadError(stage);
  return result.data ?? [];
}

export async function loadLibraryPages<T>(stage: "user_shows" | "user_movies", fetchPage: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += EXPLORE_LIBRARY_PAGE_SIZE) {
    const page = requireLibraryRows(await fetchPage(from, from + EXPLORE_LIBRARY_PAGE_SIZE - 1), stage);
    rows.push(...page);
    if (page.length < EXPLORE_LIBRARY_PAGE_SIZE) return rows;
  }
}

export function mediaIdChunks(shows: readonly MembershipMediaRow[], movies: readonly MembershipMediaRow[]): string[][] {
  const ids = [...new Set([...shows, ...movies].map((row) => row.media_item_id))];
  return Array.from({ length: Math.ceil(ids.length / EXPLORE_MEDIA_ID_CHUNK_SIZE) }, (_, index) => ids.slice(index * EXPLORE_MEDIA_ID_CHUNK_SIZE, (index + 1) * EXPLORE_MEDIA_ID_CHUNK_SIZE));
}

export function buildLibraryKeys(shows: readonly MembershipMediaRow[], movies: readonly MembershipMediaRow[], media: readonly LibraryMediaRow[]): Set<string> {
  const expectedIds = new Set([...shows, ...movies].map((row) => row.media_item_id));
  const foundIds = new Set(media.map((row) => row.id));
  if ([...expectedIds].some((id) => !foundIds.has(id))) throw new ExploreLibraryReadError("missing_media");
  return new Set(media.map((row) => libraryKey(row.media_type, row.tmdb_id)));
}
