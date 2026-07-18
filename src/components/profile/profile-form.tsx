"use client";

import { useActionState } from "react";

import {
  updateProfile,
  type ProfileActionState,
} from "@/app/actions/profile";
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
          className="h-12 w-full min-w-0 max-w-full rounded-lg border border-[var(--control-border)] bg-[var(--surface-elevated)] px-3 text-[var(--muted)]"
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
          className="interactive-control touch-target h-12 w-full min-w-0 max-w-full rounded-lg border bg-[var(--surface)] px-3 text-[var(--foreground)]"
        />
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
        className="touch-target h-12 rounded-lg bg-[var(--accent)] px-4 text-sm font-semibold text-[var(--accent-foreground)]"
      >
        {pending ? "Saving…" : "Save display name"}
      </button>
    </form>
  );
}
