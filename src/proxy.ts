import { type NextRequest, NextResponse } from "next/server";

import { shouldForwardAuthParamsToCallback } from "@/lib/auth";
import { isProtectedPath, updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  const { supabaseResponse, user } = await updateSession(request);
  const { pathname } = request.nextUrl;

  // Supabase may send the OAuth/magic-link code to the Site URL (`/` or `/login`)
  // when the requested redirectTo is not allowlisted. Forward it to the callback.
  if (shouldForwardAuthParamsToCallback(pathname, request.nextUrl.searchParams)) {
    const callbackUrl = request.nextUrl.clone();
    callbackUrl.pathname = "/auth/callback";
    return NextResponse.redirect(callbackUrl);
  }

  if (!user && isProtectedPath(pathname)) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (user && (pathname === "/login" || pathname === "/")) {
    const showsUrl = request.nextUrl.clone();
    showsUrl.pathname = "/shows";
    showsUrl.search = "";
    return NextResponse.redirect(showsUrl);
  }

  if (!user && pathname === "/") {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    return NextResponse.redirect(loginUrl);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
