import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Apply route preflight contract", () => {
  it("rejects a wrong fingerprint before entering Apply", () => {
    const source = readFileSync("src/app/api/imports/[importId]/apply/route.ts", "utf8");
    expect(source.indexOf("fingerprint_mismatch")).toBeLessThan(source.indexOf("const result = await applyNormalizedImport"));
  });
  it("logs one sanitized structured Apply diagnostic without raw source fields", () => {
    const source = readFileSync("src/app/api/imports/[importId]/apply/route.ts", "utf8"); const log = source.slice(source.indexOf('event: "tv_time_apply_paused"'), source.indexOf("return NextResponse.json", source.indexOf('event: "tv_time_apply_paused"')));
    for (const field of ["stage", "category", "safeCode", "retryable", "correlationId", "progress"]) expect(log).toContain(field);
    for (const forbidden of ["sourceTitle", "tmdbId", "userId", "importItemId", "coordinates", "watchedAt", "token", "payload", "stack"]) expect(log).not.toContain(forbidden);
  });
});
