"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useEffectEvent,
  useState,
  type ReactNode,
} from "react";

import {
  isThemePreference,
  THEME_COOKIE_NAME,
  type ThemePreference,
} from "@/lib/profile";

type ThemeContextValue = {
  theme: ThemePreference;
  setTheme: (theme: ThemePreference) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function getSystemPrefersDark(): boolean {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function applyThemeClass(theme: ThemePreference) {
  const root = document.documentElement;
  const resolved =
    theme === "system" ? (getSystemPrefersDark() ? "dark" : "light") : theme;

  root.classList.toggle("dark", resolved === "dark");
  root.style.colorScheme = resolved;
}

function persistThemeCookie(theme: ThemePreference) {
  document.cookie = `${THEME_COOKIE_NAME}=${theme}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
}

type ThemeProviderProps = {
  children: ReactNode;
  initialTheme: ThemePreference;
};

export function ThemeProvider({ children, initialTheme }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<ThemePreference>(initialTheme);

  const syncTheme = useEffectEvent((nextTheme: ThemePreference) => {
    applyThemeClass(nextTheme);
  });

  useEffect(() => {
    syncTheme(theme);
  }, [theme]);

  useEffect(() => {
    if (theme !== "system") {
      return;
    }

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyThemeClass("system");
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [theme]);

  const setTheme = useCallback((nextTheme: ThemePreference) => {
    setThemeState(nextTheme);
    persistThemeCookie(nextTheme);
    applyThemeClass(nextTheme);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}

export function readThemeFromCookieHeader(
  cookieHeader: string | null,
): ThemePreference {
  if (!cookieHeader) {
    return "system";
  }

  const match = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${THEME_COOKIE_NAME}=`));

  if (!match) {
    return "system";
  }

  const value = match.slice(THEME_COOKIE_NAME.length + 1);
  return isThemePreference(value) ? value : "system";
}
