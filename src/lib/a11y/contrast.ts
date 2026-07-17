/** Relative luminance and WCAG contrast helpers for Phase 9D.4 token checks. */

function channel(value: number): number {
  const srgb = value / 255;
  return srgb <= 0.03928 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance(hex: string): number {
  const normalized = hex.replace("#", "");
  if (normalized.length !== 6) {
    throw new Error(`Unsupported hex colour: ${hex}`);
  }
  const red = channel(Number.parseInt(normalized.slice(0, 2), 16));
  const green = channel(Number.parseInt(normalized.slice(2, 4), 16));
  const blue = channel(Number.parseInt(normalized.slice(4, 6), 16));
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

export function contrastRatio(foreground: string, background: string): number {
  const lighter = Math.max(relativeLuminance(foreground), relativeLuminance(background));
  const darker = Math.min(relativeLuminance(foreground), relativeLuminance(background));
  return (lighter + 0.05) / (darker + 0.05);
}

/** Theme tokens mirrored from `src/app/globals.css` for measurable checks. */
export const LIGHT_THEME = {
  background: "#f3efe6",
  foreground: "#1c1915",
  surface: "#fffaf2",
  surfaceElevated: "#ebe4d7",
  border: "#d7ceb9",
  controlBorder: "#8a8274",
  muted: "#6f675a",
  accent: "#0f6a5c",
  accentForeground: "#f7fffc",
  danger: "#a12d2d",
  success: "#1f6b3a",
  warning: "#7a5c00",
  progressIncomplete: "#a16207",
  progressCaughtUp: "#15803d",
  progressComplete: "#7e22ce",
} as const;

export const DARK_THEME = {
  background: "#12110f",
  foreground: "#f4efe6",
  surface: "#1b1915",
  surfaceElevated: "#26231e",
  border: "#3a352c",
  controlBorder: "#a89c88",
  muted: "#b0a691",
  accent: "#5fcbb6",
  accentForeground: "#06241e",
  danger: "#f0a0a0",
  success: "#8fd6a8",
  warning: "#e6c35c",
  progressIncomplete: "#e6c35c",
  progressCaughtUp: "#4ade80",
  progressComplete: "#c084fc",
} as const;

export type ThemeTokens = typeof LIGHT_THEME | typeof DARK_THEME;
