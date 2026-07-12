import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { getPublicEnv } from "@/lib/env";
import type { Database } from "@/types/database";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const { NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY } =
    getPublicEnv();

  const supabase = createServerClient<Database>(
    NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  // Do not add logic between createServerClient and getUser().
  // A simple mistake can make it very hard to debug session issues.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { supabaseResponse, user };
}

export function isProtectedPath(pathname: string): boolean {
  return (
    pathname.startsWith("/shows") ||
    pathname.startsWith("/movies") ||
    pathname.startsWith("/explore") ||
    pathname.startsWith("/profile")
  );
}

export function isAuthPath(pathname: string): boolean {
  return pathname === "/login" || pathname.startsWith("/auth/");
}
