import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const actions = readFileSync("src/app/actions/shows.ts", "utf8");
const controls = readFileSync("src/components/shows/show-controls.tsx", "utf8");
const syncAction = actions.slice(
  actions.indexOf("export async function syncShowMetadata"),
  actions.indexOf("export type InitialMode"),
);
const initializeAction = actions.slice(
  actions.indexOf("export async function initializeShow"),
  actions.indexOf("export async function setEpisodeWatched"),
);
const normalizedControls = controls.replace(/\s+/g, " ");

describe("pre-membership episode refresh", () => {
  it("allows authenticated shared metadata synchronization without membership", () => {
    expect(syncAction).toContain("if (!user)");
    expect(syncAction).toContain("await synchronizeShow(tmdbId, true)");
    expect(syncAction).not.toContain("user_shows");
    expect(syncAction).not.toContain("membership");
  });

  it("does not create a user show", () => {
    expect(syncAction).not.toContain("initialize_user_show");
    expect(syncAction).not.toContain(".insert(");
  });

  it("revalidates and refreshes the route after a successful retry", () => {
    expect(syncAction).toContain("refresh(tmdbId)");
    expect(controls).toContain("if (!response.error) router.refresh()");
  });

  it("keeps retry failures visible without claiming success or refreshing", () => {
    expect(syncAction).toMatch(
      /return\s*\{\s*error:\s*"Episode information could not be loaded\. Please try again\.",?\s*\}/,
    );
    expect(controls).toContain("setResult(response)");
    expect(controls.indexOf("setResult(response)")).toBeLessThan(
      controls.indexOf("if (!response.error) router.refresh()"),
    );
    expect(controls).toContain("<ActionMessage result={result} />");
  });

  it("shows a partial-sync warning and retry while disabling dependent modes", () => {
    expect(normalizedControls).toContain(
      "Episode information could not be loaded.",
    );
    expect(controls).toContain("Retry episode sync");
    expect(controls).toContain("disabled={!hasEpisodeOptions}");
  });

  it("retains already-added refresh wording", () => {
    expect(normalizedControls).toContain(
      'missingEpisodes ? "Retry episode sync" : "Load episode information"',
    );
    expect(normalizedControls).toContain("MetadataRefreshControl");
  });

  it("keeps membership creation inside initial progress submission", () => {
    expect(initializeAction).toContain('supabase.rpc("initialize_user_show"');
    expect(initializeAction).toMatch(/initializeProgress\(\s*selection/);
    expect(initializeAction).toContain('selection.mode === "start"');
  });
});
