export const THEME_VALUES = ["light", "dark", "system"] as const;

export type ThemePreference = (typeof THEME_VALUES)[number];

export const THEME_COOKIE_NAME = "tv-tracker-theme";

export const DISPLAY_NAME_MAX_LENGTH = 80;

export function isThemePreference(value: string): value is ThemePreference {
  return (THEME_VALUES as readonly string[]).includes(value);
}

export function normalizeDisplayName(value: string): string | null {
  const trimmed = value.trim().replace(/\s+/g, " ");

  if (trimmed.length === 0) {
    return null;
  }

  if (trimmed.length > DISPLAY_NAME_MAX_LENGTH) {
    return null;
  }

  return trimmed;
}

export function displayNameFromEmail(email: string | null | undefined): string {
  if (!email) {
    return "Viewer";
  }

  const localPart = email.split("@")[0]?.trim();
  return localPart && localPart.length > 0 ? localPart : "Viewer";
}
