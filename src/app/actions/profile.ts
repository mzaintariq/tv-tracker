"use server";

import { revalidatePath } from "next/cache";

import {
  isThemePreference,
  normalizeDisplayName,
  THEME_COOKIE_NAME,
  type ThemePreference,
} from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";

export type ProfileActionState = {
  error?: string;
  success?: string;
};

export type ThemeActionResult = {
  error?: string;
};

function revalidateProfileRoutes() {
  revalidatePath("/profile");
  revalidatePath("/profile/settings");
  revalidatePath("/", "layout");
}

export async function updateProfile(
  _prevState: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  const displayNameRaw = String(formData.get("display_name") ?? "");
  const displayName = normalizeDisplayName(displayNameRaw);

  if (!displayName) {
    return {
      error: "Display name must be between 1 and 80 characters.",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { error: "You must be signed in to update your profile." };
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: displayName,
    })
    .eq("id", user.id);

  if (error) {
    return { error: "Display name could not be saved. Please try again." };
  }

  revalidateProfileRoutes();
  return { success: "Display name updated." };
}

export async function updateThemePreference(
  themeRaw: string,
): Promise<ThemeActionResult> {
  if (!isThemePreference(themeRaw)) {
    return { error: "Choose a valid theme preference." };
  }

  const theme: ThemePreference = themeRaw;
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { error: "You must be signed in to update your theme." };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ theme })
    .eq("id", user.id);

  if (error) {
    return { error: "Theme could not be saved. Your previous selection was restored." };
  }

  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();
  cookieStore.set(THEME_COOKIE_NAME, theme, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });

  revalidateProfileRoutes();
  return {};
}
