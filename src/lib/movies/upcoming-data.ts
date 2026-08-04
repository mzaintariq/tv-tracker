import "server-only";
import { dateInTimeZone, validTimeZone } from "@/lib/date-time";
import { isSupportedRegionCode, regionDisplayName } from "@/lib/regions";
import { createClient } from "@/lib/supabase/server";
import { isMovieReleaseMetadataStale, partitionUpcomingMovies, type MovieUpcomingRow } from "@/lib/movies/upcoming";

export async function loadMovieUpcoming(userId: string) {
  const supabase = await createClient();
  const profile = await supabase.from("profiles").select("region,timezone").eq("id", userId).single();
  if (profile.error) throw new Error("movie_upcoming_profile_failed");
  const timeZone = validTimeZone(profile.data.timezone);
  const today = dateInTimeZone(new Date(), timeZone);
  if (!isSupportedRegionCode(profile.data.region)) return { region: null, regionName: null, today, outNow: [], comingSoon: [], datesNotAnnounced: [], staleTmdbIds: [] };
  const result = await supabase.rpc("load_movie_upcoming", { p_region: profile.data.region, p_today: today });
  if (result.error) throw new Error("movie_upcoming_read_failed");
  const rows = (result.data ?? []) as MovieUpcomingRow[];
  return { region: profile.data.region, regionName: regionDisplayName(profile.data.region), today, ...partitionUpcomingMovies(rows, today), staleTmdbIds: rows.filter((row) => isMovieReleaseMetadataStale(row.release_dates_synced_at, new Date())).map((row) => row.tmdb_id) };
}
