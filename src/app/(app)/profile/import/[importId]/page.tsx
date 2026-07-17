import { notFound, redirect } from "next/navigation";
import { DeleteImportButton, MatchMoreButton } from "@/components/import/import-controls";
import { ImportApplyProgressPanel } from "@/components/import/import-apply-progress";
import { ImportMatchingProgress } from "@/components/import/import-matching-progress";
import { ImportResolutionWorkspace } from "@/components/import/import-resolution-workspace";
import { ImportUploadForm } from "@/components/import/import-upload-form";
import { loadMatchingProgress } from "@/lib/import/tv-time/matching-progress-data";
import type { ImportApplyProgress } from "@/lib/import/tv-time/progress";
import { loadResolutionSnapshot } from "@/lib/import/tv-time/resolution-snapshot-data";
import { requireImportProgress, requireImportSession } from "@/lib/import/tv-time/route-results";
import { shouldAutoStartMatching } from "@/lib/import/tv-time/ui-state";
import { createClient } from "@/lib/supabase/server";

export default async function ImportDetailPage({ params }: { params: Promise<{ importId: string }> }) {
  const importId = (await params).importId;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const sessionResult = await supabase.from("imports").select("*").eq("id", importId).eq("user_id", user.id).maybeSingle();
  const session = requireImportSession(sessionResult);
  if (!session) notFound();
  const [progressResult, matchingProgress, resolutionSnapshot] = await Promise.all([
    supabase.rpc("get_tv_time_import_apply_progress", { p_import_id: importId }),
    loadMatchingProgress(supabase, importId, user.id),
    loadResolutionSnapshot(supabase, importId, user.id),
  ]);
  const progress = requireImportProgress(progressResult) as unknown as ImportApplyProgress | null;
  return <main className="space-y-8">
    <header><h1 className="text-3xl font-semibold">Import preview</h1><p>Status: {session.status}</p><p className="text-sm text-[var(--muted)]">Legacy Unix watch_date values are authoritative. Other timezone-less created_at values are interpreted as UTC; historical local timezone is not known. Existing TrackTV watched dates are preserved.</p></header>
    <section className="grid gap-3 sm:grid-cols-4"><div className="rounded-xl border p-4">{session.total_items}<br />items</div><div className="rounded-xl border p-4">{session.matched_items}<br />matched</div><div className="rounded-xl border p-4">{session.applied_items}<br />applied</div><div className="rounded-xl border p-4">{session.skipped_items}<br />skipped</div></section>
    {["matching", "awaiting_resolution"].includes(session.status) ? <MatchMoreButton importId={importId} autoStart={shouldAutoStartMatching(session.status, matchingProgress?.remaining ?? 0)} /> : null}
    {matchingProgress ? <ImportMatchingProgress importId={importId} initialProgress={matchingProgress} /> : null}
    {resolutionSnapshot ? <ImportResolutionWorkspace importId={importId} initialItems={resolutionSnapshot.items} initialIssues={resolutionSnapshot.issues} initialRevision={resolutionSnapshot.revision} /> : null}
    {["ready", "applying", "paused"].includes(session.status) && progress ? <section className="rounded-xl border p-5"><h2 className="mb-3 text-xl font-semibold">Apply or resume</h2><ImportUploadForm mode="apply" importId={importId} initialProgress={progress} /></section> : null}
    {["completed", "cancelled", "failed"].includes(session.status) && progress ? <section className="rounded-xl border p-5"><h2 className="mb-3 text-xl font-semibold">Apply progress</h2><ImportApplyProgressPanel importId={importId} initialProgress={progress} requestPending={false} /></section> : null}
    <DeleteImportButton importId={importId} />
  </main>;
}
