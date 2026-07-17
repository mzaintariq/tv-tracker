import { redirect } from "next/navigation";
import Link from "next/link";

import { SignOutButton } from "@/components/auth/sign-out-button";
import { ProfileForm } from "@/components/profile/profile-form";
import { StatisticsSummary } from "@/components/profile/statistics-summary";
import { displayNameFromEmail } from "@/lib/profile";
import { loadProfilePageData } from "@/lib/profile/data";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/types/database";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    throw new Error("profile_read_failed");
  }

  const resolvedProfile: Profile =
    profile ??
    ({
      id: user.id,
      display_name: displayNameFromEmail(user.email),
      avatar_url: null,
      theme: "system",
      timezone: "UTC",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } satisfies Profile);
  const pageData = await loadProfilePageData(user.id);

  return (
    <section className="mx-auto w-full min-w-0 max-w-6xl">
      <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="break-words text-3xl font-semibold tracking-tight text-[var(--foreground)]">
            Profile
          </h1>
          <p className="mt-2 break-words text-base text-[var(--muted)]">
            Manage how you appear in the app and your theme preference.
          </p>
        </div>
        <SignOutButton />
      </div>

      <div className="mt-8 min-w-0">
        <ProfileForm
          profile={resolvedProfile}
          email={user.email ?? "Unknown email"}
        />
      </div>
      <section className="mt-8 min-w-0 rounded-xl border border-[var(--border)] p-4 sm:p-5">
        <h2 className="break-words text-xl font-semibold">Download your data</h2>
        <p className="mt-1 max-w-3xl break-words text-[var(--muted)]">
          Download a private JSON copy of your profile preferences, tracked shows, watched episode history, movies, favourites, and watched dates.
        </p>
        <p className="mt-2 max-w-3xl break-words text-sm text-[var(--muted)]">
          The export excludes your email, internal IDs, TV Time source files, and import diagnostics. It is generated on demand and is not retained by TrackTV.
        </p>
        <a href="/api/export" aria-label="Download TrackTV data as JSON" className="interactive-control touch-target mt-3 inline-flex max-w-full items-center whitespace-normal rounded-lg border bg-[var(--surface)] px-3 py-2 font-medium text-[var(--foreground)]">
          Download your data
        </a>
      </section>
      <div className="mt-8 min-w-0 rounded-xl border border-[var(--border)] p-4 sm:p-5"><h2 className="break-words text-xl font-semibold">Import from TV Time</h2><p className="mt-1 break-words text-[var(--muted)]">Privately analyze and import your TV Time GDPR export.</p><Link href="/profile/import" className="interactive-control touch-target mt-3 inline-flex max-w-full items-center whitespace-normal rounded-lg border bg-[var(--surface)] px-3 py-2 font-medium text-[var(--foreground)]">Open TV Time import</Link></div>
      <div className="mt-12 min-w-0"><StatisticsSummary statistics={pageData.statistics} shows={pageData.shows} movies={pageData.movies} /></div>
    </section>
  );
}
