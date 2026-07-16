import "server-only";

import { createClient } from "@supabase/supabase-js";

import { getPublicEnv } from "@/lib/env";
import { getSupabaseSecretKey } from "@/lib/env.server";
import type { Database } from "@/types/database";

export function createAdminFetch(
  secretKey: string,
  fetchImplementation: typeof fetch = fetch,
): typeof fetch {
  if (!secretKey.startsWith("sb_secret_")) return fetchImplementation;

  return (async (input: RequestInfo | URL, init?: RequestInit) => {
    const headers = new Headers(input instanceof Request ? input.headers : undefined);
    new Headers(init?.headers).forEach((value, name) => headers.set(name, value));
    headers.delete("Authorization");

    return fetchImplementation(input, {
      ...init,
      headers,
    });
  }) as typeof fetch;
}

/**
 * Server-only Supabase client using the secret key.
 * Bypasses RLS — use only for trusted shared-metadata writes (e.g. media_items).
 * Never import from client components.
 */
export function createAdminClient() {
  const { NEXT_PUBLIC_SUPABASE_URL } = getPublicEnv();
  const secretKey = getSupabaseSecretKey();

  return createClient<Database>(NEXT_PUBLIC_SUPABASE_URL, secretKey, {
    global: {
      fetch: createAdminFetch(secretKey),
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}
