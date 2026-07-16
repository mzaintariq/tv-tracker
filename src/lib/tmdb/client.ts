import "server-only";

import { getTmdbApiReadToken } from "@/lib/env.server";

const TMDB_API_BASE_URL = "https://api.themoviedb.org/3";

export class TmdbApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "TmdbApiError";
    this.status = status;
  }
}

type FetchTmdbOptions = {
  path: string;
  searchParams?: Record<string, string | number | boolean | undefined>;
  forceRefresh?: boolean;
};

export async function fetchTmdb<T>({
  path,
  searchParams,
  forceRefresh = false,
}: FetchTmdbOptions): Promise<T> {
  const token = getTmdbApiReadToken();
  const url = new URL(`${TMDB_API_BASE_URL}${path}`);

  if (searchParams) {
    for (const [key, value] of Object.entries(searchParams)) {
      if (value === undefined) {
        continue;
      }

      url.searchParams.set(key, String(value));
    }
  }

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      ...(forceRefresh ? { cache: "no-store" as const } : { next: { revalidate: 300 } }),
    });
    if (response.ok) return (await response.json()) as T;
    if ((response.status !== 429 && response.status < 500) || attempt === 2) throw new TmdbApiError(`TMDB request failed (${response.status})`,response.status);
    const retryAfter=Number(response.headers.get("retry-after")); const delay=Number.isFinite(retryAfter)&&retryAfter>=0?Math.min(retryAfter*1000,5000):250*(attempt+1);
    await new Promise((resolve)=>setTimeout(resolve,delay));
  }
  throw new TmdbApiError("TMDB request failed",500);
}
