export class ImportRouteReadError extends Error {
  constructor(stage: "list" | "session" | "progress") {
    super(`import_${stage}_read_failed`);
    this.name = "ImportRouteReadError";
  }
}

export function requireImportList<T>(result: { data: T[] | null; error: unknown }): T[] {
  if (result.error) throw new ImportRouteReadError("list");
  return result.data ?? [];
}

export function requireImportSession<T>(result: { data: T | null; error: unknown }): T | null {
  if (result.error) throw new ImportRouteReadError("session");
  return result.data;
}

export function requireImportProgress<T>(result: { data: T | null; error: unknown }): T | null {
  if (result.error) throw new ImportRouteReadError("progress");
  return result.data;
}
