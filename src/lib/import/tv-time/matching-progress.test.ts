import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { ImportMatchingProgress } from "@/components/import/import-matching-progress";
import { automaticMatchingProgress, matchingProgressFromCounts, reconcileMatchingProgress, startMatchingProgressPolling, type MatchingProgressSnapshot } from "./matching-progress";

const items = (...statuses: string[]) => statuses.map((match_status) => ({ match_status }));
type SnapshotCounts = { status: string; total: number; unfinished: number; confirmed: number; needsReview: number; skipped: number };
const snapshot = (overrides: Partial<SnapshotCounts> = {}) => matchingProgressFromCounts({ status: "matching", total: 10, unfinished: 6, confirmed: 2, needsReview: 2, skipped: 0, ...overrides });

describe("automatic matching progress", () => {
  it("starts above zero for durable confirmed mappings", () => {
    expect(automaticMatchingProgress(items("confirmed", "pending", "pending"))).toMatchObject({ processed: 1, percentage: 33 });
  });

  it("counts pending and matching leases as unfinished", () => {
    expect(automaticMatchingProgress(items("pending", "matching", "confirmed"))).toMatchObject({ remaining: 2, processed: 1 });
  });

  it("counts ambiguous and unmatched results as processed", () => {
    expect(automaticMatchingProgress(items("ambiguous", "unmatched", "pending"))).toMatchObject({ processed: 2, needsReview: 2, percentage: 66 });
  });

  it("reaches 100 percent when automatic work is exhausted despite manual review", () => {
    expect(automaticMatchingProgress(items("confirmed", "ambiguous", "unmatched", "failed", "skipped"))).toMatchObject({ processed: 5, remaining: 0, percentage: 100, complete: true, needsReview: 3 });
  });

  it("reconstructs identical progress from the same persisted statuses", () => {
    const persisted = items("confirmed", "ambiguous", "matching", "skipped");
    expect(automaticMatchingProgress([...persisted])).toEqual(automaticMatchingProgress([...persisted]));
  });

  it("renders a zero-item import safely", () => {
    const progress = automaticMatchingProgress([]);
    expect(progress).toMatchObject({ total: 0, processed: 0, remaining: 0, percentage: 100, complete: true });
    expect(renderToStaticMarkup(createElement(ImportMatchingProgress, { importId: "import", initialProgress: progress }))).toContain("0 of 0 checked");
  });

  it("renders accessible persisted counts and progress values", () => {
    const markup = renderToStaticMarkup(createElement(ImportMatchingProgress, { importId: "import", initialProgress: automaticMatchingProgress(items("confirmed", "ambiguous", "pending", "matching")) }));
    expect(markup).toContain('role="progressbar"');
    expect(markup).toContain('aria-valuemin="0"');
    expect(markup).toContain('aria-valuemax="100"');
    expect(markup).toContain('aria-valuenow="50"');
    expect(markup).toContain('aria-valuetext="2 of 4 checked"');
    expect(markup).toContain("2 remaining");
    expect(markup).toContain("need your review");
    expect(markup).toContain("all normalized media items");
    expect(markup).not.toContain('aria-live="polite"');
    expect(markup).toContain("Automatic matching started.");
  });

  it("updates stale counts serially without overlapping requests", async () => {
    let resolveFirst: ((value: MatchingProgressSnapshot) => void) | undefined;
    const fetchProgress=vi.fn(()=>new Promise<MatchingProgressSnapshot>((resolve)=>{resolveFirst=resolve;}));
    const poller=startMatchingProgressPolling({fetchProgress,onProgress:vi.fn(),shouldContinue:()=>true,schedule:vi.fn(()=>1 as unknown as ReturnType<typeof setTimeout>)});
    poller.refresh(); poller.refresh();
    expect(fetchProgress).toHaveBeenCalledOnce();
    resolveFirst?.(snapshot({unfinished:5})); await Promise.resolve(); await Promise.resolve();
    expect(fetchProgress).toHaveBeenCalledTimes(2);
    poller.stop();
  });

  it("stops polling when no pending or matching work remains", async () => {
    const schedule=vi.fn(); const onProgress=vi.fn();
    startMatchingProgressPolling({fetchProgress:async()=>snapshot({status:"awaiting_resolution",unfinished:0}),onProgress,shouldContinue:(next)=>next.status==="matching"&&next.remaining>0,schedule});
    await Promise.resolve(); await Promise.resolve();
    expect(onProgress).toHaveBeenCalledOnce(); expect(schedule).not.toHaveBeenCalled();
  });

  it("continues with review items while automatic work remains and retries polling failures", async () => {
    const scheduled:Array<()=>void>=[]; const fetchProgress=vi.fn<()=>Promise<MatchingProgressSnapshot>>().mockRejectedValueOnce(new Error("temporary")).mockResolvedValue(snapshot({unfinished:4,needsReview:5}));
    const poller=startMatchingProgressPolling({fetchProgress,onProgress:vi.fn(),onError:vi.fn(),shouldContinue:(next)=>next.remaining>0,schedule:(callback)=>{scheduled.push(callback);return 1 as unknown as ReturnType<typeof setTimeout>;}});
    await Promise.resolve(); await Promise.resolve(); expect(scheduled).toHaveLength(1); scheduled[0](); await Promise.resolve(); await Promise.resolve(); expect(fetchProgress).toHaveBeenCalledTimes(2); expect(scheduled).toHaveLength(2); poller.stop();
  });

  it("cancels scheduled polling and ignores stale decreasing responses", async () => {
    const scheduled:Array<()=>void>=[]; const fetchProgress=vi.fn(async()=>snapshot()); const poller=startMatchingProgressPolling({fetchProgress,onProgress:vi.fn(),shouldContinue:()=>true,schedule:(callback)=>{scheduled.push(callback);return 1 as unknown as ReturnType<typeof setTimeout>;}});
    await Promise.resolve(); await Promise.resolve(); poller.stop(); scheduled[0]?.(); expect(fetchProgress).toHaveBeenCalledOnce();
    expect(reconcileMatchingProgress(snapshot({unfinished:3}),snapshot({unfinished:5}))).toEqual(snapshot({unfinished:3}));
  });
});
