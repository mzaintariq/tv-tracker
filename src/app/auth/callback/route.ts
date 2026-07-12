import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  AUTH_NEXT_COOKIE,
  mapOAuthCallbackError,
  sanitizeNextPath,
} from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const oauthError = searchParams.get("error");
  const cookieStore = await cookies();
  const next = sanitizeNextPath(
    searchParams.get("next") ?? cookieStore.get(AUTH_NEXT_COOKIE)?.value,
  );

  const clearAuthNextCookie = (response: NextResponse) => {
    response.cookies.set(AUTH_NEXT_COOKIE, "", {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });
    return response;
  };

  if (oauthError) {
    const loginUrl = new URL("/login", origin);
    loginUrl.searchParams.set("error", mapOAuthCallbackError(oauthError));
    return clearAuthNextCookie(NextResponse.redirect(loginUrl));
  }

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return clearAuthNextCookie(
        NextResponse.redirect(new URL(next, origin)),
      );
    }
  }

  const loginUrl = new URL("/login", origin);
  loginUrl.searchParams.set("error", "auth_callback_failed");
  return clearAuthNextCookie(NextResponse.redirect(loginUrl));
}
