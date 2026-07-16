import { buildTrackTvExport, ExportDataIntegrityError } from "@/lib/export/build";
import { ExportLoadError, loadExportSourceData, type ExportLoadStage } from "@/lib/export/data";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const PRIVATE_HEADERS = {
  "Cache-Control": "private, no-store",
  "X-Content-Type-Options": "nosniff",
};

function jsonError(message: string, status: number): Response {
  return Response.json({ error: message }, { status, headers: PRIVATE_HEADERS });
}

function filename(timestamp: string): string {
  return `tracktv-export-${timestamp.replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z")}.json`;
}

function logFailure(stage: ExportLoadStage | "auth" | "assembly", category: "database_error" | "data_integrity_error"): void {
  console.error(JSON.stringify({ event: "user_export_failed", stage, category }));
}

export async function GET(): Promise<Response> {
  let client: Awaited<ReturnType<typeof createClient>>;
  let user: { id: string } | null;
  try {
    client = await createClient();
    const auth = await client.auth.getUser();
    user = auth.data.user;
  } catch {
    logFailure("auth", "database_error");
    return jsonError("Your data could not be exported.", 500);
  }
  if (!user) return jsonError("Authentication required.", 401);

  try {
    const generatedAt = new Date().toISOString();
    const source = await loadExportSourceData(client, user.id);
    const document = buildTrackTvExport(source, generatedAt);
    return new Response(JSON.stringify(document, null, 2), {
      status: 200,
      headers: {
        ...PRIVATE_HEADERS,
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename(generatedAt)}"`,
      },
    });
  } catch (error) {
    if (error instanceof ExportLoadError) logFailure(error.stage, "database_error");
    else logFailure("assembly", error instanceof ExportDataIntegrityError ? "data_integrity_error" : "database_error");
    return jsonError("Your data could not be exported.", 500);
  }
}
