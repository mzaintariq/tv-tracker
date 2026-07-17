import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ExportSourceData } from "@/lib/export/build";

const mocks = vi.hoisted(() => {
  class MockExportLoadError extends Error {
    readonly stage: "watched_history";
    constructor(stage: "watched_history") { super("Export data could not be loaded."); this.name = "ExportLoadError"; this.stage = stage; }
  }
  return { createClient: vi.fn(), loadExportSourceData: vi.fn(), ExportLoadError: MockExportLoadError };
});
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));
vi.mock("@/lib/export/data", () => ({ ExportLoadError: mocks.ExportLoadError, loadExportSourceData: mocks.loadExportSourceData }));

import { GET } from "@/app/api/export/route";
import { ExportLoadError } from "@/lib/export/data";

const source: ExportSourceData = {
  profile: { display_name: "Viewer", avatar_url: null, timezone: "UTC", theme: "dark" },
  showMemberships: [], movieMemberships: [], watched: [], episodes: [], media: [],
};

describe("GET /api/export", () => {
  beforeEach(() => {
    vi.useFakeTimers(); vi.setSystemTime(new Date("2026-07-17T10:30:45.123Z"));
    mocks.createClient.mockReset(); mocks.loadExportSourceData.mockReset();
  });
  afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

  it("rejects anonymous requests without producing a download", async () => {
    mocks.createClient.mockResolvedValue({ auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) } });
    const response = await GET();
    expect(response.status).toBe(401);
    expect(response.headers.get("content-disposition")).toBeNull();
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(await response.json()).toEqual({ error: "Authentication required." });
    expect(mocks.loadExportSourceData).not.toHaveBeenCalled();
  });

  it("returns a sanitized private error when authentication infrastructure fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    mocks.createClient.mockRejectedValue(new Error("private environment detail"));
    const response = await GET();
    expect(response.status).toBe(500);
    expect(response.headers.get("content-disposition")).toBeNull();
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(await response.json()).toEqual({ error: "Your data could not be exported." });
    expect(console.error).toHaveBeenCalledWith(JSON.stringify({ event: "user_export_failed", stage: "auth", category: "database_error" }));
  });

  it("returns the private versioned download with a safe filename", async () => {
    const client = { auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "owner-id", email: "private@example.invalid" } } }) } };
    mocks.createClient.mockResolvedValue(client); mocks.loadExportSourceData.mockResolvedValue(source);
    const response = await GET();
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/json; charset=utf-8");
    expect(response.headers.get("content-disposition")).toBe('attachment; filename="tracktv-export-20260717T103045Z.json"');
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(mocks.loadExportSourceData).toHaveBeenCalledWith(client, "owner-id");
    const document = await response.json();
    expect(document).toMatchObject({ schema: "tracktv.user-export", version: 1, generatedAt: "2026-07-17T10:30:45.123Z", tvShows: [], movies: [] });
    expect(JSON.stringify(document)).not.toContain("owner-id");
    expect(JSON.stringify(document)).not.toContain("private@example.invalid");
  });

  it("returns a safe generic error without partial content or download headers", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    mocks.createClient.mockResolvedValue({ auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "owner-id" } } }) } });
    mocks.loadExportSourceData.mockRejectedValue(new ExportLoadError("watched_history"));
    const response = await GET();
    expect(response.status).toBe(500);
    expect(response.headers.get("content-disposition")).toBeNull();
    expect(await response.json()).toEqual({ error: "Your data could not be exported." });
    expect(console.error).toHaveBeenCalledWith(JSON.stringify({ event: "user_export_failed", stage: "watched_history", category: "database_error" }));
  });

  it("accepts no request or target-user argument", () => {
    expect(GET.length).toBe(0);
  });
});
