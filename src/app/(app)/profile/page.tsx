import { redirect } from "next/navigation";

import { SignOutButton } from "@/components/auth/sign-out-button";
import { ProfileForm } from "@/components/profile/profile-form";
import { displayNameFromEmail } from "@/lib/profile";
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

  return (
    <section className="mx-auto w-full max-w-3xl">
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
    </section>
  );
}
