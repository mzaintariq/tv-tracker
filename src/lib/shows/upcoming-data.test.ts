import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("scalable Upcoming data contract", () => {
  const loader = readFileSync("src/lib/shows/upcoming-data.ts", "utf8");
  const actions = readFileSync("src/app/actions/shows.ts", "utf8");
  const migration = readFileSync("supabase/migrations/20260716030000_shared_metadata_scalable_reads.sql", "utf8");
  const upcomingRead = migration.slice(migration.indexOf("create function public.load_upcoming_data"));

  it("uses one authenticated joined RPC without UUID fan-out", () => {
    expect(loader).toContain('rpc("load_upcoming_data"');
    expect(loader).not.toContain(".in(");
    expect(migration).toContain("from public.user_shows us");
    expect(migration).toContain("join public.media_items m");
    expect(migration).toContain("from public.episodes e");
    expect(migration).toContain("us.user_id=auth.uid()");
  });

  it("filters future rows in PostgreSQL and selects only required fields", () => {
    expect(migration).toContain("e.air_date>=p_today");
    expect(upcomingRead).not.toContain("select *");
    for (const field of ["media_item_id", "tmdb_id", "title", "poster_path", "tmdb_status", "episodes_synced_at", "season_number", "episode_number", "air_date", "tmdb_episode_id"]) expect(migration).toContain(`'${field}'`);
  });

  it("keeps timezone and RPC failures diagnostically separate", () => {
    expect(loader).toContain('"upcoming_profile_timezone"');
    expect(loader).toContain('"load_upcoming_data"');
  });

  it("removes the refresh coordinator's large membership UUID list", () => {
    const refresh = actions.slice(actions.indexOf("export async function refreshStaleUpcoming"), actions.indexOf("export async function syncShowMetadata"));
    expect(refresh).toContain('rpc("load_upcoming_refresh_candidates"');
    expect(refresh).not.toContain("mediaIds");
    expect(refresh).not.toContain('.in("id"');
  });
});
