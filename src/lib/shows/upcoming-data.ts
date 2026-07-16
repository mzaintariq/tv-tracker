import "server-only";

import { shouldAutomaticallyRefreshEpisodes } from "@/lib/shows/freshness";
import { dateInTimeZone, deriveUpcoming, type UpcomingDateGroup, type UpcomingSnapshot } from "@/lib/shows/upcoming";
import { createClient } from "@/lib/supabase/server";
import { logSafeReadFailure } from "@/lib/supabase/read-diagnostics";

export type UpcomingPageData = {
  groups: UpcomingDateGroup[];
  staleTmdbIds: number[];
  today: string;
  timeZone: string;
  trackedShowCount: number;
};

export async function loadUpcoming(userId: string, now = new Date()): Promise<UpcomingPageData> {
  const supabase = await createClient();
  const profileResult = await supabase.from("profiles").select("timezone").eq("id", userId).maybeSingle();
  if (profileResult.error) {
    const code = logSafeReadFailure("shows", "upcoming_profile_timezone", profileResult.error, profileResult.status);
    throw new Error(`Could not load your timezone. [${code}]`);
  }
  const timeZone = profileResult.data?.timezone ?? "UTC";
  const today = dateInTimeZone(now, timeZone);
  const upcomingResult = await supabase.rpc("load_upcoming_data", { p_today: today });
  if (upcomingResult.error) {
    const code = logSafeReadFailure("shows", "load_upcoming_data", upcomingResult.error, upcomingResult.status);
    throw new Error(`Could not load upcoming episodes. [${code}]`);
  }
  const payload = upcomingResult.data as { shows?: UpcomingSnapshot[] } | null;
  const snapshots = Array.isArray(payload?.shows) ? payload.shows : [];
  const staleTmdbIds = snapshots
    .filter((snapshot) => shouldAutomaticallyRefreshEpisodes("active", snapshot.media.tmdb_status, snapshot.media.episodes_synced_at, now))
    .map((snapshot) => snapshot.media.tmdb_id)
    .sort((left, right) => left - right);

  return {
    groups: deriveUpcoming(snapshots, today),
    staleTmdbIds,
    today,
    timeZone,
    trackedShowCount: snapshots.length,
  };
}
