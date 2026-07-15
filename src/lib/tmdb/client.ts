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

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
    ...(forceRefresh ? { cache: "no-store" as const } : { next: { revalidate: 300 } }),
  });

  if (!response.ok) {
    throw new TmdbApiError(
      `TMDB request failed (${response.status})`,
      response.status,
    );
  }

  return (await response.json()) as T;
}
