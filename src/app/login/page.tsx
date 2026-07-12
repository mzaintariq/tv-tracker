import { LoginForm } from "@/components/auth/login-form";

type LoginPageProps = {
  searchParams: Promise<{ next?: string; error?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const nextPath =
    params.next && params.next.startsWith("/") && !params.next.startsWith("//")
      ? params.next
      : "/shows";
  const initialError =
    params.error === "auth_callback_failed"
      ? "Sign-in failed. Request a new magic link and try again."
      : undefined;

  return (
    <main className="flex min-h-full flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
          TV Tracker
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[var(--foreground)]">
          Sign in
        </h1>
        <p className="mt-2 text-base text-[var(--muted)]">
          Use a magic link sent to your email. No password needed.
        </p>
        <div className="mt-8">
          <LoginForm nextPath={nextPath} initialError={initialError} />
        </div>
      </div>
    </main>
  );
}
