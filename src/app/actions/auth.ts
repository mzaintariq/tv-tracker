"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

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

  if (host) {
    return `${proto}://${host}`;
  }

  return "http://localhost:3000";
}

export async function signInWithMagicLink(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const nextPath = String(formData.get("next") ?? "/shows");

  if (!isValidEmail(email)) {
    return { error: "Enter a valid email address." };
  }

  const supabase = await createClient();
  const origin = await getRequestOrigin();
  const redirectTo = new URL("/auth/callback", origin);
  redirectTo.searchParams.set(
    "next",
    nextPath.startsWith("/") && !nextPath.startsWith("//")
      ? nextPath
      : "/shows",
  );

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: redirectTo.toString(),
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
