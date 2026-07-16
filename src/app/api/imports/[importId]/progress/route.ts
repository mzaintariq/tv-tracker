import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import type { ImportApplyProgress } from "@/lib/import/tv-time/progress";

export async function GET(_request: Request, { params }: { params: Promise<{ importId: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  const importId = (await params).importId;
  const result = await supabase.rpc("get_tv_time_import_apply_progress", { p_import_id: importId });
  if (result.error) {
    console.error(JSON.stringify({ event: "tv_time_apply_progress_failed", code: result.error.code ?? "progress_database_error" }));
    return NextResponse.json({ error: "Import progress could not be loaded.", code: "progress_database_error" }, { status: 500 });
  }
  if (!result.data) return NextResponse.json({ error: "Import not found." }, { status: 404 });

  return NextResponse.json(result.data as unknown as ImportApplyProgress);
}

