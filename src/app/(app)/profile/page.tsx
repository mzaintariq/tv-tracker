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
    throw new Error(error.message);
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
    <section className="mx-auto w-full max-w-6xl">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-[var(--foreground)]">
            Profile
          </h1>
          <p className="mt-2 text-base text-[var(--muted)]">
            Manage how you appear in the app and your theme preference.
          </p>
        </div>
        <SignOutButton />
      </div>

      <div className="mt-8">
        <ProfileForm
          profile={resolvedProfile}
          email={user.email ?? "Unknown email"}
        />
      </div>
      <section className="mt-8 rounded-xl border border-[var(--border)] p-5">
        <h2 className="text-xl font-semibold">Download your data</h2>
        <p className="mt-1 max-w-3xl text-[var(--muted)]">
          Download a private JSON copy of your profile preferences, tracked shows, watched episode history, movies, favourites, and watched dates.
        </p>
        <p className="mt-2 max-w-3xl text-sm text-[var(--muted)]">
          The export excludes your email, internal IDs, TV Time source files, and import diagnostics. It is generated on demand and is not retained by TrackTV.
        </p>
        <a href="/api/export" className="mt-3 inline-block rounded-lg border border-[var(--border)] px-3 py-2 font-medium">
          Download your data
        </a>
      </section>
      <div className="mt-8 rounded-xl border border-[var(--border)] p-5"><h2 className="text-xl font-semibold">Import from TV Time</h2><p className="mt-1 text-[var(--muted)]">Privately analyze and import your TV Time GDPR export.</p><Link href="/profile/import" className="mt-3 inline-block rounded-lg border border-[var(--border)] px-3 py-2 font-medium">Open TV Time import</Link></div>
      <div className="mt-12"><StatisticsSummary statistics={pageData.statistics} shows={pageData.shows} movies={pageData.movies} /></div>
    </section>
  );
}
