-- Phase 8: private, resumable TV Time GDPR import infrastructure.

create function public.is_valid_import_match_context(p_media_type text, p_context jsonb)
returns boolean language plpgsql immutable set search_path = '' as $$
declare v_coordinate jsonb; v_key text; v_seen text[] := ARRAY[]::text[];
begin
  if p_context is null or jsonb_typeof(p_context) <> 'object' or octet_length(p_context::text) > 524288
     or p_context ->> 'version' <> '1' or p_context ->> 'kind' <> p_media_type then return false; end if;
  if p_media_type = 'movie' then
    if not (p_context ?& array['version','kind','releaseDate']) or exists (select 1 from jsonb_object_keys(p_context) k where k not in ('version','kind','releaseDate')) then return false; end if;
    return p_context -> 'releaseDate' = 'null'::jsonb or (jsonb_typeof(p_context -> 'releaseDate') = 'string' and (p_context ->> 'releaseDate') ~ '^\d{4}-\d{2}-\d{2}$');
  end if;
  if p_media_type <> 'tv' or not (p_context ?& array['version','kind','coordinates']) or exists (select 1 from jsonb_object_keys(p_context) k where k not in ('version','kind','coordinates'))
     or jsonb_typeof(p_context -> 'coordinates') <> 'array' or jsonb_array_length(p_context -> 'coordinates') > 2000 then return false; end if;
  for v_coordinate in select value from jsonb_array_elements(p_context -> 'coordinates') loop
    if jsonb_typeof(v_coordinate) <> 'object'
       or exists (select 1 from jsonb_object_keys(v_coordinate) k where k not in ('seasonNumber','episodeNumber'))
       or not (v_coordinate ?& array['seasonNumber','episodeNumber'])
       or jsonb_typeof(v_coordinate -> 'seasonNumber') <> 'number' or jsonb_typeof(v_coordinate -> 'episodeNumber') <> 'number'
       or (v_coordinate ->> 'seasonNumber') !~ '^\d+$' or (v_coordinate ->> 'episodeNumber') !~ '^\d+$'
       or (v_coordinate ->> 'seasonNumber')::integer not between 0 and 10000
       or (v_coordinate ->> 'episodeNumber')::integer not between 1 and 100000 then return false; end if;
    v_key := (v_coordinate ->> 'seasonNumber') || ':' || (v_coordinate ->> 'episodeNumber');
    if v_key = any(v_seen) then return false; end if; v_seen := array_append(v_seen, v_key);
  end loop;
  return true;
exception when others then return false;
end;
$$;

create function public.is_valid_candidate_tmdb_ids(p_ids integer[])
returns boolean language sql immutable set search_path='' as $$
  select p_ids is not null
    and cardinality(p_ids) <= 20
    and not exists(select 1 from unnest(p_ids) id where id is null or id <= 0)
    and cardinality(p_ids) = (select count(distinct id) from unnest(p_ids) id);
$$;

create table public.imports (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  source_type text not null check (source_type = 'tv_time_gdpr'), source_fingerprint text not null check (source_fingerprint ~ '^[0-9a-f]{64}$'),
  status text not null check (status in ('parsing','matching','awaiting_resolution','ready','applying','paused','completed','failed','cancelled')),
  timestamp_policy text not null check (timestamp_policy = 'legacy_epoch_else_created_at_utc'),
  summary jsonb not null default '{}' check (jsonb_typeof(summary) = 'object' and octet_length(summary::text) <= 65536),
  assumptions jsonb not null default '{}' check (jsonb_typeof(assumptions) = 'object' and octet_length(assumptions::text) <= 8192),
  total_items integer not null default 0 check (total_items >= 0), matched_items integer not null default 0 check (matched_items between 0 and total_items),
  applied_items integer not null default 0 check (applied_items >= 0), skipped_items integer not null default 0 check (skipped_items >= 0), failed_items integer not null default 0 check (failed_items >= 0),
  analyzed_at timestamptz, matching_completed_at timestamptz, apply_started_at timestamptz, completed_at timestamptz,
  last_error_code text check (last_error_code is null or length(last_error_code) <= 100), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (id,user_id), unique (user_id,source_type,source_fingerprint), check (applied_items + skipped_items <= total_items)
);

create table public.source_media_mappings (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  source_provider text not null check (source_provider = 'tv_time'), source_key_version integer not null default 1 check (source_key_version between 1 and 100),
  media_type text not null check (media_type in ('tv','movie')), source_key text not null check (length(source_key) between 1 and 500),
  source_title text not null check (length(source_title) between 1 and 500), source_release_date date, tmdb_id integer check (tmdb_id > 0),
  resolution_status text not null check (resolution_status in ('unmatched','ambiguous','auto_confirmed','user_confirmed')),
  confidence text check (confidence in ('exact','high','manual')), candidate_tmdb_ids integer[] not null default '{}' check (public.is_valid_candidate_tmdb_ids(candidate_tmdb_ids)),
  resolution_reason text check (resolution_reason is null or length(resolution_reason) <= 500), resolved_at timestamptz, first_import_id uuid, last_import_id uuid,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(id,user_id),
  unique(user_id,source_provider,source_key_version,media_type,source_key),
  foreign key(first_import_id,user_id) references public.imports(id,user_id) on delete set null (first_import_id),
  foreign key(last_import_id,user_id) references public.imports(id,user_id) on delete set null (last_import_id),
  check ((resolution_status in ('auto_confirmed','user_confirmed') and tmdb_id is not null) or (resolution_status in ('unmatched','ambiguous') and tmdb_id is null))
);

create table public.import_items (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, import_id uuid not null, mapping_id uuid,
  media_type text not null check (media_type in ('tv','movie')), source_key text not null check (length(source_key) between 1 and 500),
  import_mode text not null check (import_mode in ('active_membership','history_only','watched_movie','watch_next_movie')),
  match_status text not null default 'pending' check (match_status in ('pending','matching','confirmed','ambiguous','unmatched','skipped','failed')),
  application_status text not null default 'pending' check (application_status in ('pending','blocked','applying','applied','skipped','failed')),
  match_context jsonb, source_record_count integer not null default 0 check(source_record_count >= 0), normalized_event_count integer not null default 0 check(normalized_event_count >= 0), collapsed_event_count integer not null default 0 check(collapsed_event_count >= 0),
  source_item_digest text not null check(source_item_digest ~ '^[0-9a-f]{64}$'), matching_attempt_count integer not null default 0 check(matching_attempt_count >= 0), application_attempt_count integer not null default 0 check(application_attempt_count >= 0),
  match_claim_token uuid, match_claimed_at timestamptz, match_claim_expires_at timestamptz,
  last_error_code text check(last_error_code is null or length(last_error_code) <= 100), last_matched_at timestamptz, last_attempted_at timestamptz, applied_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(id,user_id), unique(import_id,media_type,source_key),
  foreign key(import_id,user_id) references public.imports(id,user_id) on delete cascade,
  foreign key(mapping_id,user_id) references public.source_media_mappings(id,user_id) on delete restrict,
  check ((match_context is not null and public.is_valid_import_match_context(media_type,match_context)) or (match_context is null and application_status in ('applied','skipped'))),
  check ((match_claim_token is null and match_claimed_at is null and match_claim_expires_at is null) or (match_claim_token is not null and match_claimed_at is not null and match_claim_expires_at > match_claimed_at)),
  check(match_status <> 'confirmed' or mapping_id is not null)
);

create table public.import_issues (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, import_id uuid not null, import_item_id uuid,
  issue_key text not null check(length(issue_key) between 1 and 500),
  issue_type text not null check(issue_type in ('ambiguous_media','unmatched_media','missing_episode_coordinate','malformed_source_coordinate','movie_favourites_confirmation','existing_watched_at_preserved','source_collision_collapsed','aggregate_count_discrepancy')),
  is_blocking boolean not null, status text not null default 'open' check(status in ('open','resolved','accepted','declined','skipped')),
  details jsonb not null default '{}' check(jsonb_typeof(details)='object' and octet_length(details::text)<=65536),
  resolution jsonb check(resolution is null or (jsonb_typeof(resolution)='object' and octet_length(resolution::text)<=16384)), resolved_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(id,user_id), unique(import_id,issue_key),
  foreign key(import_id,user_id) references public.imports(id,user_id) on delete cascade,
  foreign key(import_item_id,user_id) references public.import_items(id,user_id) on delete cascade,
  check(status='open' or resolved_at is not null)
);

create index imports_user_created_idx on public.imports(user_id,created_at desc);
create index imports_user_status_idx on public.imports(user_id,status);
create index source_media_mappings_lookup_idx on public.source_media_mappings(user_id,source_provider,source_key_version,media_type,source_key);
create index import_items_progress_idx on public.import_items(import_id,application_status,media_type);
create index import_items_match_claim_idx on public.import_items(import_id,match_status,match_claim_expires_at);
create index import_issues_open_idx on public.import_issues(import_id,is_blocking,status,issue_type);

create trigger imports_set_updated_at before update on public.imports for each row execute function public.set_updated_at();
create trigger source_media_mappings_set_updated_at before update on public.source_media_mappings for each row execute function public.set_updated_at();
create trigger import_items_set_updated_at before update on public.import_items for each row execute function public.set_updated_at();
create trigger import_issues_set_updated_at before update on public.import_issues for each row execute function public.set_updated_at();

alter table public.imports enable row level security; alter table public.source_media_mappings enable row level security;
alter table public.import_items enable row level security; alter table public.import_issues enable row level security;
create policy "Users can view their imports" on public.imports for select to authenticated using(auth.uid()=user_id);
create policy "Users can view their source mappings" on public.source_media_mappings for select to authenticated using(auth.uid()=user_id);
create policy "Users can view their import items" on public.import_items for select to authenticated using(auth.uid()=user_id);
create policy "Users can view their import issues" on public.import_issues for select to authenticated using(auth.uid()=user_id);
revoke all on public.imports,public.source_media_mappings,public.import_items,public.import_issues from anon,authenticated;
revoke all on public.imports,public.source_media_mappings,public.import_items,public.import_issues from service_role;
grant select on public.imports,public.source_media_mappings,public.import_items,public.import_issues to authenticated;
grant select,insert,update,delete on public.imports,public.source_media_mappings,public.import_items,public.import_issues to service_role;

alter table public.source_media_mappings
  add column candidate_metadata jsonb not null default '[]'::jsonb
  check (jsonb_typeof(candidate_metadata)='array' and octet_length(candidate_metadata::text)<=32768);
