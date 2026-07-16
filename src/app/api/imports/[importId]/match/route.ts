import { NextResponse } from "next/server";
import { matchImportBatch } from "@/lib/import/tv-time/matching";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export async function POST(_request: Request, { params }: { params: Promise<{ importId: string }> }) {
  const supabase = await createClient(); const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  try { return NextResponse.json(await matchImportBatch(user.id, (await params).importId)); }
  catch { return NextResponse.json({ error: "Matching batch failed." }, { status: 500 }); }
}
