import { redirect } from "next/navigation";

import { AuthenticatedAppShell } from "@/components/layout/authenticated-app-shell";
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
    <AuthenticatedAppShell
      themeSync={<ThemeSync theme={profileTheme} />}
      desktopNavigation={<DesktopNav />}
      mobileNavigation={<MobileBottomNav />}
    >
      {children}
    </AuthenticatedAppShell>
  );
}
