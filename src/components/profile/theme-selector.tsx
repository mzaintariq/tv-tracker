"use client";

import { useState, useTransition } from "react";

import { updateThemePreference } from "@/app/actions/profile";
import { useTheme } from "@/components/theme/theme-provider";
import type { ThemePreference } from "@/lib/profile";

const THEME_OPTIONS = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
] as const satisfies ReadonlyArray<{
  value: ThemePreference;
  label: string;
}>;

export function ThemeSelector() {
  const { theme, setTheme } = useTheme();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const onSelect = (nextTheme: ThemePreference) => {
    if (nextTheme === theme || pending) {
      return;
    }

    const previousTheme = theme;
    setError(null);
    setTheme(nextTheme);

    startTransition(async () => {
      const result = await updateThemePreference(nextTheme);
      if (result.error) {
        setTheme(previousTheme);
        setError(result.error);
      }
    });
  };

  return (
    <fieldset className="flex min-w-0 flex-col gap-3" disabled={pending}>
      <legend className="text-sm font-medium text-[var(--foreground)]">
        Theme
      </legend>
      <div className="flex min-w-0 flex-col gap-2">
        {THEME_OPTIONS.map((option) => {
          const selected = theme === option.value;
          const optionId = `theme-${option.value}`;
          return (
            <label
              key={option.value}
              htmlFor={optionId}
              className="interactive-control touch-target flex min-w-0 max-w-full cursor-pointer items-center gap-3 rounded-lg border bg-[var(--surface)] px-3 py-2 text-[var(--foreground)]"
            >
              <input
                id={optionId}
                type="radio"
                name="theme"
                value={option.value}
                checked={selected}
                onChange={() => onSelect(option.value)}
                className="size-4 shrink-0 accent-[var(--accent)]"
              />
              <span className="min-w-0 break-words">{option.label}</span>
            </label>
          );
        })}
      </div>
      {error ? (
        <p id="theme-error" className="text-sm text-[var(--danger)]" role="alert">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}
