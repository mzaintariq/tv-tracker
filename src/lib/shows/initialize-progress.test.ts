import { describe, expect, it, vi } from "vitest";
import { initializeProgress } from "@/lib/shows/initialize-progress";

describe("initial show submission", () => {
  it("submits Start from Season 1, Episode 1 without episode synchronization when shared metadata exists", async () => {
    const synchronize = vi.fn().mockRejectedValue(new Error("episode synchronization unavailable"));
    const initializeMembership = vi.fn().mockResolvedValue({ error: null });

    await expect(initializeProgress({ mode: "start" }, "cached-media-id", synchronize, initializeMembership)).resolves.toEqual({ failedSeasons: [] });
    expect(synchronize).not.toHaveBeenCalled();
    expect(initializeMembership).toHaveBeenCalledWith("cached-media-id");
  });

  it("surfaces membership initialization failure", async () => {
    const initializeMembership = vi.fn().mockResolvedValue({ error: "Could not add show." });
    await expect(initializeProgress({ mode: "start" }, "cached-media-id", vi.fn(), initializeMembership)).resolves.toEqual({ error: "Could not add show." });
  });
});
