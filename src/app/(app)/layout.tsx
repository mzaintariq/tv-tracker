import { redirect } from "next/navigation";

import { DesktopNav } from "@/components/nav/desktop-nav";
import { MobileBottomNav } from "@/components/nav/mobile-bottom-nav";
import { ThemeSync } from "@/components/theme/theme-sync";
import { isThemePreference } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("theme")
    .eq("id", user.id)
    .maybeSingle();

  const profileTheme =
    profile && isThemePreference(profile.theme) ? profile.theme : "system";

  return (
    <div className="flex min-h-full flex-1">
      <ThemeSync theme={profileTheme} />
      <DesktopNav />
      <div className="flex min-w-0 flex-1 flex-col">
        <main className="flex-1 px-4 pb-24 pt-6 md:px-8 md:pb-8 md:pt-8">
          {children}
        </main>
        <MobileBottomNav />
      </div>
    </div>
  );
}
