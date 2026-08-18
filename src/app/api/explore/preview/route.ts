import { TmdbApiError } from "@/lib/tmdb/client";
import { loadPreviewCore, loadPreviewExtras } from "@/lib/media/preview";
import { parsePreviewKey } from "@/lib/media/types";
import { normalizeRegionCode } from "@/lib/regions";
import { createClient } from "@/lib/supabase/server";

const headers = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };
const error = (message: string, status: number) => Response.json({ error: message }, { status, headers });

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const key = parsePreviewKey(url.searchParams.get("preview"));
  const section = url.searchParams.get("section");
  if (!key || (section !== "core" && section !== "extras")) return error("Invalid preview request.", 400);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return error("Authentication required.", 401);
  try {
    if (section === "core") {
      const [core, mediaResult] = await Promise.all([
        loadPreviewCore(key),
        supabase.from("media_items").select("id").eq("media_type", key.mediaType).eq("tmdb_id", key.tmdbId).maybeSingle(),
      ]);
      if (mediaResult.error) return error("Preview details could not be loaded.", 500);
      let inLibrary = false;
      if (mediaResult.data) {
        const table = key.mediaType === "movie" ? "user_movies" : "user_shows";
        const membership = await supabase.from(table).select("id").eq("user_id", user.id).eq("media_item_id", mediaResult.data.id).maybeSingle();
        if (membership.error) return error("Preview details could not be loaded.", 500);
        inLibrary = Boolean(membership.data);
      }
      return Response.json({ ...core, inLibrary }, { headers });
    }
    const { data, error: profileError } = await supabase.from("profiles").select("region").eq("id", user.id).maybeSingle();
    if (profileError) return error("Preview details could not be loaded.", 500);
    const region = normalizeRegionCode(data?.region);
    return Response.json({ ...(await loadPreviewExtras(key, region)), region }, { headers });
  } catch (caught) {
    if (caught instanceof TmdbApiError && caught.status === 404) return error("This title could not be found.", 404);
    return error("Preview details could not be loaded.", 502);
  }
}
