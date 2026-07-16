import { describe, expect, it, vi } from "vitest";
import {
  claimMatchingAutoStart,
  classifyMatchingItems,
  MatchingCoordinatorError,
  mutationError,
  runMatchingCoordinator,
  shouldAutoStartMatching,
  shouldNavigateAfterDelete,
} from "./ui-state";

describe("TV Time matching UI state", () => {
  it("auto-starts the existing coordinator for a matching import", async () => {
    const request = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify({ claimed: 1 }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ claimed: 0 }), { status: 200 }));

    expect(shouldAutoStartMatching("matching")).toBe(true);
    await runMatchingCoordinator("import-1", request);
    expect(request).toHaveBeenCalledTimes(2);
  });

  it("does not claim a duplicate auto-start after rerender", () => {
    const attemptedImport = { current: null };
    expect(claimMatchingAutoStart(attemptedImport, "import-1", true)).toBeInstanceOf(AbortController);
    expect(claimMatchingAutoStart(attemptedImport, "import-1", true)).toBeNull();
  });

  it("continues into another bounded run while claims remain", async () => {
    let calls = 0;
    const request = vi.fn<typeof fetch>().mockImplementation(() => {
      calls += 1;
      return Promise.resolve(new Response(JSON.stringify({ claimed: calls <= 20 ? 1 : 0, status: calls <= 20 ? "matching" : "ready" }), { status: 200 }));
    });

    await runMatchingCoordinator("import-1", request, {
      continueWhilePending: true,
      yieldBetweenRuns: () => Promise.resolve(),
    });
    expect(request).toHaveBeenCalledTimes(21);
  });

  it("stops as soon as no pending work can be claimed", async () => {
    const request = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify({ claimed: 1, status: "matching" }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ claimed: 1, status: "awaiting_resolution" }), { status: 200 }));

    await runMatchingCoordinator("import-1", request, { continueWhilePending: true });
    expect(request).toHaveBeenCalledTimes(2);
  });

  it("reports every successful matching batch for immediate progress reconciliation", async () => {
    const onBatchComplete=vi.fn(); const request=vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({claimed:0,status:"matching"}),{status:200}));
    await runMatchingCoordinator("import-1",request,{onBatchComplete});
    expect(onBatchComplete).toHaveBeenCalledOnce();
  });

  it("allows the same coordinator to be retried manually after an automatic failure", async () => {
    const failedRequest = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 500 }));
    const retryRequest = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ claimed: 0 }), { status: 200 }));

    await expect(runMatchingCoordinator("import-1", failedRequest, { retryDelay: () => Promise.resolve() })).rejects.toBeInstanceOf(MatchingCoordinatorError);
    await expect(runMatchingCoordinator("import-1", retryRequest)).resolves.toBeUndefined();
    expect(retryRequest).toHaveBeenCalledOnce();
  });

  it("surfaces a real coordinator failure and preserves retry", async () => {
    const failedRequest = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 400 }));
    await expect(runMatchingCoordinator("import-1", failedRequest)).rejects.toMatchObject({ code: "matching_http_400" });
    const retryRequest = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ claimed: 0, status: "ready" }), { status: 200 }));
    await expect(runMatchingCoordinator("import-1", retryRequest)).resolves.toBeUndefined();
  });

  it("treats lifecycle cancellation as a quiet stop", async () => {
    const controller = new AbortController();
    const request = vi.fn<typeof fetch>().mockImplementation(async () => {
      controller.abort();
      throw new DOMException("Aborted", "AbortError");
    });
    await expect(runMatchingCoordinator("import-1", request, { signal: controller.signal })).resolves.toBeUndefined();
  });

  it("bounds transient retries to two retries", async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 503 }));
    await expect(runMatchingCoordinator("import-1", request, { retryDelay: () => Promise.resolve() })).rejects.toMatchObject({ code: "matching_http_503" });
    expect(request).toHaveBeenCalledTimes(3);
  });

  it("exposes Confirm and Skip errors", () => {
    expect(mutationError({ error: "This item is busy.", code: "item_busy" })).toBe("This item is busy.");
  });

  it("does not navigate after Delete failure", () => {
    expect(shouldNavigateAfterDelete({ error: "Import is busy.", code: "import_busy" })).toBe(false);
  });

  it("navigates only after successful Delete", () => {
    expect(shouldNavigateAfterDelete({ success: "Deleted." })).toBe(true);
  });

  it("classifies never-attempted and leased items as matching or pending", () => {
    const items = [{ match_status: "pending" }, { match_status: "matching" }];
    const result = classifyMatchingItems(items);
    expect(result.pending).toEqual(items);
    expect(result.needsResolution).toEqual([]);
  });

  it("classifies processed ambiguous, unmatched, and failed items as needing resolution", () => {
    const items = [
      { match_status: "ambiguous" },
      { match_status: "unmatched" },
      { match_status: "failed" },
      { match_status: "confirmed" },
    ];
    const result = classifyMatchingItems(items);
    expect(result.pending).toEqual([]);
    expect(result.needsResolution).toEqual(items.slice(0, 3));
  });
});
