import { Suspense } from "react";
import { redirect } from "next/navigation";
import Link from "next/link";

import { ProfileStatistics } from "@/components/profile/profile-statistics";
import { StatisticsSkeleton } from "@/components/profile/statistics-skeleton";
import { displayNameFromEmail } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";

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
    .select("display_name")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    throw new Error("profile_read_failed");
  }

  const displayName =
    profile?.display_name?.trim() || displayNameFromEmail(user.email);

  return (
    <section className="mx-auto w-full min-w-0 max-w-6xl">
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <h1 className="break-words text-2xl font-semibold tracking-tight text-[var(--foreground)] sm:text-3xl">
            Profile
          </h1>
          <p className="mt-0 sm:mt-1 break-words text-sm text-[var(--muted)] sm:mt-2 sm:text-base">
            Your watching overview and favourites.
          </p>
        </div>
        <Link
          href="/profile/settings"
          className="interactive-control touch-target inline-flex max-w-full items-center whitespace-normal rounded-lg border bg-[var(--surface)] px-3 py-2 text-sm font-medium text-[var(--foreground)] sm:text-base"
        >
          Settings
        </Link>
      </div>

      <section className="mt-6 min-w-0 rounded-xl border border-[var(--border)] p-3 sm:mt-8 sm:p-5">
        <h2 className="break-words text-lg font-semibold sm:text-xl">
          Overview
        </h2>
        <dl className="mt-2 grid min-w-0 gap-2 sm:mt-3 sm:grid-cols-2 sm:gap-3">
          <div className="min-w-0">
            <dt className="text-xs text-[var(--muted)] sm:text-sm">
              Display name
            </dt>
            <dd className="mt-1 break-words text-base font-medium text-[var(--foreground)] sm:text-lg">
              {displayName}
            </dd>
          </div>
          <div className="min-w-0">
            <dt className="text-xs text-[var(--muted)] sm:text-sm">Email</dt>
            <dd className="mt-1 break-words text-base font-medium text-[var(--foreground)] sm:text-lg">
              {user.email ?? "Unknown email"}
            </dd>
          </div>
        </dl>
      </section>

      <div className="mt-8 min-w-0 sm:mt-12">
        <Suspense fallback={<StatisticsSkeleton />}>
          <ProfileStatistics />
        </Suspense>
      </div>
    </section>
  );
}
