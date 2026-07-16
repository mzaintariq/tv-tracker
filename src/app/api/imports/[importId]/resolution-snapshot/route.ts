import { NextResponse } from "next/server";
import { loadResolutionSnapshot } from "@/lib/import/tv-time/resolution-snapshot-data";
import { createClient } from "@/lib/supabase/server";

export async function GET(_request: Request, { params }: { params: Promise<{ importId: string }> }) {
  const supabase = await createClient(); const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  try { const snapshot = await loadResolutionSnapshot(supabase, (await params).importId, user.id); if (!snapshot) return NextResponse.json({ error: "Import not found." }, { status: 404 }); return NextResponse.json(snapshot); }
  catch (error) { console.error(JSON.stringify({ event: "tv_time_resolution_snapshot_failed", code: error instanceof Error ? error.message : "resolution_snapshot_database_error" })); return NextResponse.json({ error: "Resolution status could not be refreshed.", code: "resolution_snapshot_database_error" }, { status: 500 }); }
}
