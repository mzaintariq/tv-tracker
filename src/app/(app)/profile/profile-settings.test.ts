import { readFileSync, existsSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Phase 9E.1 profile and settings separation", () => {
  const profile = readFileSync("src/app/(app)/profile/page.tsx", "utf8");
  const settings = readFileSync("src/app/(app)/profile/settings/page.tsx", "utf8");
  const form = readFileSync("src/components/profile/profile-form.tsx", "utf8");
  const theme = readFileSync("src/components/profile/theme-selector.tsx", "utf8");
  const actions = readFileSync("src/app/actions/profile.ts", "utf8");

  it("keeps Profile focused on overview and streamed statistics", () => {
    expect(profile).toContain('href="/profile/settings"');
    expect(profile).toContain("Overview");
    expect(profile).toContain("<Suspense");
    expect(profile).toContain("ProfileStatistics");
    expect(profile).not.toContain("ProfileForm");
    expect(profile).not.toContain("ThemeSelector");
    expect(profile).not.toContain('href="/api/export"');
    expect(profile).not.toContain("/profile/import");
    expect(profile).not.toContain("SignOutButton");
  });

  it("moves account management tools onto Settings", () => {
    expect(settings).toContain("ProfileForm");
    expect(settings).toContain("ThemeSelector");
    expect(settings).toContain('href="/api/export"');
    expect(settings).toContain('href="/profile/import"');
    expect(settings).toContain("SignOutButton");
    expect(settings).toContain("Account and data");
    expect(settings).not.toContain("StatisticsSummary");
    expect(settings).not.toContain("loadProfilePageData");
  });

  it("separates display-name saves from immediate theme persistence", () => {
    expect(form).toContain('name="display_name"');
    expect(form).not.toContain('name="theme"');
    expect(form).not.toContain("useTheme");
    expect(theme).toContain('type="radio"');
    expect(theme).toContain("System");
    expect(theme).toContain("Light");
    expect(theme).toContain("Dark");
    expect(theme).toContain("updateThemePreference");
    expect(theme).toContain("setTheme(previousTheme)");
    expect(actions).toContain("export async function updateThemePreference");
    expect(actions).toContain('update({ theme })');
    expect(actions).toContain('update({\n      display_name: displayName,\n    })');
  });
});

describe("Phase 9E.1 browser favicon branding", () => {
  it("removes the default App Router favicon and publishes TrackTV icons", () => {
    expect(existsSync("src/app/favicon.ico")).toBe(false);
    expect(existsSync("src/app/icon.png")).toBe(true);
    const metadata = readFileSync("src/lib/pwa/metadata.ts", "utf8");
    expect(metadata).toContain('/icons/tracktv-192.png');
    expect(metadata).toContain('/icons/tracktv-512.png');
    expect(metadata).toContain('/icons/apple-touch-icon-180.png');
  });
});
