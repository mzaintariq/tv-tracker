import { LoginForm } from "@/components/auth/login-form";
import { getLoginErrorMessage, sanitizeNextPath } from "@/lib/auth";

type LoginPageProps = {
  searchParams: Promise<{ next?: string; error?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const nextPath = sanitizeNextPath(params.next);
  const initialError = getLoginErrorMessage(params.error);

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
          Continue with Google, or use an email magic link as a fallback.
        </p>
        <div className="mt-8">
          <LoginForm nextPath={nextPath} initialError={initialError} />
        </div>
      </div>
    </main>
  );
}
