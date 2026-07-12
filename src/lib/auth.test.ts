import { describe, expect, it } from "vitest";

import {
  buildAuthCallbackUrl,
  getLoginErrorMessage,
  mapOAuthCallbackError,
  resolveRequestOrigin,
  sanitizeNextPath,
  shouldForwardAuthParamsToCallback,
} from "@/lib/auth";

describe("sanitizeNextPath", () => {
  it("keeps safe relative paths", () => {
    expect(sanitizeNextPath("/shows")).toBe("/shows");
    expect(sanitizeNextPath("/movies/123")).toBe("/movies/123");
  });

  it("rejects absolute or protocol-relative URLs", () => {
    expect(sanitizeNextPath("https://evil.example")).toBe("/shows");
    expect(sanitizeNextPath("//evil.example")).toBe("/shows");
    expect(sanitizeNextPath(undefined)).toBe("/shows");
  });
});

describe("resolveRequestOrigin", () => {
  it("builds an origin from forwarded host headers", () => {
    expect(
      resolveRequestOrigin({
        host: "tv-tracker.vercel.app",
        proto: "https",
      }),
    ).toBe("https://tv-tracker.vercel.app");
  });

  it("falls back to localhost when host is missing", () => {
    expect(
      resolveRequestOrigin({
        host: null,
        proto: null,
      }),
    ).toBe("http://localhost:3000");
  });
});

describe("buildAuthCallbackUrl", () => {
  it("returns an exact callback URL without query params", () => {
    expect(buildAuthCallbackUrl("http://localhost:3000")).toBe(
      "http://localhost:3000/auth/callback",
    );
    expect(buildAuthCallbackUrl("https://tracktv.vercel.app")).toBe(
      "https://tracktv.vercel.app/auth/callback",
    );
  });
});

describe("getLoginErrorMessage", () => {
  it("returns friendly messages for known auth errors", () => {
    expect(getLoginErrorMessage("access_denied")).toContain("cancelled");
    expect(getLoginErrorMessage("auth_callback_failed")).toContain(
      "Continue with Google",
    );
    expect(getLoginErrorMessage("oauth_error")).toContain("Google sign-in");
  });

  it("returns undefined when no error is present", () => {
    expect(getLoginErrorMessage(undefined)).toBeUndefined();
  });
});

describe("mapOAuthCallbackError", () => {
  it("maps provider errors to login error codes", () => {
    expect(mapOAuthCallbackError("access_denied")).toBe("access_denied");
    expect(mapOAuthCallbackError("server_error")).toBe("oauth_error");
    expect(mapOAuthCallbackError(null)).toBe("auth_callback_failed");
  });
});

describe("shouldForwardAuthParamsToCallback", () => {
  it("forwards auth codes that landed on / or /login", () => {
    expect(
      shouldForwardAuthParamsToCallback(
        "/login",
        new URLSearchParams("code=abc"),
      ),
    ).toBe(true);
    expect(
      shouldForwardAuthParamsToCallback("/", new URLSearchParams("code=abc")),
    ).toBe(true);
    expect(
      shouldForwardAuthParamsToCallback(
        "/login",
        new URLSearchParams("error=access_denied"),
      ),
    ).toBe(true);
  });

  it("does not forward unrelated routes or params", () => {
    expect(
      shouldForwardAuthParamsToCallback("/login", new URLSearchParams()),
    ).toBe(false);
    expect(
      shouldForwardAuthParamsToCallback(
        "/shows",
        new URLSearchParams("code=abc"),
      ),
    ).toBe(false);
  });
});
