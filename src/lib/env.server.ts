import "server-only";

import { requireEnvValue } from "@/lib/env-value";

export function getSupabaseSecretKey(): string {
  return requireEnvValue(
    "SUPABASE_SECRET_KEY",
    process.env.SUPABASE_SECRET_KEY,
  );
}

export function getTmdbApiReadToken(): string {
  return requireEnvValue(
    "TMDB_API_READ_TOKEN",
    process.env.TMDB_API_READ_TOKEN,
  );
}
