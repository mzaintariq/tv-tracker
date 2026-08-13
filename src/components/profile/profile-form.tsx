"use client";

import { useActionState } from "react";

import { updateProfile, type ProfileActionState } from "@/app/actions/profile";
import type { Profile } from "@/types/database";

const initialState: ProfileActionState = {};

type ProfileFormProps = {
  profile: Profile;
  email: string;
};

export function ProfileForm({ profile, email }: ProfileFormProps) {
  const [state, formAction, pending] = useActionState(
    updateProfile,
    initialState,
  );

  return (
    <form
      action={formAction}
      className="flex w-full min-w-0 max-w-lg flex-col gap-3 sm:gap-5"
    >
      <div className="flex flex-col gap-1 sm:gap-2">
        <label
          htmlFor="email"
          className="text-xs font-medium text-[var(--foreground)] sm:text-sm"
        >
          Email
        </label>
        <input
          id="email"
          type="email"
          value={email}
          disabled
          className="h-11 w-full min-w-0 max-w-full rounded-lg border border-[var(--control-border)] bg-[var(--surface-elevated)] px-3 text-base text-[var(--muted)] sm:h-12"
        />
      </div>

      <div className="flex flex-col gap-1 sm:gap-2">
        <label
          htmlFor="display_name"
          className="text-xs font-medium text-[var(--foreground)] sm:text-sm"
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
          className="interactive-control touch-target h-11 w-full min-w-0 max-w-full rounded-lg border bg-[var(--surface)] px-3 text-base text-[var(--foreground)] sm:h-12"
        />
      </div>

      {state.error ? (
        <p
          id="profile-error"
          className="text-xs text-[var(--danger)] sm:text-sm"
          role="alert"
        >
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p className="text-xs text-[var(--success)] sm:text-sm" role="status">
          {state.success}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="touch-target h-11 rounded-lg bg-[var(--accent)] px-3 text-xs font-semibold text-[var(--accent-foreground)] sm:h-12 sm:px-4 sm:text-sm"
      >
        {pending ? "Saving…" : "Save display name"}
      </button>
    </form>
  );
}
