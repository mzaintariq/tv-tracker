import { NextResponse } from "next/server";

import { loadMatchingProgress } from "@/lib/import/tv-time/matching-progress-data";
import { createClient } from "@/lib/supabase/server";

export async function GET(_request: Request, { params }: { params: Promise<{ importId: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  try {
    const progress = await loadMatchingProgress(supabase, (await params).importId, user.id);
    if (!progress) return NextResponse.json({ error: "Import not found." }, { status: 404 });
    return NextResponse.json(progress);
  } catch (error) {
    console.error(JSON.stringify({ event: "tv_time_matching_progress_failed", code: error instanceof Error ? error.message : "matching_progress_database_error" }));
    return NextResponse.json({ error: "Matching progress could not be loaded.", code: "matching_progress_database_error" }, { status: 500 });
  }
}
