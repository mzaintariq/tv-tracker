import { notFound, redirect } from "next/navigation";
import { DeleteImportButton, MatchMoreButton } from "@/components/import/import-controls";
import { ImportUploadForm } from "@/components/import/import-upload-form";
import { ImportApplyProgressPanel } from "@/components/import/import-apply-progress";
import { ImportMatchingProgress } from "@/components/import/import-matching-progress";
import { ImportResolutionWorkspace } from "@/components/import/import-resolution-workspace";
import { createClient } from "@/lib/supabase/server";
import { shouldAutoStartMatching } from "@/lib/import/tv-time/ui-state";
import type { ImportApplyProgress } from "@/lib/import/tv-time/progress";
import { loadMatchingProgress } from "@/lib/import/tv-time/matching-progress-data";
import { loadResolutionSnapshot } from "@/lib/import/tv-time/resolution-snapshot-data";

export default async function ImportDetailPage({ params }: { params: Promise<{ importId: string }> }) {
  const importId = (await params).importId;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const session = await supabase.from("imports").select("*").eq("id", importId).eq("user_id", user.id).maybeSingle();
  if (!session.data) notFound();
  const [progressResult, matchingProgress, resolutionSnapshot] = await Promise.all([
    supabase.rpc("get_tv_time_import_apply_progress", { p_import_id: importId }),
    loadMatchingProgress(supabase, importId, user.id),
    loadResolutionSnapshot(supabase, importId, user.id),
  ]);
  const progress = progressResult.data as unknown as ImportApplyProgress | null;
  return <main className="space-y-8">
    <header><h1 className="text-3xl font-semibold">Import preview</h1><p>Status: {session.data.status}</p><p className="text-sm text-[var(--muted)]">Legacy Unix watch_date values are authoritative. Other timezone-less created_at values are interpreted as UTC; historical local timezone is not known. Existing TrackTV watched dates are preserved.</p></header>
    <section className="grid gap-3 sm:grid-cols-4"><div className="rounded-xl border p-4">{session.data.total_items}<br />items</div><div className="rounded-xl border p-4">{session.data.matched_items}<br />matched</div><div className="rounded-xl border p-4">{session.data.applied_items}<br />applied</div><div className="rounded-xl border p-4">{session.data.skipped_items}<br />skipped</div></section>
    {["matching", "awaiting_resolution"].includes(session.data.status) ? <MatchMoreButton importId={importId} autoStart={shouldAutoStartMatching(session.data.status, matchingProgress?.remaining ?? 0)} /> : null}
    {matchingProgress ? <ImportMatchingProgress importId={importId} initialProgress={matchingProgress} /> : null}
    {resolutionSnapshot ? <ImportResolutionWorkspace importId={importId} initialItems={resolutionSnapshot.items} initialIssues={resolutionSnapshot.issues} initialRevision={resolutionSnapshot.revision} /> : null}
    {["ready", "applying", "paused"].includes(session.data.status) && progress ? <section className="rounded-xl border p-5"><h2 className="mb-3 text-xl font-semibold">Apply or resume</h2><ImportUploadForm mode="apply" importId={importId} initialProgress={progress} /></section> : null}
    {["completed", "cancelled", "failed"].includes(session.data.status) && progress ? <section className="rounded-xl border p-5"><h2 className="mb-3 text-xl font-semibold">Apply progress</h2><ImportApplyProgressPanel importId={importId} initialProgress={progress} requestPending={false} /></section> : null}
    <DeleteImportButton importId={importId} />
  </main>;
}
