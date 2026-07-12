"use client";

import { useEffect } from "react";

import { useTheme } from "@/components/theme/theme-provider";
import type { ThemePreference } from "@/lib/profile";

type ThemeSyncProps = {
  theme: ThemePreference;
};

export function ThemeSync({ theme }: ThemeSyncProps) {
  const { theme: currentTheme, setTheme } = useTheme();

  useEffect(() => {
    if (currentTheme !== theme) {
      setTheme(theme);
    }
  }, [currentTheme, setTheme, theme]);

  return null;
}
