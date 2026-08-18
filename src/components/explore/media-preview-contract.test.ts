import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Explore Quick View interaction and accessibility", () => {
  const grid = readFileSync("src/components/explore/media-grid.tsx", "utf8");
  const shell = readFileSync("src/components/explore/media-preview-shell.tsx", "utf8");
  const preview = readFileSync("src/components/explore/media-preview.tsx", "utf8");

  it("uses native history only for preview so q/type remain untouched", () => {
    expect(grid).toContain('url.searchParams.set("preview"');
    expect(grid).toContain('url.searchParams.delete("preview")');
    expect(grid).toContain("window.history.pushState");
    expect(grid).toContain("window.history.back()");
    expect(grid).not.toContain('searchParams.delete("q")');
    expect(grid).not.toContain('searchParams.delete("type")');
  });

  it("implements dialog semantics, focus containment, inertness, Escape, and scroll lock", () => {
    expect(shell).toContain('role="dialog"');
    expect(shell).toContain('aria-modal="true"');
    expect(shell).toContain('aria-labelledby="media-preview-title"');
    expect(shell).toContain('event.key === "Escape"');
    expect(shell).toContain('event.key !== "Tab"');
    expect(shell).toContain("element.inert = true");
    expect(shell).toContain('document.body.style.overflow = "hidden"');
    expect(shell).toContain("motion-safe:animate");
  });

  it("reuses existing add/setup actions and full-detail handoff", () => {
    expect(preview).toContain('addToLibrary("movie", previewKey.tmdbId)');
    expect(preview).toContain("prepareShowProgress(previewKey.tmdbId)");
    expect(preview).toContain("Add show & set progress");
    expect(preview).toContain("Open full details");
    expect(preview).toContain("disabled={pending}");
  });
});
