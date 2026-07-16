import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { parseCandidateMetadata } from "./matching-quality";
import { buildImportIssueDisplayModel, type ImportIssueForDisplay } from "./issues-ui";
import { resolutionRevision, type ResolutionSnapshot, type ResolutionSnapshotItem } from "./resolution-snapshot";

const PAGE_SIZE = 500;
async function allPages<T>(load: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { code?: string } | null }>): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) { const result = await load(from, from + PAGE_SIZE - 1); if (result.error) throw new Error(result.error.code ?? "resolution_snapshot_database_error"); const page = result.data ?? []; rows.push(...page); if (page.length < PAGE_SIZE) return rows; }
}

export async function loadResolutionSnapshot(client: SupabaseClient<Database>, importId: string, userId: string): Promise<Omit<ResolutionSnapshot, "sequence"> | null> {
  const session = await client.from("imports").select("id").eq("id", importId).eq("user_id", userId).maybeSingle();
  if (session.error) throw new Error(session.error.code ?? "resolution_snapshot_database_error"); if (!session.data) return null;
  const allItems = await allPages((from, to) => client.from("import_items").select("id,mapping_id,media_type,import_mode,match_status,updated_at").eq("import_id", importId).eq("user_id", userId).order("id").range(from, to));
  const mappings = await allPages((from, to) => client.from("source_media_mappings").select("id,source_title,candidate_tmdb_ids,candidate_metadata,tmdb_id").eq("user_id", userId).order("id").range(from, to));
  const issues = await allPages((from, to) => client.from("import_issues").select("id,import_item_id,issue_type,is_blocking,status,details,updated_at").eq("import_id", importId).eq("user_id", userId).order("id").range(from, to));
  const mappingById = new Map(mappings.map((mapping) => [mapping.id, mapping])); const itemById = new Map(allItems.map((item) => [item.id, item]));
  const resolutionItems: ResolutionSnapshotItem[] = allItems.flatMap((item) => { const mapping = item.mapping_id ? mappingById.get(item.mapping_id) : undefined; if (!mapping || !["ambiguous", "unmatched", "failed"].includes(item.match_status)) return []; return [{ id: item.id, mediaType: item.media_type, sourceTitle: mapping.source_title, matchStatus: item.match_status as ResolutionSnapshotItem["matchStatus"], importMode: item.import_mode, candidates: mapping.candidate_tmdb_ids, candidateMetadata: parseCandidateMetadata(mapping.candidate_metadata) }]; });
  const issueDisplay: ImportIssueForDisplay[] = issues.map((issue) => { const item = issue.import_item_id ? itemById.get(issue.import_item_id) : undefined; const mapping = item?.mapping_id ? mappingById.get(item.mapping_id) : undefined; const candidates = parseCandidateMetadata(mapping?.candidate_metadata); const details = typeof issue.details === "object" && issue.details !== null && !Array.isArray(issue.details) ? issue.details : {}; return { id: issue.id, importItemId: issue.import_item_id, issue_type: issue.issue_type, is_blocking: issue.is_blocking, status: issue.status, sourceTitle: mapping?.source_title, mediaType: item?.media_type, seasonNumber: typeof details.seasonNumber === "number" ? details.seasonNumber : undefined, episodeNumber: typeof details.episodeNumber === "number" ? details.episodeNumber : undefined, detailedCount: typeof details.detailedCount === "number" ? details.detailedCount : undefined, cachedCount: typeof details.cachedCount === "number" ? details.cachedCount : undefined, selectedTmdbId: mapping?.tmdb_id, selectedCandidate: candidates.find((candidate) => candidate.id === mapping?.tmdb_id) }; });
  const blank = () => ({ ambiguous: 0, unmatched: 0, failed: 0 }); const counts = { tv: blank(), movie: blank() };
  for (const item of resolutionItems) counts[item.mediaType][item.matchStatus]++;
  const issueModel = buildImportIssueDisplayModel(issueDisplay); const itemUpdatedAt = allItems.filter((item) => ["ambiguous", "unmatched", "failed"].includes(item.match_status)).reduce<string | null>((latest, item) => !latest || item.updated_at > latest ? item.updated_at : latest, null); const issueUpdatedAt = issues.reduce<string | null>((latest, issue) => !latest || issue.updated_at > latest ? issue.updated_at : latest, null);
  return { revision: resolutionRevision({ itemUpdatedAt, issueUpdatedAt, unresolvedCount: resolutionItems.length, openIssueCount: issueModel.openBlocking + issueModel.openNonBlocking }), items: resolutionItems, issues: issueDisplay, counts: { ...counts, openBlocking: issueModel.openBlocking, openInformational: issueModel.openNonBlocking } };
}
