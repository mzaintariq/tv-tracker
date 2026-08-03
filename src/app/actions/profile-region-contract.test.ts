import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("profile region action contract", () => {
  const source = readFileSync("src/app/actions/profile.ts", "utf8");

  it("normalizes and validates against the shared supported list on the server", () => {
    expect(source).toContain("normalizeRegionCode(regionRaw)");
    expect(source).toContain("isSupportedRegionCode(normalized)");
    expect(source).toContain("update({ region })");
  });

  it("scopes the update to the authenticated owner and leaves timezone untouched", () => {
    expect(source).toContain('.eq("id", user.id)');
    const regionAction = source.slice(source.indexOf("export async function updateRegionPreference"));
    expect(regionAction).not.toContain("timezone:");
    expect(regionAction).toContain('revalidatePath("/profile/settings")');
  });
});
