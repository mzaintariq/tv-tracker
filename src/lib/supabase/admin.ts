import "server-only";

import { createClient } from "@supabase/supabase-js";

import { getPublicEnv } from "@/lib/env";
import { getSupabaseSecretKey } from "@/lib/env.server";
import type { Database } from "@/types/database";

/**
 * Server-only Supabase client using the secret key.
 * Bypasses RLS — use only for trusted shared-metadata writes (e.g. media_items).
 * Never import from client components.
 */
export function createAdminClient() {
  const { NEXT_PUBLIC_SUPABASE_URL } = getPublicEnv();
  const secretKey = getSupabaseSecretKey();

  return createClient<Database>(NEXT_PUBLIC_SUPABASE_URL, secretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
