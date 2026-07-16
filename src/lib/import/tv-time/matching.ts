import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { getTvDetails, searchMovies, searchTv } from "@/lib/tmdb/endpoints";
import type { Json } from "@/types/database";
import { candidateDisplay, candidateYear, canonicalMatchTitle, extractTrailingYearHint, selectUniqueExactMovieCandidate, shouldFallbackYearSearch, withoutConflictingYear, type CandidateDisplay } from "./matching-quality";
import { recalculateImportStatus } from "./store";
import { isCandidateTmdbIds, isMatchContext } from "./validation";

type MatchResult = { status: "confirmed" | "ambiguous" | "unmatched"; tmdbId: number | null; candidates: number[]; candidateMetadata: CandidateDisplay[]; confidence: "exact" | "high" | null; reason: string };
type MatchingMetrics = { items:number;movies:number;tv:number;movieMs:number;tvMs:number;tmdbRequests:number;searchRequests:number;detailsRequests:number;seasonRequests:number;fallbackSearchRequests:number;databaseMs:number;failures:number;concurrency:number;claimBatchSize:number;durationMs:number };
type MatchingCache = { tvSearch:Map<string,ReturnType<typeof searchTv>>;movieSearch:Map<string,ReturnType<typeof searchMovies>>;tvDetails:Map<number,ReturnType<typeof getTvDetails>> };
const MATCH_CONCURRENCY=4; const CLAIM_BATCH_SIZE=10; const CACHE_LIMIT=100;
function cached<K,V>(cache:Map<K,Promise<V>>,key:K,load:()=>Promise<V>):Promise<V>{const existing=cache.get(key);if(existing)return existing;if(cache.size>=CACHE_LIMIT)cache.delete(cache.keys().next().value as K);const value=load();cache.set(key,value);return value;}
async function mapBounded<T>(values:T[],limit:number,worker:(value:T)=>Promise<void>){let cursor=0;await Promise.all(Array.from({length:Math.min(limit,values.length)},async()=>{while(cursor<values.length){const index=cursor;cursor+=1;await worker(values[index]);}}));}

async function matchTv(title: string, context: Json | null,cache:MatchingCache,metrics:MatchingMetrics): Promise<MatchResult> {
  if (!isMatchContext(context) || context.kind !== "tv") return { status: "unmatched", tmdbId: null, candidates: [], candidateMetadata: [], confidence: null, reason: "Invalid TV matching context." };
  const hint = extractTrailingYearHint(title); const normalized = canonicalMatchTitle(hint.searchTitle);
  const searchKey=`${normalized}|${hint.year??""}`; let search = await cached(cache.tvSearch,searchKey,()=>{metrics.tmdbRequests+=1;metrics.searchRequests+=1;return searchTv(hint.searchTitle,hint.year??undefined);});
  if (hint.year && shouldFallbackYearSearch(search, normalized, canonicalMatchTitle)){metrics.fallbackSearchRequests+=1;search=await cached(cache.tvSearch,`${normalized}|`,()=>{metrics.tmdbRequests+=1;metrics.searchRequests+=1;return searchTv(hint.searchTitle);});}
  search = withoutConflictingYear(search, hint.year);
  const exact = search.filter((candidate) => canonicalMatchTitle(candidate.name) === normalized || canonicalMatchTitle(candidate.original_name ?? "") === normalized).slice(0, 10);
  const viable: number[] = [];
  for (const candidate of exact) {
    const details = await cached(cache.tvDetails,candidate.id,()=>{metrics.tmdbRequests+=1;metrics.detailsRequests+=1;return getTvDetails(candidate.id);}); const counts = new Map((details.seasons ?? []).map((season) => [season.season_number, season.episode_count]));
    if (context.coordinates.every((coordinate) => (counts.get(coordinate.seasonNumber) ?? 0) >= coordinate.episodeNumber)) viable.push(candidate.id);
  }
  if (viable.length === 1) return { status: "confirmed", tmdbId: viable[0], candidates: viable, candidateMetadata: search.filter((candidate) => viable.includes(candidate.id)).map(candidateDisplay), confidence: "high", reason: "Unique exact title with compatible TMDB season coverage." };
  if (viable.length > 1) return { status: "ambiguous", tmdbId: null, candidates: viable, candidateMetadata: search.filter((candidate) => viable.includes(candidate.id)).map(candidateDisplay), confidence: null, reason: "Multiple exact candidates have compatible season coverage." };
  const suggestedResults = exact.length ? exact : search.slice(0, 10);
  const suggestions = suggestedResults.map((candidate) => candidate.id);
  return { status: suggestions.length ? "ambiguous" : "unmatched", tmdbId: null, candidates: suggestions, candidateMetadata: suggestedResults.map(candidateDisplay), confidence: null, reason: suggestions.length ? "Candidate requires confirmation." : "No TMDB candidate found." };
}

async function matchMovie(title: string, releaseDate: string | null,cache:MatchingCache,metrics:MatchingMetrics): Promise<MatchResult> {
  const hint = extractTrailingYearHint(title); const normalized = canonicalMatchTitle(hint.searchTitle);
  const searchKey=`${normalized}|${hint.year??""}`; let search=await cached(cache.movieSearch,searchKey,()=>{metrics.tmdbRequests+=1;metrics.searchRequests+=1;return searchMovies(hint.searchTitle,hint.year??undefined);});
  if(hint.year&&shouldFallbackYearSearch(search,normalized,canonicalMatchTitle)){metrics.fallbackSearchRequests+=1;search=await cached(cache.movieSearch,`${normalized}|`,()=>{metrics.tmdbRequests+=1;metrics.searchRequests+=1;return searchMovies(hint.searchTitle);});}
  search = withoutConflictingYear(search, hint.year);
  const exactTitle = search.filter((candidate) => canonicalMatchTitle(candidate.title) === normalized || canonicalMatchTitle(candidate.original_title ?? "") === normalized);
  const exactDate = exactTitle.filter((candidate) => candidate.release_date?.slice(0, 10) === releaseDate);
  if (exactDate.length === 1) return { status: "confirmed", tmdbId: exactDate[0].id, candidates: [exactDate[0].id], candidateMetadata: [candidateDisplay(exactDate[0])], confidence: "exact", reason: "Unique exact title and release date." };
  const knownYear = releaseDate ? Number(releaseDate.slice(0, 4)) : hint.year; const exactYear = exactTitle.filter((candidate) => candidateYear(candidate.release_date) === knownYear);
  if (knownYear && exactYear.length === 1) return { status: "confirmed", tmdbId: exactYear[0].id, candidates: [exactYear[0].id], candidateMetadata: [candidateDisplay(exactYear[0])], confidence: "high", reason: "Unique exact title and release year." };
  const uniqueExact = selectUniqueExactMovieCandidate(exactTitle, normalized, knownYear, canonicalMatchTitle);
  if (uniqueExact) return { status: "confirmed", tmdbId: uniqueExact.id, candidates: [uniqueExact.id], candidateMetadata: [candidateDisplay(uniqueExact)], confidence: "high", reason: "Unique exact-title candidate without a conflicting known year." };
  const suggestions = (exactDate.length ? exactDate : exactYear.length ? exactYear : exactTitle.length ? exactTitle : search).slice(0, 10).map((candidate) => candidate.id);
  const suggestedResults = search.filter((candidate) => suggestions.includes(candidate.id));
  return { status: suggestions.length ? "ambiguous" : "unmatched", tmdbId: null, candidates: suggestions, candidateMetadata: suggestedResults.map(candidateDisplay), confidence: null, reason: suggestions.length ? "Movie candidate requires confirmation." : "No TMDB candidate found." };
}

export async function matchImportBatch(userId: string, importId: string, limit = CLAIM_BATCH_SIZE): Promise<{ claimed: number; completed: number; status: string; metrics: MatchingMetrics }> {
  const started=performance.now(); const metrics:MatchingMetrics={items:0,movies:0,tv:0,movieMs:0,tvMs:0,tmdbRequests:0,searchRequests:0,detailsRequests:0,seasonRequests:0,fallbackSearchRequests:0,databaseMs:0,failures:0,concurrency:MATCH_CONCURRENCY,claimBatchSize:Math.min(10,Math.max(1,limit)),durationMs:0};
  const admin = createAdminClient();
  let databaseStarted=performance.now();
  const claim = await admin.rpc("claim_import_items_for_matching", { p_user_id: userId, p_import_id: importId, p_limit: Math.min(10, Math.max(1, limit)), p_lease_seconds: 180 });
  metrics.databaseMs+=performance.now()-databaseStarted;
  if (claim.error) throw new Error(claim.error.message);
  let completed=0; const claimedRows=claim.data??[]; const ids=claimedRows.map(row=>row.item_id); databaseStarted=performance.now();
  const itemResult=ids.length?await admin.from("import_items").select("id,media_type,match_context,mapping_id").in("id",ids).eq("user_id",userId):{data:[],error:null};
  const mappingIds=(itemResult.data??[]).flatMap(item=>item.mapping_id?[item.mapping_id]:[]); const mappingResult=mappingIds.length?await admin.from("source_media_mappings").select("id,source_title,source_release_date").in("id",mappingIds).eq("user_id",userId):{data:[],error:null}; metrics.databaseMs+=performance.now()-databaseStarted;
  if(itemResult.error||mappingResult.error)throw new Error("Matching batch data could not be loaded."); const items=new Map((itemResult.data??[]).map(item=>[item.id,item])); const mappings=new Map((mappingResult.data??[]).map(mapping=>[mapping.id,mapping])); const cache:MatchingCache={tvSearch:new Map(),movieSearch:new Map(),tvDetails:new Map()};
  await mapBounded(claimedRows,MATCH_CONCURRENCY,async(claimed)=>{
    const item=items.get(claimed.item_id); const mapping=item?.mapping_id?mappings.get(item.mapping_id):undefined; if(!item||!mapping)return; const itemStarted=performance.now(); metrics.items+=1; if(item.media_type==="tv")metrics.tv+=1;else metrics.movies+=1;
    try {
      const result = item.media_type === "tv" ? await matchTv(mapping.source_title,item.match_context,cache,metrics) : await matchMovie(mapping.source_title,mapping.source_release_date,cache,metrics);
      if (!isCandidateTmdbIds(result.candidates)) throw new Error("Invalid TMDB candidate set.");
      const persistenceStarted=performance.now();
      const saved = await admin.rpc("complete_import_match_claim", { p_user_id: userId, p_item_id: claimed.item_id, p_claim_token: claimed.claim_token, p_status: result.status, p_tmdb_id: result.tmdbId, p_candidates: result.candidates, p_confidence: result.confidence, p_reason: result.reason });
      if (!saved.error) { await admin.from("source_media_mappings").update({ candidate_metadata: result.candidateMetadata as unknown as Json }).eq("id",mapping.id).eq("user_id",userId); completed+=1; } metrics.databaseMs+=performance.now()-persistenceStarted;
    } catch {
      metrics.failures+=1; const failurePersistenceStarted=performance.now();
      await admin.rpc("complete_import_match_claim", { p_user_id: userId, p_item_id: claimed.item_id, p_claim_token: claimed.claim_token, p_status: "unmatched", p_tmdb_id: null, p_candidates: [], p_confidence: null, p_reason: "Matching request failed and may be retried." });
      metrics.databaseMs+=performance.now()-failurePersistenceStarted;
    }
    const elapsed=performance.now()-itemStarted;if(item.media_type==="tv")metrics.tvMs+=elapsed;else metrics.movieMs+=elapsed;
  });
  databaseStarted=performance.now();
  const status = await recalculateImportStatus(userId, importId);
  metrics.databaseMs+=performance.now()-databaseStarted;metrics.durationMs=performance.now()-started;
  return { claimed: claimedRows.length, completed, status,metrics };
}
