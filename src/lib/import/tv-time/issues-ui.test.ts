import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/app/actions/imports", () => ({
  confirmImportCandidate: vi.fn(), deleteImportSession: vi.fn(), forgetAllTvTimeImportData: vi.fn(),
  resolveImportIssue: vi.fn(), setImportPaused: vi.fn(), skipAllUnresolvedImportItems: vi.fn(), skipImportItem: vi.fn(), skipMissingCoordinateIssues: vi.fn(),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }) }));

import { ImportIssuesDisclosure } from "@/components/import/import-issues-disclosure";
import { buildImportIssueDisplayModel, type ImportIssueForDisplay } from "./issues-ui";

const importId = "00000000-0000-0000-0000-000000000001";

function issue(id: string, issueType: string, status: string, isBlocking = true): ImportIssueForDisplay {
  return { id, importItemId: null, issue_type: issueType, status, is_blocking: isBlocking, sourceTitle: `Title ${id}`, mediaType: ["ambiguous_media","unmatched_media"].includes(issueType) ? "tv" : undefined };
}

function render(issues: ImportIssueForDisplay[], props: Partial<Parameters<typeof ImportIssuesDisclosure>[0]> = {}): string {
  return renderToStaticMarkup(createElement(ImportIssuesDisclosure, { importId, issues, ...props }));
}

describe("import issue disclosure model", () => {
  it("places open blocking issues in Needs attention and opens automatically", () => {
    const markup = render([issue("1", "movie_favourites_confirmation", "open")]);
    expect(markup).toContain("Needs attention (1)");
    expect(markup).toContain('aria-expanded="true"');
    expect(markup).toContain("Blocking");
  });

  it("groups repeated completed issues with accurate counts", () => {
    const model = buildImportIssueDisplayModel([
      issue("1", "ambiguous_media", "skipped"),
      issue("2", "ambiguous_media", "skipped"),
      issue("3", "ambiguous_media", "resolved"),
    ]);
    expect(model.completedGroups.map((group) => [group.key, group.issues.length])).toEqual([
      ["media:resolved:tv", 1],
      ["media:skipped:tv", 2],
    ]);
    expect(model).toMatchObject({ resolved: 1, skipped: 2 });
  });

  it("keeps completed issues collapsed by default", () => {
    const markup = render([issue("1", "ambiguous_media", "resolved")], { initialExpanded: true });
    expect(markup).toContain("Resolved or skipped (1)");
    expect(markup).not.toContain("Resolved TV shows — 1");
  });

  it("reveals the correct completed group only when expanded", () => {
    const markup = render([
      issue("1", "ambiguous_media", "resolved"),
      issue("2", "ambiguous_media", "resolved"),
      issue("3", "unmatched_media", "skipped"),
    ], { initialExpanded: true, initialCompletedExpanded: true, initialExpandedGroups: ["media:resolved:tv"] });
    expect(markup).toContain("Resolved TV shows — 2");
    expect(markup.match(/TV show · Matched/g)).toHaveLength(2);
    expect(markup).toContain("Skipped TV shows — 1");
  });

  it("does not display completed historical blockers as active Blocking badges", () => {
    const markup = render([issue("1", "missing_episode_coordinate", "skipped")], { initialExpanded: true, initialCompletedExpanded: true, initialExpandedGroups: ["missing_episode_coordinate:skipped"] });
    expect(markup).not.toContain(">Blocking<");
  });

  it("retains existing Confirm and Decline actions", () => {
    const markup = render([issue("1", "movie_favourites_confirmation", "open")]);
    expect(markup).toContain(">Confirm<");
    expect(markup).toContain(">Decline<");
  });

  it("uses keyboard-native buttons with disclosure state", () => {
    const markup = render([issue("1", "movie_favourites_confirmation", "open")]);
    expect(markup).toContain("<button");
    expect(markup).toContain('aria-expanded="true"');
    expect(markup).toContain('aria-controls="import-issues-content"');
  });

  it("omits empty groups and the entire empty section", () => {
    expect(render([])).toBe("");
    const markup = render([issue("1", "aggregate_count_discrepancy", "open", false)]);
    expect(markup).not.toContain("Resolved or skipped");
  });

  it("shows a missing coordinate as a durable non-blocking exclusion without actions", () => {
    const row = { ...issue("c", "missing_episode_coordinate", "skipped", false), importItemId: "show", sourceTitle: "Example Show", seasonNumber: 2, episodeNumber: 14 };
    const markup = render([row], { initialExpanded: true, initialCompletedExpanded: true, initialExpandedGroups: ["coordinates:skipped", "excluded-show:show"] });
    expect(markup).toContain("Example Show — Season 2, Episode 14");
    expect(markup).toContain("This individual history record will not be imported");
    expect(markup).toContain("all other successfully matched episode history will still be imported");
    expect(markup).not.toContain("Skip this episode record");
    expect(markup).not.toContain("Blocking");
    expect(markup).not.toContain("Needs attention");
  });

  it("explains Season 0 exclusions without making them actionable", () => {
    const row = { ...issue("s", "missing_episode_coordinate", "skipped", false), importItemId: "show", sourceTitle: "Example Show", seasonNumber: 0, episodeNumber: 1 };
    const markup = render([row], { initialExpanded: true, initialCompletedExpanded: true, initialExpandedGroups: ["coordinates:skipped", "excluded-show:show"] });
    expect(markup).toContain("Specials are also excluded from normal progress");
    expect(markup).not.toContain("Skip all");
  });

  it("groups excluded coordinates by alphabetically sorted show and sorts coordinates", () => {
    const issues = [
      { ...issue("b2", "missing_episode_coordinate", "skipped", false), importItemId: "b", sourceTitle: "Zulu Show", seasonNumber: 2, episodeNumber: 3 },
      { ...issue("a2", "missing_episode_coordinate", "skipped", false), importItemId: "a", sourceTitle: "Alpha Show", seasonNumber: 2, episodeNumber: 1 },
      { ...issue("a1", "missing_episode_coordinate", "skipped", false), importItemId: "a", sourceTitle: "Alpha Show", seasonNumber: 0, episodeNumber: 4 },
    ];
    const markup = render(issues, { initialExpanded: true, initialCompletedExpanded: true, initialExpandedGroups: ["coordinates:skipped", "excluded-show:a"] });
    expect(markup).toContain("Episode records not imported — 3");
    expect(markup).toContain("Alpha Show — 2 records");
    expect(markup).toContain("Zulu Show — 1 record");
    expect(markup.indexOf("Alpha Show — 2 records")).toBeLessThan(markup.indexOf("Zulu Show — 1 record"));
    expect(markup.indexOf("Alpha Show — Season 0, Episode 4")).toBeLessThan(markup.indexOf("Alpha Show — Season 2, Episode 1"));
  });

  it("shows selected TMDB details for completed resolved media", () => {
    const row = { ...issue("r", "ambiguous_media", "resolved"), sourceTitle: "Source Show", selectedTmdbId: 48891, selectedCandidate: { id: 48891, title: "Selected Show", year: 2013, posterPath: null } };
    const markup = render([row], { initialExpanded: true, initialCompletedExpanded: true, initialExpandedGroups: ["media:resolved:tv"] });
    expect(markup).toContain("Source Show"); expect(markup).toContain("Matched to Selected Show (2013) · TMDB 48891");
  });

  it("omits duplicate open media issue rows from Needs attention", () => {
    const markup = render([issue("m", "ambiguous_media", "open")]);
    expect(markup).not.toContain("Needs attention");
    expect(markup).not.toContain("Several possible matches");
  });

  it("places aggregate discrepancies under informational notices", () => {
    const row = { ...issue("n", "aggregate_count_discrepancy", "open", false), detailedCount: 10, cachedCount: 12 };
    const markup = render([row], { initialExpanded: true });
    expect(markup).toContain("Information and notices (1)"); expect(markup).toContain("12 cached movies"); expect(markup).toContain("10 detailed movie records"); expect(markup).toContain("No action is required");
  });

  it("never renders the import-level movie favourites decision as an anonymous TV show", () => {
    const markup = render([issue("f", "movie_favourites_confirmation", "open")]);
    expect(markup).toContain("Movie favourites decision");
    expect(markup).toContain("TV Time’s export does not identify which cached movies were favourites");
    expect(markup).toContain("This decision must be made before the import can be applied");
    expect(markup).not.toContain("TV show · Open");
  });

  it.each(["accepted", "declined"])("shows a completed movie favourites decision as %s", (status) => {
    const markup = render([issue(`decision-${status}`, "movie_favourites_confirmation", status)], { initialExpanded: true, initialCompletedExpanded: true });
    expect(markup).toContain(`Movie favourites decision — ${status === "accepted" ? "Accepted" : "Declined"}`);
    expect(markup).not.toContain("Needs attention");
    expect(markup).not.toContain(">Blocking<");
  });
});
