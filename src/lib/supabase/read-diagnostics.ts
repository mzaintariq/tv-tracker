type ReadFailure = { code?: string | null };

export function logSafeReadFailure(area: "shows" | "movies", operation: string, failure: ReadFailure, status: number): string {
  const code = failure.code || `${area}_database_error`;
  const httpCategory = status >= 500 ? "server_error" : status >= 400 ? "client_error" : "unknown";
  console.error(JSON.stringify({ event: `${area}_database_failure`, operation, code, httpCategory }));
  return code;
}

