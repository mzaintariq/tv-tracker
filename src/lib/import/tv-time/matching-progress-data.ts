import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";
import { matchingProgressFromCounts, type MatchingProgressSnapshot } from "./matching-progress";

export async function loadMatchingProgress(client: SupabaseClient<Database>, importId: string, userId: string): Promise<MatchingProgressSnapshot | null> {
  const base = () => client.from("import_items").select("id", { count: "exact", head: true }).eq("import_id", importId).eq("user_id", userId);
  const [session, total, unfinished, confirmed, review, skipped] = await Promise.all([
    client.from("imports").select("status").eq("id", importId).eq("user_id", userId).maybeSingle(),
    base(),
    base().in("match_status", ["pending", "matching"]),
    base().eq("match_status", "confirmed"),
    base().in("match_status", ["ambiguous", "unmatched", "failed"]),
    base().eq("match_status", "skipped"),
  ]);
  const error = session.error ?? total.error ?? unfinished.error ?? confirmed.error ?? review.error ?? skipped.error;
  if (error) throw new Error(error.code ?? "matching_progress_database_error");
  if (!session.data) return null;
  return matchingProgressFromCounts({ status: session.data.status, total: total.count ?? 0, unfinished: unfinished.count ?? 0, confirmed: confirmed.count ?? 0, needsReview: review.count ?? 0, skipped: skipped.count ?? 0 });
}
