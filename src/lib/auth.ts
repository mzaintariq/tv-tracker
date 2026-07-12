const DEFAULT_NEXT_PATH = "/shows";

export const AUTH_NEXT_COOKIE = "tv_tracker_auth_next";

export function sanitizeNextPath(nextPath: string | null | undefined): string {
  if (
    nextPath &&
    nextPath.startsWith("/") &&
    !nextPath.startsWith("//")
  ) {
    return nextPath;
  }

  return DEFAULT_NEXT_PATH;
}

export function resolveRequestOrigin(options: {
  host: string | null;
  proto: string | null;
  fallback?: string;
}): string {
  const { host, proto, fallback = "http://localhost:3000" } = options;

  if (host) {
    return `${proto ?? "http"}://${host}`;
  }

  return fallback;
}

/**
 * Must match an exact Redirect URL allowlist entry.
 * Do not append query params — Supabase rejects them and falls back to Site URL.
 */
export function buildAuthCallbackUrl(origin: string): string {
  return new URL("/auth/callback", origin).toString();
}

export function authNextCookieOptions(origin: string) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge: 60 * 10,
    secure: origin.startsWith("https"),
  };
}

export type LoginErrorCode =
  | "auth_callback_failed"
  | "access_denied"
  | "oauth_error"
  | string;

export function getLoginErrorMessage(
  errorCode: string | null | undefined,
): string | undefined {
  if (!errorCode) {
    return undefined;
  }

  switch (errorCode) {
    case "access_denied":
      return "Google sign-in was cancelled. You can try again or use a magic link.";
    case "auth_callback_failed":
      return "Sign-in failed. Try Continue with Google again, or request a new magic link.";
    case "oauth_error":
      return "Google sign-in could not be completed. Please try again.";
    default:
      return "Sign-in failed. Please try again.";
  }
}

export function mapOAuthCallbackError(
  error: string | null,
): LoginErrorCode {
  if (!error) {
    return "auth_callback_failed";
  }

  if (error === "access_denied") {
    return "access_denied";
  }

  return "oauth_error";
}

/**
 * When Supabase falls back to the Site URL (often production `/`),
 * the auth `code` can land on `/` or `/login` instead of `/auth/callback`.
 */
export function shouldForwardAuthParamsToCallback(
  pathname: string,
  searchParams: Pick<URLSearchParams, "has">,
): boolean {
  if (pathname !== "/" && pathname !== "/login") {
    return false;
  }

  return searchParams.has("code") || searchParams.has("error");
}
