"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { recalculateImportStatus } from "@/lib/import/tv-time/store";

async function identity() { const supabase = await createClient(); const { data: { user } } = await supabase.auth.getUser(); return user; }
function refresh(importId?: string) { revalidatePath("/profile/import"); if (importId) revalidatePath(`/profile/import/${importId}`); }
function mutationFailure(message: string | undefined, fallback: string) {
  if (message?.includes("not user-resolvable")) return { error: "This item is no longer available for manual resolution.", code: "item_not_resolvable" };
  if (message?.includes("item is busy")) return { error: "This item is currently being matched. Try again shortly.", code: "item_busy" };
  if (message?.includes("active matching work")) return { error: "Matching is still finishing active work. Try deleting again shortly.", code: "import_busy" };
  if (message?.includes("active apply work")) return { error: "An import being applied cannot be deleted.", code: "import_applying" };
  return { error: fallback, code: "mutation_rejected" };
}
type ImportActionResult = { error?: string; success?: string; code?: string };

export async function confirmImportCandidate(importId: string, itemId: string, tmdbId: number) {
  const user = await identity(); if (!user || !Number.isInteger(tmdbId) || tmdbId < 1) return { error: "Invalid resolution request." };
  const admin = createAdminClient();
  const result = await admin.rpc("confirm_tv_time_import_mapping", { p_user_id: user.id, p_import_id: importId, p_item_id: itemId, p_tmdb_id: tmdbId });
  if (result.error) return mutationFailure(result.error.message, "Could not save the mapping.");
  await recalculateImportStatus(user.id, importId); refresh(importId); return { success: "Match confirmed." };
}

export async function skipImportItem(importId: string, itemId: string) {
  const user = await identity(); if (!user) return { error: "Authentication required." }; const admin = createAdminClient();
  const result = await admin.rpc("skip_tv_time_import_item", { p_user_id: user.id, p_import_id: importId, p_item_id: itemId });
  if (result.error) return mutationFailure(result.error.message, "Import item cannot be skipped in its current state.");
  await recalculateImportStatus(user.id, importId); refresh(importId); return { success: "Item skipped for this import." };
}

export async function skipAllUnresolvedImportItems(importId: string) {
  const user = await identity(); if (!user) return { error: "Authentication required." }; const admin = createAdminClient();
  const result = await admin.rpc("skip_all_unresolved_tv_time_media", { p_user_id: user.id, p_import_id: importId });
  if (result.error) return mutationFailure(result.error.message, "Unresolved media could not be skipped.");
  refresh(importId); return { success: `${result.data} unresolved media items skipped.` };
}

export async function skipUnresolvedImportItemsByType(importId: string, mediaType: "tv" | "movie"): Promise<ImportActionResult> {
  const user = await identity(); if (!user) return { error: "Authentication required." }; const admin = createAdminClient();
  const result = await admin.rpc("skip_unresolved_tv_time_media_by_type", { p_user_id: user.id, p_import_id: importId, p_media_type: mediaType });
  if (result.error) return mutationFailure(result.error.message, `Unresolved ${mediaType === "tv" ? "TV shows" : "movies"} could not be skipped.`);
  refresh(importId); return { success: `${result.data} unresolved ${mediaType === "tv" ? "TV shows" : "movies"} skipped.` };
}

export async function skipMissingCoordinateIssues(importId: string, importItemId: string | null): Promise<ImportActionResult> {
  const user = await identity(); if (!user) return { error: "Authentication required." }; const admin = createAdminClient();
  const result = await admin.rpc("skip_missing_tv_time_coordinates", { p_user_id: user.id, p_import_id: importId, p_import_item_id: importItemId });
  if (result.error) return mutationFailure(result.error.message, "Unmatched episode records could not be skipped.");
  refresh(importId); return { success: `${result.data} unmatched episode records skipped.` };
}

export async function resolveImportIssue(importId: string, issueId: string, accepted: boolean): Promise<ImportActionResult> {
  const user = await identity(); if (!user) return { error: "Authentication required." }; const admin = createAdminClient();
  const result = await admin.rpc("resolve_tv_time_import_issue", { p_user_id: user.id, p_import_id: importId, p_issue_id: issueId, p_status: accepted ? "accepted" : "declined" });
  if (result.error) return mutationFailure(result.error.message, "This decision could not be saved. Refresh and try again.");
  refresh(importId); return { success: accepted ? "Movie favourites will be imported." : "Movie favourites will not be imported." };
}

export async function deleteImportSession(importId: string) {
  const user = await identity(); if (!user) return { error: "Authentication required." }; const admin = createAdminClient();
  const result = await admin.rpc("delete_tv_time_import", { p_user_id: user.id, p_import_id: importId });
  if (result.error) return mutationFailure(result.error.message, "Import cannot be deleted in its current state."); refresh(); return { success: "Import session deleted; reusable mappings were preserved." };
}

export async function forgetAllTvTimeImportData() {
  const user = await identity(); if (!user) return { error: "Authentication required." }; const admin = createAdminClient();
  const result = await admin.rpc("forget_tv_time_import_data", { p_user_id: user.id }); if (result.error) return { error: "Pause active imports before forgetting TV Time data." };
  refresh(); return { success: "All TV Time import metadata and mappings were forgotten. Imported library data was kept." };
}

export async function setImportPaused(importId: string, paused: boolean) {
  const user = await identity(); if (!user) return { error: "Authentication required." }; const admin = createAdminClient();
  const result = await admin.rpc("set_tv_time_import_paused", { p_user_id: user.id, p_import_id: importId, p_paused: paused });
  if (result.error) return { error: "Import state changed; refresh and try again." }; refresh(importId); return { success: paused ? "Import paused." : "Import ready to resume." };
}
