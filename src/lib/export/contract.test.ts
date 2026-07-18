import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("user export implementation contract", () => {
  const loader = readFileSync("src/lib/export/data.ts", "utf8");
  const route = readFileSync("src/app/api/export/route.ts", "utf8");
  const settings = readFileSync("src/app/(app)/profile/settings/page.tsx", "utf8");

  it("uses only the normal owner-authenticated server client", () => {
    expect(loader).toContain('from "@/lib/supabase/server"');
    expect(loader).not.toContain("admin");
    expect(route).toContain("client.auth.getUser()");
    expect(route).not.toContain("userId");
    expect(route).not.toContain("searchParams");
  });

  it("selects only explicit portable and loader identity fields", () => {
    expect(loader).toContain('select("display_name,avatar_url,timezone,theme")');
    expect(loader).toContain('select("id,media_item_id,status,is_favourite,created_at")');
    expect(loader).toContain('select("id,media_item_id,watched_at,is_favourite,created_at")');
    expect(loader).toContain('select("id,episode_id,watched_at")');
    expect(loader).toContain('select("id,media_item_id,tmdb_episode_id,season_number,episode_number,title,air_date")');
    expect(loader).toContain('select("id,tmdb_id,media_type,title,release_date,runtime_minutes")');
    expect(loader).not.toContain('select("*")');
  });

  it("exposes a native Settings download with the required privacy explanation", () => {
    expect(settings).toContain('href="/api/export"');
    expect(settings).toContain("Download your data");
    for (const phrase of ["email", "internal IDs", "TV Time source files", "import diagnostics", "generated on demand", "not retained"]) expect(settings).toContain(phrase);
  });
});
