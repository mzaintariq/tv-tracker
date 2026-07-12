"use client";

import { useActionState } from "react";

import {
  signInWithMagicLink,
  type AuthActionState,
} from "@/app/actions/auth";

const initialState: AuthActionState = {};

type LoginFormProps = {
  nextPath: string;
  initialError?: string;
};

export function LoginForm({ nextPath, initialError }: LoginFormProps) {
  const [state, formAction, pending] = useActionState(
    signInWithMagicLink,
    initialState,
  );

  const error = state.error ?? initialError;
  const success = state.success;

  return (
    <form action={formAction} className="flex w-full flex-col gap-4">
      <input type="hidden" name="next" value={nextPath} />
      <label className="flex flex-col gap-2 text-sm font-medium text-[var(--foreground)]">
        Email
        <input
          type="email"
          name="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
          className="h-12 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-base text-[var(--foreground)] outline-none ring-[var(--accent)] focus:ring-2"
        />
      </label>
      {error ? (
        <p className="text-sm text-[var(--danger)]" role="alert">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="text-sm text-[var(--success)]" role="status">
          {success}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="h-12 rounded-lg bg-[var(--accent)] px-4 text-sm font-semibold text-[var(--accent-foreground)] transition enabled:hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Sending link…" : "Email me a magic link"}
      </button>
    </form>
  );
}
