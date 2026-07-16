import { NextResponse } from "next/server";
import { applyNormalizedImport } from "@/lib/import/tv-time/apply";
import { TvTimeImportError } from "@/lib/import/tv-time/errors";
import { sha256Hex } from "@/lib/import/tv-time/fingerprint";
import { readBoundedZipBody } from "@/lib/import/tv-time/http";
import { normalizeTvTimeExport } from "@/lib/import/tv-time/normalize";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { readAllowedTvTimeZip } from "@/lib/import/tv-time/zip";
import { safeApplyFailure } from "@/lib/import/tv-time/apply-error";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request, { params }: { params: Promise<{ importId: string }> }) {
  const supabase = await createClient(); const { data: { user } } = await supabase.auth.getUser(); if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const importId = (await params).importId;
  try {
    const bytes = await readBoundedZipBody(request); const fingerprint = sha256Hex(bytes);
    const session = await supabase.from("imports").select("source_fingerprint").eq("id", importId).eq("user_id", user.id).single();
    if (session.error || session.data.source_fingerprint !== fingerprint) return NextResponse.json({ error: "Choose the same ZIP that was analyzed.", code: "fingerprint_mismatch" }, { status: 409 });
    const result = await applyNormalizedImport(user.id, importId, normalizeTvTimeExport(readAllowedTvTimeZip(bytes)));
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof TvTimeImportError) return NextResponse.json({ error: error.message, code: error.code }, { status: 400 });
    const failure = safeApplyFailure(error);
    const admin = createAdminClient();
    await admin.from("imports").update({ status: "paused", last_error_code: failure.code }).eq("id", importId).eq("user_id", user.id).in("status", ["applying", "paused"]);
    const [tvApplied, tvPending, movieApplied, moviePending] = await Promise.all([
      admin.from("import_items").select("id", { count: "exact", head: true }).eq("import_id", importId).eq("media_type", "tv").eq("application_status", "applied"),
      admin.from("import_items").select("id", { count: "exact", head: true }).eq("import_id", importId).eq("media_type", "tv").in("application_status", ["pending", "blocked", "failed"]),
      admin.from("import_items").select("id", { count: "exact", head: true }).eq("import_id", importId).eq("media_type", "movie").eq("application_status", "applied"),
      admin.from("import_items").select("id", { count: "exact", head: true }).eq("import_id", importId).eq("media_type", "movie").in("application_status", ["pending", "blocked", "failed"]),
    ]);
    const diagnostic = failure.diagnostic; console.error(JSON.stringify({ event: "tv_time_apply_paused", correlationId: crypto.randomUUID(), phase: diagnostic?.stage.startsWith("movie_") ? "movie" : "tv", stage: diagnostic?.stage ?? "unknown", category: diagnostic?.category ?? "unknown_error", safeCode: diagnostic?.safeCode ?? null, retryable: diagnostic?.retryable ?? false, retryAttempts: 0, progress: { tvApplied: tvApplied.count ?? 0, tvRemaining: tvPending.count ?? 0, movieApplied: movieApplied.count ?? 0, movieRemaining: moviePending.count ?? 0 } }));
    return NextResponse.json({ error: failure.message, code: failure.code }, { status: 500 });
  }
}
