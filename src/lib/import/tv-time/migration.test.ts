import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const sql = [
  "supabase/migrations/20260716000000_create_tv_time_import.sql",
  "supabase/migrations/20260716010000_analyze_matching_resolution.sql",
  "supabase/migrations/20260716020000_apply_lifecycle_progress.sql",
].map((path) => readFileSync(path, "utf8")).join("\n");

describe("Phase 8 migration security contract", () => {
  it("contains owner-aware foreign keys", () => {
    expect(sql).toContain("foreign key(import_id,user_id) references public.imports(id,user_id)");
    expect(sql).toContain("foreign key(mapping_id,user_id) references public.source_media_mappings(id,user_id)");
    expect(sql).toContain("foreign key(import_item_id,user_id) references public.import_items(id,user_id)");
  });
  it("makes trusted functions service-role-only", () => {
    expect(sql).toContain("revoke execute on function public.apply_tv_time_show_import");
    expect(sql).toContain("grant execute on function public.apply_tv_time_show_import");
    expect(sql).toContain("to service_role");
    expect(sql).not.toContain("grant all on public.imports");
    expect(sql).toContain("grant select,insert,update,delete on public.imports");
  });
  it("implements leases and nullable cleanup", () => {
    expect(sql).toContain("for update skip locked");
    expect(sql).toContain("match_claim_expires_at<=now()");
    expect(sql).toContain("application_status='applied',match_context=null");
    expect(sql).toContain("ii.match_status='matching' and ii.match_claim_expires_at<=now()");
    expect(sql).toContain("v_item.match_claim_token<>p_claim_token");
  });
  it("preserves additive TrackTV state and all-or-nothing TV application", () => {
    expect(sql).toContain("public.user_shows.is_favourite or excluded.is_favourite");
    expect(sql).toContain("coalesce(public.user_movies.watched_at,excluded.watched_at)");
    expect(sql).toContain("application_status='blocked'");
    expect(sql.indexOf("if v_missing>0")).toBeLessThan(sql.indexOf("insert into public.watched_episodes"));
  });
  it("initializes Analyze atomically under a per-fingerprint lock", () => {
    expect(sql).toContain("create function public.initialize_tv_time_import");
    expect(sql).toContain("pg_advisory_xact_lock");
    expect(sql).toContain("unique (user_id,source_type,source_fingerprint)");
    expect(sql).toContain("if exists(select 1 from public.imports where id=v_import_id and status<>'parsing') then return v_import_id");
  });
  it("enforces exact item-specific coordinate partitioning in PostgreSQL", () => {
    expect(sql).toContain("'item:'||v_item.id||':coordinate:'");
    expect(sql).toContain("payload/skipped overlap");
    expect(sql).toContain("payload_coordinate_unresolved");
    expect(sql).toContain("x.import_item_id=v_item.id and x.user_id=p_user_id");
  });
  it("derives TV membership and movie source semantics from persisted state", () => {
    expect(sql).toContain("if v_item.import_mode='active_membership'");
    expect(sql).toContain("elsif v_item.import_mode<>'history_only'");
    expect(sql).toContain("Movie payload conflicts with import mode");
    expect(sql).toContain("Movie favourites were not confirmed");
  });
  it("serializes lifecycle mutations on the import row", () => {
    for (const name of ["start_tv_time_import_apply", "set_tv_time_import_paused", "delete_tv_time_import", "forget_tv_time_import_data"]) expect(sql).toContain(`create function public.${name}`);
    expect(sql.match(/where id=p_import_id and user_id=p_user_id for update/g)?.length).toBeGreaterThanOrEqual(7);
  });
  it("rejects malformed candidate arrays explicitly", () => {
    expect(sql).toContain("id is null or id <= 0");
    expect(sql).toContain("count(distinct id)");
    expect(sql).toContain("is_valid_candidate_tmdb_ids(p_candidates)");
  });
});
