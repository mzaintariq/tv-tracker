import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("movie favourites decision interaction", () => {
  const controls = readFileSync("src/components/import/import-controls.tsx", "utf8");
  const actions = readFileSync("src/app/actions/imports.ts", "utf8");

  it("refreshes only after a successful decision and displays its result", () => {
    const decision = controls.slice(controls.indexOf("export function IssueDecision"), controls.indexOf("export function SkipCoordinateButton"));
    expect(decision).toContain("if (result.error)");
    expect(decision.indexOf("if (result.error)")).toBeLessThan(decision.indexOf("router.refresh()"));
    expect(decision).toContain('role="status"');
    expect(actions).toContain("Movie favourites will be imported.");
    expect(actions).toContain("Movie favourites will not be imported.");
  });

  it("surfaces failures and prevents duplicate submissions", () => {
    const decision = controls.slice(controls.indexOf("export function IssueDecision"), controls.indexOf("export function SkipCoordinateButton"));
    expect(decision).toContain("pendingRef.current");
    expect(decision).toContain("disabled={pending}");
    expect(decision).toContain('role="alert"');
    expect(actions).toContain("This decision could not be saved. Refresh and try again.");
  });
});
