import { describe, expect, it, vi } from "vitest";
import { acceptResolutionSnapshot, createResolutionSnapshotLoader, matchingEta, resolutionRevision, type ResolutionSnapshot } from "./resolution-snapshot";

function snapshot(sequence: number, ids: string[]): ResolutionSnapshot {
  return { revision: String(sequence), sequence, items: ids.map((id) => ({ id, mediaType: id.startsWith("tv") ? "tv" : "movie", sourceTitle: id, matchStatus: id.includes("unmatched") ? "unmatched" : "ambiguous", importMode: "history_only", candidates: [], candidateMetadata: [] })), issues: [], counts: { tv: { ambiguous: 0, unmatched: 0, failed: 0 }, movie: { ambiguous: 0, unmatched: 0, failed: 0 }, openBlocking: ids.length, openInformational: 0 } };
}

describe("live resolution snapshots", () => {
  it("adds new ambiguous TV and unmatched movie items independently", () => {
    const next = acceptResolutionSnapshot(snapshot(1, []), snapshot(2, ["tv-new", "movie-unmatched"]), 1, new Set());
    expect(next.items.map((item) => [item.mediaType, item.matchStatus])).toEqual([["tv", "ambiguous"], ["movie", "unmatched"]]);
  });

  it("does not re-add a successfully resolved item from a newer fetch", () => {
    expect(acceptResolutionSnapshot(snapshot(1, []), snapshot(2, ["tv-resolved", "movie-new"]), 1, new Set(["tv-resolved"])).items.map((item) => item.id)).toEqual(["movie-new"]);
  });

  it("rejects an older response", () => {
    expect(acceptResolutionSnapshot(snapshot(3, ["tv-new"]), snapshot(2, ["movie-old"]), 3, new Set()).items[0]?.id).toBe("tv-new");
  });

  it("uses a revision that changes for relevant counts and timestamps", () => {
    expect(resolutionRevision({ itemUpdatedAt: "a", issueUpdatedAt: "b", unresolvedCount: 1, openIssueCount: 1 })).not.toBe(resolutionRevision({ itemUpdatedAt: "a", issueUpdatedAt: "b", unresolvedCount: 2, openIssueCount: 1 }));
  });

  it("serializes refreshes and preserves the last snapshot after a temporary failure", async () => {
    let resolveFirst: ((value: ResolutionSnapshot) => void) | undefined;
    const fetchSnapshot = vi.fn(() => new Promise<ResolutionSnapshot>((resolve) => { resolveFirst = resolve; })); const onSnapshot = vi.fn(); const onError = vi.fn();
    const loader = createResolutionSnapshotLoader({ fetchSnapshot, onSnapshot, onError }); loader.refresh(); loader.refresh(); loader.refresh(); expect(fetchSnapshot).toHaveBeenCalledOnce();
    resolveFirst?.(snapshot(0, ["tv-new"])); await Promise.resolve(); await Promise.resolve(); expect(fetchSnapshot).toHaveBeenCalledTimes(2); expect(onSnapshot).toHaveBeenCalledOnce(); loader.stop();
  });

  it("aborts quietly on unmount", async () => {
    const onError = vi.fn(); let signal: AbortSignal | undefined; const loader = createResolutionSnapshotLoader({ fetchSnapshot: (nextSignal) => { signal = nextSignal; return new Promise<ResolutionSnapshot>(() => undefined); }, onSnapshot: vi.fn(), onError }); loader.refresh(); loader.stop(); expect(signal?.aborted).toBe(true); expect(onError).not.toHaveBeenCalled();
  });

  it("shows a conservative ETA only from a stable real-time sample window", () => {
    expect(matchingEta([{ at: 0, processed: 0 }, { at: 30_000, processed: 60 }], 120)).toBe("About 1 minute remaining");
    expect(matchingEta([{ at: 0, processed: 0 }, { at: 10_000, processed: 60 }], 120)).toBeNull();
    expect(matchingEta([{ at: 0, processed: 0 }, { at: 30_000, processed: 20 }], 120)).toBeNull();
    expect(matchingEta([{ at: 0, processed: 0 }, { at: 30_000, processed: 60 }], 0)).toBeNull();
  });
});
