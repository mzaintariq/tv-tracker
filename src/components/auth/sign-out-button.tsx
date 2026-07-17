import { signOut } from "@/app/actions/auth";

export function SignOutButton() {
  return (
    <form action={signOut}>
      <button
        type="submit"
        className="interactive-control touch-target h-11 rounded-lg border bg-[var(--surface)] px-4 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--surface-elevated)]"
      >
        Sign out
      </button>
    </form>
  );
}
