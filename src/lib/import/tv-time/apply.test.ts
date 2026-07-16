import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));
vi.mock("@/lib/tmdb/endpoints", () => ({ getMovieDetails: vi.fn() }));
vi.mock("@/lib/tmdb/mappers", () => ({ mapTmdbMovieDetailsToCacheRow: vi.fn() }));
vi.mock("@/lib/shows/sync", () => ({ synchronizeShow: vi.fn() }));
vi.mock("./store", () => ({ recalculateImportStatus: vi.fn() }));

import { createAdminClient } from "@/lib/supabase/admin";
import { getMovieDetails } from "@/lib/tmdb/endpoints";
import { synchronizeShow } from "@/lib/shows/sync";
import { applyEligibilityFailure, applyNormalizedImport, loadAllApplyPages } from "./apply";
import { recalculateImportStatus } from "./store";
import type { NormalizedTvTimeImport } from "./types";

describe("completed TV Time import replay", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns an idempotent no-op without final-state writes", async () => {
    const single = vi.fn().mockResolvedValue({ data: { status: "completed" }, error: null });
    const query = { select: vi.fn(), eq: vi.fn(), single };
    query.select.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    const admin = { from: vi.fn().mockReturnValue(query), rpc: vi.fn() };
    vi.mocked(createAdminClient).mockReturnValue(admin as unknown as ReturnType<typeof createAdminClient>);

    const normalized = {} as NormalizedTvTimeImport;
    await expect(applyNormalizedImport("user-id", "import-id", normalized)).resolves.toEqual({ applied: 0, blocked: 0, tvUnits: { applied: 0, blocked: 0 }, movieItems: { applied: 0, blocked: 0 } });

    expect(admin.from).toHaveBeenCalledOnce();
    expect(admin.from).toHaveBeenCalledWith("imports");
    expect(admin.rpc).not.toHaveBeenCalled();
    expect(synchronizeShow).not.toHaveBeenCalled();
    expect(getMovieDetails).not.toHaveBeenCalled();
    expect(recalculateImportStatus).not.toHaveBeenCalled();
  });
});

describe("paused TV Time Apply resume", () => {
  beforeEach(() => vi.clearAllMocks());

  it("starts paused Apply after digest preflight and preserves final-state items", async () => {
    const imports = { select: vi.fn(), eq: vi.fn(), single: vi.fn().mockResolvedValue({ data: { status: "paused" }, error: null }) }; imports.select.mockReturnValue(imports); imports.eq.mockReturnValue(imports);
    const finalItems = [{ id: "applied", mapping_id: null, media_type: "tv", source_key: "a", import_mode: "history_only", match_status: "confirmed", application_status: "applied", source_item_digest: "x" }, { id: "skipped", mapping_id: null, media_type: "movie", source_key: "b", import_mode: "watch_next_movie", match_status: "skipped", application_status: "skipped", source_item_digest: "y" }];
    const items = { select: vi.fn(), eq: vi.fn(), order: vi.fn(), range: vi.fn().mockResolvedValue({ data: finalItems, error: null }) }; items.select.mockReturnValue(items); items.eq.mockReturnValue(items); items.order.mockReturnValue(items);
    const mappings = { select: vi.fn(), eq: vi.fn(), order: vi.fn(), range: vi.fn().mockResolvedValue({ data: [], error: null }) }; mappings.select.mockReturnValue(mappings); mappings.eq.mockReturnValue(mappings); mappings.order.mockReturnValue(mappings);
    const issues = { select: vi.fn(), eq: vi.fn(), maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }) }; issues.select.mockReturnValue(issues); issues.eq.mockReturnValue(issues);
    const admin = { from: vi.fn((table: string) => table === "imports" ? imports : table === "import_items" ? items : table === "source_media_mappings" ? mappings : issues), rpc: vi.fn().mockResolvedValue({ error: null }) };
    vi.mocked(createAdminClient).mockReturnValue(admin as unknown as ReturnType<typeof createAdminClient>);
    const normalized = { shows: [], movies: [], possibleMovieFavouriteKeys: [], summary: {} } as unknown as NormalizedTvTimeImport;
    await expect(applyNormalizedImport("user", "import", normalized)).resolves.toEqual({ applied: 0, blocked: 0, tvUnits: { applied: 0, blocked: 0 }, movieItems: { applied: 0, blocked: 0 } });
    expect(admin.rpc).toHaveBeenCalledWith("start_tv_time_import_apply", { p_user_id: "user", p_import_id: "import" });
    expect(synchronizeShow).not.toHaveBeenCalled(); expect(getMovieDetails).not.toHaveBeenCalled();
  });

  it("does not transition a paused import when item digests fail", async () => {
    const imports = { select: vi.fn(), eq: vi.fn(), single: vi.fn().mockResolvedValue({ data: { status: "paused" }, error: null }) }; imports.select.mockReturnValue(imports); imports.eq.mockReturnValue(imports);
    const items = { select: vi.fn(), eq: vi.fn(), order: vi.fn(), range: vi.fn().mockResolvedValue({ data: [{ id: "pending", mapping_id: null, media_type: "tv", source_key: "missing", import_mode: "history_only", match_status: "confirmed", application_status: "pending", source_item_digest: "bad" }], error: null }) }; items.select.mockReturnValue(items); items.eq.mockReturnValue(items); items.order.mockReturnValue(items);
    const mappings = { select: vi.fn(), eq: vi.fn(), order: vi.fn(), range: vi.fn().mockResolvedValue({ data: [], error: null }) }; mappings.select.mockReturnValue(mappings); mappings.eq.mockReturnValue(mappings); mappings.order.mockReturnValue(mappings);
    const admin = { from: vi.fn((table: string) => table === "imports" ? imports : table === "import_items" ? items : mappings), rpc: vi.fn() };
    vi.mocked(createAdminClient).mockReturnValue(admin as unknown as ReturnType<typeof createAdminClient>);
    await expect(applyNormalizedImport("user", "import", { shows: [], movies: [] } as unknown as NormalizedTvTimeImport)).rejects.toThrow("digest mismatch");
    expect(admin.rpc).not.toHaveBeenCalled();
  });
});

describe("Apply durable accounting", () => {
  it("loads every page beyond the PostgREST 1,000-row ceiling", async () => {
    const rows = Array.from({ length: 1034 }, (_, index) => index);
    const fetched = await loadAllApplyPages(async (from, to) => ({ data: rows.slice(from, to + 1), error: null }));
    expect(fetched).toHaveLength(1034);
    expect(fetched.at(-1)).toBe(1033);
  });

  it("assigns a safe persisted reason to every eligibility failure", () => {
    expect(applyEligibilityFailure({ match_status: "pending", mapping_id: null }, undefined)).toBe("apply_match_not_confirmed");
    expect(applyEligibilityFailure({ match_status: "confirmed", mapping_id: "missing" }, undefined)).toBe("apply_mapping_missing");
    expect(applyEligibilityFailure({ match_status: "confirmed", mapping_id: "mapping" }, { id: "mapping", tmdb_id: null, resolution_status: "auto_confirmed" })).toBe("apply_tmdb_id_missing");
    expect(applyEligibilityFailure({ match_status: "confirmed", mapping_id: "mapping" }, { id: "mapping", tmdb_id: 1, resolution_status: "ambiguous" })).toBe("apply_mapping_not_confirmed");
  });
});
