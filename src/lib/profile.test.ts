import { describe, expect, it } from "vitest";

import {
  displayNameFromEmail,
  isThemePreference,
  normalizeDisplayName,
} from "@/lib/profile";
import {
  isAuthPath,
  isProtectedPath,
} from "@/lib/supabase/proxy";

describe("normalizeDisplayName", () => {
  it("trims and collapses whitespace", () => {
    expect(normalizeDisplayName("  Ada   Lovelace ")).toBe("Ada Lovelace");
  });

  it("rejects empty names", () => {
    expect(normalizeDisplayName("   ")).toBeNull();
  });

  it("rejects names longer than 80 characters", () => {
    expect(normalizeDisplayName("a".repeat(81))).toBeNull();
  });
});

describe("isThemePreference", () => {
  it("accepts supported themes", () => {
    expect(isThemePreference("light")).toBe(true);
    expect(isThemePreference("dark")).toBe(true);
    expect(isThemePreference("system")).toBe(true);
  });

  it("rejects unsupported themes", () => {
    expect(isThemePreference("neon")).toBe(false);
  });
});

describe("displayNameFromEmail", () => {
  it("uses the local part of an email", () => {
    expect(displayNameFromEmail("ada@example.com")).toBe("ada");
  });

  it("falls back when email is missing", () => {
    expect(displayNameFromEmail(null)).toBe("Viewer");
  });
});

describe("proxy path helpers", () => {
  it("detects protected app routes", () => {
    expect(isProtectedPath("/shows")).toBe(true);
    expect(isProtectedPath("/movies/123")).toBe(true);
    expect(isProtectedPath("/login")).toBe(false);
  });

  it("detects auth routes", () => {
    expect(isAuthPath("/login")).toBe(true);
    expect(isAuthPath("/auth/callback")).toBe(true);
    expect(isAuthPath("/shows")).toBe(false);
  });
});
