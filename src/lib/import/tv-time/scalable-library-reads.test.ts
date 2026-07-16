import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("scalable current-library reads", () => {
  const migration = readFileSync("supabase/migrations/20260716030000_shared_metadata_scalable_reads.sql", "utf8");
  const libraryReads = migration.slice(migration.indexOf("create function public.load_watch_list_episode_data"), migration.indexOf("create function public.load_upcoming_data"));
  const shows = readFileSync("src/lib/shows/data.ts", "utf8");
  const movies = readFileSync("src/lib/movies/data.ts", "utf8");

  it("loads shows through one authenticated joined snapshot", () => {
    const watchListLoader = shows.slice(shows.indexOf("export async function loadWatchList"), shows.indexOf("export async function loadShowDetail"));
    expect(migration).toContain("from public.user_shows us");
    expect(migration).toContain("join public.media_items m");
    expect(watchListLoader).toContain('rpc("load_watch_list_episode_data")');
    expect(watchListLoader).not.toContain(".in(");
  });

  it("loads movies through one authenticated joined snapshot", () => {
    expect(migration).toContain("from public.user_movies um");
    expect(movies).toContain('rpc("load_movie_library_data")');
    expect(movies).not.toContain(".in(");
  });

  it("returns only current page fields and enforces authenticated ownership", () => {
    expect(migration).toContain("where us.user_id=auth.uid()");
    expect(migration).toContain("where um.user_id=auth.uid()");
    for (const forbidden of ["overview", "backdrop_path", "imdb_id", "runtime_minutes", "original_title"]) expect(libraryReads).not.toContain(forbidden);
  });

  it("preserves operation-specific safe diagnostics", () => {
    expect(shows).toContain('"load_watch_list_episode_data"');
    expect(movies).toContain('"load_movie_library_data"');
  });
});
