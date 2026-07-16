import { describe, expect, it } from "vitest";
import { applyFailureDisplay, ApplyLifecycleTransitionError, safeApplyFailure, ShowEpisodeReconciliationError } from "./apply-error";

describe("Apply error visibility", () => {
  it("stores and returns the sanitized episode reconciliation code", () => {
    expect(safeApplyFailure(new ShowEpisodeReconciliationError())).toMatchObject({ code: "tv_metadata_episode_identity_conflict" });
  });
  it("returns a sanitized lifecycle-transition code", () => {
    expect(safeApplyFailure(new ApplyLifecycleTransitionError())).toMatchObject({ code: "apply_resume_transition_failed" });
  });
  it("displays the stage-specific failure without database details", () => {
    const message = applyFailureDisplay("tv_metadata_episode_identity_conflict", undefined);
    expect(message).toContain("episode metadata"); expect(message).not.toContain("constraint");
  });
});
