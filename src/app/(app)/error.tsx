"use client";

type AppErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function AppError({ error, reset }: AppErrorProps) {
  return (
    <section className="mx-auto w-full max-w-3xl">
      <h1 className="text-3xl font-semibold tracking-tight text-[var(--foreground)]">
        Something went wrong
      </h1>
      <p className="mt-3 text-base text-[var(--muted)]">
        {error.message || "An unexpected error occurred."}
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-6 h-11 rounded-lg bg-[var(--accent)] px-4 text-sm font-semibold text-[var(--accent-foreground)]"
      >
        Try again
      </button>
    </section>
  );
}
