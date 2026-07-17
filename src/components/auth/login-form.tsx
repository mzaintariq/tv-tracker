"use client";

import { useActionState } from "react";

import {
  signInWithGoogle,
  signInWithMagicLink,
  type AuthActionState,
} from "@/app/actions/auth";

const initialState: AuthActionState = {};

type LoginFormProps = {
  nextPath: string;
  initialError?: string;
};

export function LoginForm({ nextPath, initialError }: LoginFormProps) {
  const [googleState, googleAction, googlePending] = useActionState(
    signInWithGoogle,
    initialState,
  );
  const [magicState, magicAction, magicPending] = useActionState(
    signInWithMagicLink,
    initialState,
  );

  const pending = googlePending || magicPending;
  const error = googleState.error ?? magicState.error ?? initialError;
  const success = magicState.success;
  const emailDescription = error ? "login-error" : undefined;

  return (
    <div className="flex w-full flex-col gap-6">
      <form action={googleAction} className="flex w-full flex-col gap-3">
        <input type="hidden" name="next" value={nextPath} />
        <button
          type="submit"
          disabled={pending}
          className="flex touch-target h-12 items-center justify-center gap-3 rounded-lg bg-[var(--accent)] px-4 text-sm font-semibold text-[var(--accent-foreground)]"
        >
          <GoogleIcon />
          {googlePending ? "Connecting to Google…" : "Continue with Google"}
        </button>
      </form>

      {error ? (
        <p id="login-error" className="text-sm text-[var(--danger)]" role="alert">
          {error}
        </p>
      ) : null}

      <div className="flex items-center gap-3" aria-hidden="true">
        <div className="h-px flex-1 bg-[var(--border)]" />
        <span className="text-xs font-medium uppercase tracking-[0.14em] text-[var(--muted)]">
          or
        </span>
        <div className="h-px flex-1 bg-[var(--border)]" />
      </div>

      <form action={magicAction} className="flex w-full flex-col gap-4">
        <input type="hidden" name="next" value={nextPath} />
        <label htmlFor="login-email" className="flex flex-col gap-2 text-sm font-medium text-[var(--foreground)]">
          Email
          <input
            id="login-email"
            type="email"
            name="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
            disabled={pending}
            aria-describedby={emailDescription}
            aria-invalid={error ? true : undefined}
            className="interactive-control touch-target h-12 rounded-lg border bg-[var(--surface)] px-3 text-base text-[var(--foreground)]"
          />
        </label>
        {success ? (
          <p className="text-sm text-[var(--success)]" role="status">
            {success}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={pending}
          className="interactive-control touch-target h-12 rounded-lg border bg-transparent px-4 text-sm font-semibold text-[var(--foreground)] enabled:hover:bg-[var(--surface-elevated)]"
        >
          {magicPending ? "Sending link…" : "Email me a magic link"}
        </button>
      </form>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg
      aria-hidden="true"
      width="18"
      height="18"
      viewBox="0 0 18 18"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.997 8.997 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z"
      />
    </svg>
  );
}
