import { redirect } from "next/navigation";
import Link from "next/link";

import { SignOutButton } from "@/components/auth/sign-out-button";
import { ProfileForm } from "@/components/profile/profile-form";
import { ThemeSelector } from "@/components/profile/theme-selector";
import { TimeZoneSelector } from "@/components/profile/timezone-selector";
import { RegionSelector } from "@/components/profile/region-selector";
import { displayNameFromEmail } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/types/database";

export default async function ProfileSettingsPage() {
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
      region: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } satisfies Profile);

  return (
    <section className="mx-auto w-full min-w-0 max-w-6xl">
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <p className="text-xs text-[var(--muted)] sm:text-sm">
            <Link
              href="/profile"
              className="interactive-control touch-target inline-flex items-center rounded-lg px-1 py-1 font-medium text-[var(--foreground)] underline-offset-4 hover:underline"
            >
              Profile
            </Link>
            <span aria-hidden="true"> / </span>
            Settings
          </p>
          <h1 className="mt-1 break-words text-2xl font-semibold tracking-tight text-[var(--foreground)] sm:mt-2 sm:text-3xl">
            Settings
          </h1>
          <p className="mt-1 break-words text-sm text-[var(--muted)] sm:mt-2 sm:text-base">
            Manage your account preferences, theme, import, and data tools.
          </p>
        </div>
        <SignOutButton />
      </div>

      <div className="mt-6 min-w-0 sm:mt-8">
        <h2 className="break-words text-lg font-semibold sm:text-xl">
          Profile
        </h2>
        <p className="mt-1 break-words text-xs text-[var(--muted)] sm:text-base">
          Update how your name appears in the app.
        </p>
        <div className="mt-3 sm:mt-4">
          <ProfileForm
            profile={resolvedProfile}
            email={user.email ?? "Unknown email"}
          />
        </div>
      </div>

      <div className="mt-6 min-w-0 max-w-lg sm:mt-8">
        <ThemeSelector />
      </div>

      <div className="mt-6 min-w-0 max-w-lg sm:mt-8">
        <TimeZoneSelector currentTimeZone={resolvedProfile.timezone} />
      </div>

      <div className="mt-6 min-w-0 max-w-lg sm:mt-8">
        <RegionSelector currentRegion={resolvedProfile.region} />
      </div>

      <section className="mt-6 min-w-0 rounded-xl border border-[var(--border)] p-3 sm:mt-8 sm:p-5">
        <h2 className="break-words text-lg font-semibold sm:text-xl">
          Download your data
        </h2>
        <p className="mt-1 max-w-3xl break-words text-xs text-[var(--muted)] sm:text-base">
          Download a private JSON copy of your profile preferences, tracked
          shows, watched episode history, movies, favourites, and watched dates.
        </p>
        <p className="mt-1 max-w-3xl break-words text-xs text-[var(--muted)] sm:mt-2 sm:text-sm">
          The export excludes your email, internal IDs, TV Time source files,
          and import diagnostics. It is generated on demand and is not retained
          by TrackTV.
        </p>
        <a
          href="/api/export"
          aria-label="Download TrackTV data as JSON"
          className="interactive-control touch-target mt-3 inline-flex max-w-full items-center whitespace-normal rounded-lg border bg-[var(--surface)] px-3 py-2 text-sm font-medium text-[var(--foreground)] sm:text-base"
        >
          Download your data
        </a>
      </section>

      <div className="mt-6 min-w-0 rounded-xl border border-[var(--border)] p-3 sm:mt-8 sm:p-5">
        <h2 className="break-words text-lg font-semibold sm:text-xl">
          Import from TV Time
        </h2>
        <p className="mt-1 break-words text-xs text-[var(--muted)] sm:text-base">
          Privately analyze and import your TV Time GDPR export.
        </p>
        <Link
          href="/profile/import"
          className="interactive-control touch-target mt-3 inline-flex max-w-full items-center whitespace-normal rounded-lg border bg-[var(--surface)] px-3 py-2 text-sm font-medium text-[var(--foreground)] sm:text-base"
        >
          Open TV Time import
        </Link>
      </div>

      <section className="mt-6 min-w-0 rounded-xl border border-dashed border-[var(--border)] p-3 sm:mt-8 sm:p-5">
        <h2 className="break-words text-lg font-semibold sm:text-xl">
          Account and data
        </h2>
        <p className="mt-1 break-words text-xs text-[var(--muted)] sm:text-base">
          Additional account and data management options will appear here.
        </p>
      </section>
    </section>
  );
}
