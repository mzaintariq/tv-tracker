import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { TvTimeImportDatabaseError, TvTimeImportError } from "@/lib/import/tv-time/errors";
import { sha256Hex } from "@/lib/import/tv-time/fingerprint";
import { readBoundedZipBody } from "@/lib/import/tv-time/http";
import { normalizeTvTimeExport } from "@/lib/import/tv-time/normalize";
import { createImportSession } from "@/lib/import/tv-time/store";
import { readAllowedTvTimeZip } from "@/lib/import/tv-time/zip";

export const runtime = "nodejs";
export const maxDuration = 60;

type AnalyzeStage = "auth" | "request_body" | "fingerprint" | "zip_validation" | "csv_schema" | "normalization" | "initialize_import" | "database";

function logAnalyzeFailure(stage: AnalyzeStage, code: string): void {
  console.error(JSON.stringify({ event: "tv_time_analyze_failed", stage, code }));
}

export async function POST(request: Request) {
  let stage: AnalyzeStage = "auth";
  try {
    const supabase = await createClient(); const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    stage = "request_body";
    const bytes = await readBoundedZipBody(request);
    stage = "fingerprint";
    const fingerprint = sha256Hex(bytes);
    stage = "zip_validation";
    const files = readAllowedTvTimeZip(bytes);
    stage = "normalization";
    const normalized = normalizeTvTimeExport(files);
    stage = "initialize_import";
    const importId = await createImportSession(user.id, fingerprint, normalized);
    return NextResponse.json({ importId, status: "matching" });
  } catch (error) {
    if (error instanceof TvTimeImportError) {
      const errorStage: AnalyzeStage = error.code.startsWith("csv_") ? "csv_schema" : stage;
      logAnalyzeFailure(errorStage, error.code);
      return NextResponse.json({ error: error.message, code: error.code }, { status: 400 });
    }
    if (error instanceof TvTimeImportDatabaseError) {
      logAnalyzeFailure("database", error.code);
      return NextResponse.json({ error: "The import could not be analyzed.", code: error.code }, { status: 500 });
    }
    const code = `${stage}_failed`;
    logAnalyzeFailure(stage, code);
    return NextResponse.json({ error: "The import could not be analyzed.", code }, { status: 500 });
  }
}
