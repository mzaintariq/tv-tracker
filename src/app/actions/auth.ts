"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import {
  AUTH_NEXT_COOKIE,
  authNextCookieOptions,
  buildAuthCallbackUrl,
  resolveRequestOrigin,
  sanitizeNextPath,
} from "@/lib/auth";
import { isValidEmail } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export type AuthActionState = {
  error?: string;
  success?: string;
};

async function getRequestOrigin(): Promise<string> {
  const headerStore = await headers();
  const host =
    headerStore.get("x-forwarded-host") ?? headerStore.get("host") ?? null;
  const proto = headerStore.get("x-forwarded-proto") ?? "http";

  return resolveRequestOrigin({ host, proto });
}

async function rememberPostAuthPath(
  nextPath: string,
  origin: string,
): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(
    AUTH_NEXT_COOKIE,
    sanitizeNextPath(nextPath),
    authNextCookieOptions(origin),
  );
}

export async function signInWithGoogle(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const nextPath = sanitizeNextPath(String(formData.get("next") ?? "/shows"));
  const supabase = await createClient();
  const origin = await getRequestOrigin();
  const redirectTo = buildAuthCallbackUrl(origin);

  await rememberPostAuthPath(nextPath, origin);

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo,
    },
  });

  if (error) {
    return {
      error:
        "Google sign-in could not be started. Please try again, or use a magic link.",
    };
  }

  if (!data.url) {
    return {
      error:
        "Google sign-in could not be started. Please try again, or use a magic link.",
    };
  }

  redirect(data.url);
}

export async function signInWithMagicLink(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const nextPath = sanitizeNextPath(String(formData.get("next") ?? "/shows"));

  if (!isValidEmail(email)) {
    return { error: "Enter a valid email address." };
  }

  const supabase = await createClient();
  const origin = await getRequestOrigin();
  const redirectTo = buildAuthCallbackUrl(origin);

  await rememberPostAuthPath(nextPath, origin);

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: redirectTo,
    },
  });

  if (error) {
    return { error: error.message };
  }

  return {
    success: "Check your email for a magic link to continue.",
  };
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
