"use client";

import { useActionState, useEffect } from "react";

import {
  updateProfile,
  type ProfileActionState,
} from "@/app/actions/profile";
import { useTheme } from "@/components/theme/theme-provider";
import { THEME_VALUES, type ThemePreference } from "@/lib/profile";
import type { Profile } from "@/types/database";

const initialState: ProfileActionState = {};

type ProfileFormProps = {
  profile: Profile;
  email: string;
};

export function ProfileForm({ profile, email }: ProfileFormProps) {
  const { setTheme } = useTheme();
  const [state, formAction, pending] = useActionState(
    updateProfile,
    initialState,
  );

  useEffect(() => {
    if (state.success) {
      const themeInput = document.querySelector<HTMLSelectElement>(
        'select[name="theme"]',
      );
      if (themeInput && themeInput.value) {
        setTheme(themeInput.value as ThemePreference);
      }
    }
  }, [state.success, setTheme]);

  return (
    <form action={formAction} className="flex w-full min-w-0 max-w-lg flex-col gap-5">
      <div className="flex flex-col gap-2">
        <label
          htmlFor="email"
          className="text-sm font-medium text-[var(--foreground)]"
        >
          Email
        </label>
        <input
          id="email"
          type="email"
          value={email}
          disabled
          className="h-12 w-full min-w-0 max-w-full rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] px-3 text-[var(--muted)]"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label
          htmlFor="display_name"
          className="text-sm font-medium text-[var(--foreground)]"
        >
          Display name
        </label>
        <input
          id="display_name"
          name="display_name"
          type="text"
          required
          maxLength={80}
          defaultValue={profile.display_name ?? ""}
          aria-describedby={state.error ? "profile-error" : undefined}
          aria-invalid={state.error ? true : undefined}
          className="h-12 w-full min-w-0 max-w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-[var(--foreground)] outline-none ring-[var(--accent)] focus:ring-2"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label
          htmlFor="theme"
          className="text-sm font-medium text-[var(--foreground)]"
        >
          Theme
        </label>
        <select
          id="theme"
          name="theme"
          defaultValue={profile.theme}
          className="h-12 w-full min-w-0 max-w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-[var(--foreground)] outline-none ring-[var(--accent)] focus:ring-2"
        >
          {THEME_VALUES.map((value) => (
            <option key={value} value={value}>
              {value.charAt(0).toUpperCase() + value.slice(1)}
            </option>
          ))}
        </select>
      </div>

      {state.error ? (
        <p id="profile-error" className="text-sm text-[var(--danger)]" role="alert">
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p className="text-sm text-[var(--success)]" role="status">
          {state.success}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="h-12 rounded-lg bg-[var(--accent)] px-4 text-sm font-semibold text-[var(--accent-foreground)] transition enabled:hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Saving…" : "Save profile"}
      </button>
    </form>
  );
}
