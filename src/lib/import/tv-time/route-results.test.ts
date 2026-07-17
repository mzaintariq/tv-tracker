import { describe, expect, it } from "vitest";
import { ImportRouteReadError, requireImportList, requireImportProgress, requireImportSession } from "./route-results";

describe("import route read distinctions", () => {
  it("distinguishes an empty import list from a failed query", () => {
    expect(requireImportList({ data: [], error: null })).toEqual([]);
    expect(() => requireImportList({ data: null, error: {} })).toThrow(ImportRouteReadError);
  });

  it("preserves populated import lists", () => {
    expect(requireImportList({ data: [{ id: "import" }], error: null })).toEqual([{ id: "import" }]);
  });

  it("distinguishes a missing or inaccessible session from a failed query", () => {
    expect(requireImportSession({ data: null, error: null })).toBeNull();
    expect(() => requireImportSession({ data: null, error: {} })).toThrow("import_session_read_failed");
  });

  it("rejects failed Apply progress and preserves successful progress", () => {
    expect(requireImportProgress({ data: { status: "ready" }, error: null })).toEqual({ status: "ready" });
    expect(() => requireImportProgress({ data: null, error: {} })).toThrow("import_progress_read_failed");
  });
});
