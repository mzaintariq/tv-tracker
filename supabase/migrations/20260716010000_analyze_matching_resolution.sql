create function public.initialize_tv_time_import(
  p_user_id uuid,p_source_fingerprint text,p_summary jsonb,p_assumptions jsonb,p_items jsonb,p_issues jsonb
) returns uuid language plpgsql security invoker set search_path='' as $$
declare v_import_id uuid; v_item jsonb; v_issue jsonb; v_mapping_id uuid; v_media_type text;
begin
 if p_source_fingerprint is null or p_source_fingerprint !~ '^[0-9a-f]{64}$'
    or p_summary is null or jsonb_typeof(p_summary)<>'object' or octet_length(p_summary::text)>65536
    or p_assumptions is null or jsonb_typeof(p_assumptions)<>'object' or octet_length(p_assumptions::text)>8192
    or p_items is null or jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items)>2000
    or octet_length(p_items::text)>8388608 or p_issues is null or jsonb_typeof(p_issues)<>'array' or jsonb_array_length(p_issues)>2000
    or octet_length(p_issues::text)>2097152 then raise exception 'Invalid import initialization payload'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_user_id::text||':tv_time_gdpr:'||p_source_fingerprint,0));
 select id into v_import_id from public.imports where user_id=p_user_id and source_type='tv_time_gdpr' and source_fingerprint=p_source_fingerprint for update;
 if found then
   if exists(select 1 from public.imports where id=v_import_id and status<>'parsing') then return v_import_id; end if;
   delete from public.imports where id=v_import_id;
 end if;
 insert into public.imports(user_id,source_type,source_fingerprint,status,timestamp_policy,summary,assumptions,total_items,analyzed_at)
 values(p_user_id,'tv_time_gdpr',p_source_fingerprint,'parsing','legacy_epoch_else_created_at_utc',p_summary,p_assumptions,jsonb_array_length(p_items),now()) returning id into v_import_id;
 for v_item in select value from jsonb_array_elements(p_items) loop
   if jsonb_typeof(v_item)<>'object' or not(v_item?&array['mediaType','sourceKey','sourceTitle','releaseDate','importMode','matchContext','sourceRecordCount','normalizedEventCount','collapsedEventCount','sourceItemDigest']) then raise exception 'Invalid import item'; end if;
   v_media_type:=v_item->>'mediaType'; if v_media_type not in ('tv','movie') then raise exception 'Invalid item media type'; end if;
   insert into public.source_media_mappings(user_id,source_provider,source_key_version,media_type,source_key,source_title,source_release_date,resolution_status,first_import_id,last_import_id)
   values(p_user_id,'tv_time',1,v_media_type,v_item->>'sourceKey',v_item->>'sourceTitle',case when v_item->'releaseDate'='null'::jsonb then null else (v_item->>'releaseDate')::date end,'unmatched',v_import_id,v_import_id)
   on conflict(user_id,source_provider,source_key_version,media_type,source_key) do update
     set first_import_id=coalesce(public.source_media_mappings.first_import_id,v_import_id),last_import_id=v_import_id
   returning id into v_mapping_id;
   insert into public.import_items(user_id,import_id,mapping_id,media_type,source_key,import_mode,match_status,application_status,match_context,source_record_count,normalized_event_count,collapsed_event_count,source_item_digest)
   select p_user_id,v_import_id,v_mapping_id,v_media_type,v_item->>'sourceKey',v_item->>'importMode',
     case when m.resolution_status in ('auto_confirmed','user_confirmed') then 'confirmed' else 'pending' end,'pending',v_item->'matchContext',
     (v_item->>'sourceRecordCount')::integer,(v_item->>'normalizedEventCount')::integer,(v_item->>'collapsedEventCount')::integer,v_item->>'sourceItemDigest'
   from public.source_media_mappings m where m.id=v_mapping_id and m.user_id=p_user_id;
 end loop;
 for v_issue in select value from jsonb_array_elements(p_issues) loop
   if jsonb_typeof(v_issue)<>'object' or not(v_issue?&array['issueKey','issueType','isBlocking','details']) then raise exception 'Invalid initial issue'; end if;
   insert into public.import_issues(user_id,import_id,issue_key,issue_type,is_blocking,details)
   values(p_user_id,v_import_id,v_issue->>'issueKey',v_issue->>'issueType',(v_issue->>'isBlocking')::boolean,v_issue->'details');
 end loop;
 update public.imports set status='matching' where id=v_import_id;
 return v_import_id;
end; $$;

create function public.claim_import_items_for_matching(p_user_id uuid,p_import_id uuid,p_limit integer,p_lease_seconds integer default 120)
returns table(item_id uuid,claim_token uuid) language plpgsql security invoker set search_path='' as $$
declare v_token uuid:=gen_random_uuid(); v_status text;
begin
  if p_limit not between 1 and 10 or p_lease_seconds not between 30 and 600 then raise exception 'Invalid claim bounds'; end if;
  select status into v_status from public.imports where id=p_import_id and user_id=p_user_id for update;
  if not found or v_status not in ('matching','awaiting_resolution') then raise exception 'Import is not matchable'; end if;
  return query with candidates as (
    select ii.id from public.import_items ii where ii.import_id=p_import_id and ii.user_id=p_user_id
      and ((ii.match_status='pending' and (ii.match_claim_expires_at is null or ii.match_claim_expires_at<=now()))
        or (ii.match_status='matching' and ii.match_claim_expires_at<=now()))
    order by ii.created_at,ii.id for update skip locked limit p_limit
  ), claimed as (
    update public.import_items ii set match_status='matching',match_claim_token=v_token,match_claimed_at=now(),match_claim_expires_at=now()+make_interval(secs=>p_lease_seconds),matching_attempt_count=matching_attempt_count+1
    from candidates c where ii.id=c.id returning ii.id
  ) select c.id,v_token from claimed c;
end; $$;
create function public.complete_import_match_claim(p_user_id uuid,p_item_id uuid,p_claim_token uuid,p_status text,p_tmdb_id integer,p_candidates integer[],p_confidence text,p_reason text)
returns void language plpgsql security invoker set search_path='' as $$
declare v_item public.import_items; v_mapping public.source_media_mappings; v_import_id uuid;
begin
 if p_status not in ('confirmed','ambiguous','unmatched') or not public.is_valid_candidate_tmdb_ids(p_candidates) or length(coalesce(p_reason,''))>500 then raise exception 'Invalid match result'; end if;
 select import_id into v_import_id from public.import_items where id=p_item_id and user_id=p_user_id;
 if not found then raise exception 'Import item not found'; end if;
 perform 1 from public.imports where id=v_import_id and user_id=p_user_id and status in ('matching','awaiting_resolution') for update;
 if not found then raise exception 'Import is not matchable'; end if;
 select * into v_item from public.import_items where id=p_item_id and user_id=p_user_id and import_id=v_import_id for update;
 if not found or v_item.match_claim_token<>p_claim_token or v_item.match_claim_expires_at<=now() then raise exception 'Invalid or expired match claim'; end if;
 select * into v_mapping from public.source_media_mappings where id=v_item.mapping_id and user_id=p_user_id for update;
 if not found then raise exception 'Mapping not found'; end if;
 if p_status='confirmed' and p_tmdb_id is null then raise exception 'Confirmed match requires TMDB ID'; end if;
 if p_status<>'confirmed' and p_tmdb_id is not null then raise exception 'Unresolved match cannot retain TMDB ID'; end if;
 update public.source_media_mappings set resolution_status=case when p_status='confirmed' then 'auto_confirmed' else p_status end,tmdb_id=p_tmdb_id,candidate_tmdb_ids=p_candidates,confidence=p_confidence,resolution_reason=p_reason,resolved_at=case when p_status='confirmed' then now() else null end,last_import_id=v_item.import_id where id=v_mapping.id;
 update public.import_items set match_status=p_status,match_claim_token=null,match_claimed_at=null,match_claim_expires_at=null,last_matched_at=now(),last_error_code=null where id=p_item_id;
 if p_status in ('ambiguous','unmatched') then
   insert into public.import_issues(user_id,import_id,import_item_id,issue_key,issue_type,is_blocking,status,details)
   values(p_user_id,v_item.import_id,v_item.id,'media:'||v_item.id,case when p_status='ambiguous' then 'ambiguous_media' else 'unmatched_media' end,true,'open',jsonb_build_object('candidateTmdbIds',coalesce(p_candidates,'{}')))
   on conflict(import_id,issue_key) do update set issue_type=excluded.issue_type,is_blocking=true,status='open',details=excluded.details,resolution=null,resolved_at=null;
 else
   update public.import_issues set status='resolved',resolution=jsonb_build_object('tmdbId',p_tmdb_id),resolved_at=now() where import_item_id=v_item.id and issue_type in ('ambiguous_media','unmatched_media') and status='open';
 end if;
end; $$;

create function public.confirm_tv_time_import_mapping(p_user_id uuid,p_import_id uuid,p_item_id uuid,p_tmdb_id integer)
returns void language plpgsql security invoker set search_path='' as $$
declare v_item public.import_items;
begin
  if p_tmdb_id<=0 then raise exception 'Invalid TMDB ID'; end if;
  perform 1 from public.imports where id=p_import_id and user_id=p_user_id and status in ('matching','awaiting_resolution','ready') for update;
  if not found then raise exception 'Import is not safely resolvable'; end if;
  select * into v_item from public.import_items where id=p_item_id and import_id=p_import_id and user_id=p_user_id for update;
  if not found then raise exception 'Import item not found'; end if;
  if v_item.match_status not in ('ambiguous','unmatched','failed') then raise exception 'Import item is not user-resolvable'; end if;
  if v_item.application_status in ('applying','applied','skipped') or (v_item.match_claim_token is not null and v_item.match_claim_expires_at>now()) then raise exception 'Import item is busy'; end if;
  update public.source_media_mappings set resolution_status='user_confirmed',tmdb_id=p_tmdb_id,candidate_tmdb_ids=array[p_tmdb_id],confidence='manual',resolution_reason='Confirmed by user.',resolved_at=now(),last_import_id=p_import_id where id=v_item.mapping_id and user_id=p_user_id;
  if not found then raise exception 'Mapping not found'; end if;
  update public.import_items set match_status='confirmed',match_claim_token=null,match_claimed_at=null,match_claim_expires_at=null where id=v_item.id;
  update public.import_issues set status='resolved',resolution=jsonb_build_object('tmdbId',p_tmdb_id),resolved_at=now() where import_item_id=v_item.id and user_id=p_user_id and issue_type in ('ambiguous_media','unmatched_media') and status='open';
end; $$;

create function public.skip_tv_time_import_item(p_user_id uuid,p_import_id uuid,p_item_id uuid)
returns void language plpgsql security invoker set search_path='' as $$
declare v_item public.import_items;
begin
  perform 1 from public.imports where id=p_import_id and user_id=p_user_id and status in ('matching','awaiting_resolution','ready','paused') for update;
  if not found then raise exception 'Import is not safely skippable'; end if;
  select * into v_item from public.import_items where id=p_item_id and import_id=p_import_id and user_id=p_user_id for update;
  if not found then raise exception 'Import item not found'; end if;
  if v_item.match_status not in ('ambiguous','unmatched','failed') then raise exception 'Import item is not user-resolvable'; end if;
  if v_item.application_status in ('applying','applied') or (v_item.match_claim_token is not null and v_item.match_claim_expires_at>now()) then raise exception 'Import item is busy'; end if;
  update public.import_items set match_status='skipped',application_status='skipped',match_context=null,applied_at=now(),match_claim_token=null,match_claimed_at=null,match_claim_expires_at=null where id=v_item.id;
  update public.import_issues set status='skipped',resolution=jsonb_build_object('action','skip_item'),resolved_at=now() where import_item_id=v_item.id and user_id=p_user_id and status='open';
  update public.imports set skipped_items=(select count(*) from public.import_items where import_id=p_import_id and application_status='skipped') where id=p_import_id;
end; $$;

create function public.delete_tv_time_import(p_user_id uuid,p_import_id uuid)
returns void language plpgsql security invoker set search_path='' as $$
declare v_status text;
begin
  select status into v_status from public.imports where id=p_import_id and user_id=p_user_id for update;
  if not found then raise exception 'Import not found'; end if;
  if v_status='applying' then raise exception 'Import has active apply work'; end if;
  update public.imports set status='cancelled' where id=p_import_id and user_id=p_user_id;
  if exists(select 1 from public.import_items where import_id=p_import_id and user_id=p_user_id and match_claim_expires_at>now()) then
    raise exception 'Import has active matching work';
  end if;
  delete from public.imports where id=p_import_id and user_id=p_user_id;
end; $$;
create function public.resolve_tv_time_import_issue(p_user_id uuid,p_import_id uuid,p_issue_id uuid,p_status text)
returns void language plpgsql security invoker set search_path='' as $$
declare v_issue public.import_issues; v_item public.import_items;
begin
  if p_status not in ('accepted','declined','skipped') then raise exception 'Invalid issue resolution'; end if;
  perform 1 from public.imports where id=p_import_id and user_id=p_user_id and status in ('matching','awaiting_resolution','ready','paused') for update;
  if not found then raise exception 'Import is not safely resolvable'; end if;
  select * into v_issue from public.import_issues where id=p_issue_id and import_id=p_import_id and user_id=p_user_id for update;
  if not found then raise exception 'Issue not found'; end if;
  if v_issue.status<>'open' then raise exception 'Issue is no longer open'; end if;
  if v_issue.issue_type='movie_favourites_confirmation' then
    if v_issue.import_item_id is not null or p_status not in ('accepted','declined') then raise exception 'Invalid movie favourites decision'; end if;
  elsif v_issue.issue_type='missing_episode_coordinate' then
    if p_status<>'skipped' then raise exception 'Invalid coordinate resolution'; end if;
    if v_issue.import_item_id is not null then
      select * into v_item from public.import_items where id=v_issue.import_item_id and import_id=p_import_id and user_id=p_user_id for update;
      if not found or v_item.application_status='applying' or (v_item.match_claim_token is not null and v_item.match_claim_expires_at>now()) then raise exception 'Import item is busy'; end if;
    end if;
  else raise exception 'Issue type is not manually resolvable'; end if;
  update public.import_issues set status=p_status,resolution=jsonb_build_object('accepted',p_status='accepted'),resolved_at=now() where id=p_issue_id;
  perform public.recalculate_tv_time_import_status(p_user_id,p_import_id);
end; $$;

create function public.set_tv_time_import_paused(p_user_id uuid,p_import_id uuid,p_paused boolean)
returns void language plpgsql security invoker set search_path='' as $$
declare v_status text;
begin
 select status into v_status from public.imports where id=p_import_id and user_id=p_user_id for update;
 if not found or (p_paused and v_status<>'applying') or (not p_paused and v_status<>'paused') then raise exception 'Invalid pause transition'; end if;
 update public.imports set status=case when p_paused then 'paused' else 'ready' end where id=p_import_id;
end; $$;

create function public.recalculate_tv_time_import_status(p_user_id uuid,p_import_id uuid)
returns text language plpgsql security invoker set search_path='' as $$
declare
  v_status text;
  v_apply_started_at timestamptz;
  v_matched integer;
  v_applied integer;
  v_skipped integer;
  v_automatic_work integer;
  v_resolution_required integer;
  v_open_blocking boolean;
  v_all_done boolean;
  v_next text;
begin
  select status,apply_started_at into v_status,v_apply_started_at from public.imports where id=p_import_id and user_id=p_user_id for update;
  if not found then raise exception 'Import not found'; end if;
  update public.import_issues set is_blocking=false,status='skipped',resolution=case when status='open' then jsonb_build_object('action','automatic_coordinate_exclusion') else resolution end,resolved_at=coalesce(resolved_at,now())
  where import_id=p_import_id and user_id=p_user_id and issue_type='missing_episode_coordinate' and (status='open' or is_blocking);
  if v_status='paused' then return v_status; end if;
  if v_status not in ('matching','awaiting_resolution','ready','applying') then return v_status; end if;

  select
    count(*) filter(where match_status='confirmed'),
    count(*) filter(where application_status='applied'),
    count(*) filter(where application_status='skipped'),
    count(*) filter(where match_status in ('pending','matching')),
    count(*) filter(where match_status in ('ambiguous','unmatched','failed')),
    coalesce(bool_and(application_status in ('applied','skipped')),true)
  into v_matched,v_applied,v_skipped,v_automatic_work,v_resolution_required,v_all_done
  from public.import_items where import_id=p_import_id and user_id=p_user_id;

  select exists(select 1 from public.import_issues where import_id=p_import_id and user_id=p_user_id and is_blocking and status='open') into v_open_blocking;

  v_next:=case
    when v_all_done and not v_open_blocking then 'completed'
    when v_automatic_work>0 then 'matching'
    when v_resolution_required>0 or v_open_blocking then 'awaiting_resolution'
    when v_apply_started_at is not null then 'paused'
    else 'ready'
  end;

  update public.imports set
    status=v_next,matched_items=v_matched,applied_items=v_applied,skipped_items=v_skipped,
    matching_completed_at=case when v_next in ('ready','completed') then coalesce(matching_completed_at,now()) else matching_completed_at end,
    completed_at=case when v_next='completed' then coalesce(completed_at,now()) else null end,
    last_error_code=case when v_next='completed' then null when v_next='paused' and v_status='applying' then 'apply_items_remaining' else last_error_code end
  where id=p_import_id;
  return v_next;
end; $$;

create function public.skip_all_unresolved_tv_time_media(p_user_id uuid,p_import_id uuid)
returns integer language plpgsql security invoker set search_path='' as $$
declare v_count integer;
begin
  perform 1 from public.imports where id=p_import_id and user_id=p_user_id and status in ('matching','awaiting_resolution','ready','paused') for update;
  if not found then raise exception 'Import is not safely skippable'; end if;
  if exists(select 1 from public.import_items where import_id=p_import_id and user_id=p_user_id and match_status in ('ambiguous','unmatched','failed') and match_claim_expires_at>now()) then raise exception 'Import has active matching work'; end if;
  with targets as (
    select id from public.import_items where import_id=p_import_id and user_id=p_user_id and match_status in ('ambiguous','unmatched','failed') and application_status not in ('applying','applied','skipped') for update
  ), skipped as (
    update public.import_items i set match_status='skipped',application_status='skipped',match_context=null,applied_at=now(),match_claim_token=null,match_claimed_at=null,match_claim_expires_at=null from targets t where i.id=t.id returning i.id
  ) select count(*) into v_count from skipped;
  update public.import_issues x set status='skipped',resolution=jsonb_build_object('action','skip_item'),resolved_at=now() where x.import_id=p_import_id and x.user_id=p_user_id and x.import_item_id in (select id from public.import_items where import_id=p_import_id and match_status='skipped') and x.issue_type in ('ambiguous_media','unmatched_media') and x.status='open';
  perform public.recalculate_tv_time_import_status(p_user_id,p_import_id);
  return v_count;
end; $$;
revoke execute on function public.skip_all_unresolved_tv_time_media(uuid,uuid) from public,anon,authenticated;
grant execute on function public.skip_all_unresolved_tv_time_media(uuid,uuid) to service_role;
create function public.skip_unresolved_tv_time_media_by_type(p_user_id uuid,p_import_id uuid,p_media_type text)
returns integer language plpgsql security invoker set search_path='' as $$
declare v_count integer;
begin
  if p_media_type not in ('tv','movie') then raise exception 'Invalid media type'; end if;
  perform 1 from public.imports where id=p_import_id and user_id=p_user_id and status in ('matching','awaiting_resolution','ready','paused') for update;
  if not found then raise exception 'Import is not safely skippable'; end if;
  if exists(select 1 from public.import_items where import_id=p_import_id and user_id=p_user_id and media_type=p_media_type and match_status in ('ambiguous','unmatched','failed') and match_claim_expires_at>now()) then raise exception 'Import has active matching work'; end if;
  with targets as (
    select id from public.import_items where import_id=p_import_id and user_id=p_user_id and media_type=p_media_type
      and match_status in ('ambiguous','unmatched','failed') and application_status not in ('applying','applied','skipped') for update
  ), skipped as (
    update public.import_items i set match_status='skipped',application_status='skipped',match_context=null,applied_at=now(),match_claim_token=null,match_claimed_at=null,match_claim_expires_at=null
    from targets t where i.id=t.id returning i.id
  ) select count(*) into v_count from skipped;
  update public.import_issues x set status='skipped',resolution=jsonb_build_object('action','skip_item'),resolved_at=now()
  where x.import_id=p_import_id and x.user_id=p_user_id and x.import_item_id in (
    select id from public.import_items where import_id=p_import_id and user_id=p_user_id and media_type=p_media_type and match_status='skipped'
  ) and x.issue_type in ('ambiguous_media','unmatched_media') and x.status='open';
  perform public.recalculate_tv_time_import_status(p_user_id,p_import_id);
  return v_count;
end; $$;

create function public.skip_missing_tv_time_coordinates(p_user_id uuid,p_import_id uuid,p_import_item_id uuid)
returns integer language plpgsql security invoker set search_path='' as $$
declare v_count integer;
begin
  perform 1 from public.imports where id=p_import_id and user_id=p_user_id and status in ('awaiting_resolution','ready','paused') for update;
  if not found then raise exception 'Import is not safely resolvable'; end if;
  if p_import_item_id is not null and not exists(select 1 from public.import_items where id=p_import_item_id and import_id=p_import_id and user_id=p_user_id and media_type='tv') then raise exception 'TV import item not found'; end if;
  with targets as (
    select id from public.import_issues where import_id=p_import_id and user_id=p_user_id and issue_type='missing_episode_coordinate'
      and is_blocking and status='open' and (p_import_item_id is null or import_item_id=p_import_item_id) for update
  ), skipped as (
    update public.import_issues x set status='skipped',resolution=jsonb_build_object('accepted',false,'action','skip_coordinate'),resolved_at=now()
    from targets t where x.id=t.id returning x.id
  ) select count(*) into v_count from skipped;
  perform public.recalculate_tv_time_import_status(p_user_id,p_import_id);
  return v_count;
end; $$;

revoke execute on function public.skip_unresolved_tv_time_media_by_type(uuid,uuid,text) from public,anon,authenticated;
revoke execute on function public.skip_missing_tv_time_coordinates(uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.skip_unresolved_tv_time_media_by_type(uuid,uuid,text) to service_role;
grant execute on function public.skip_missing_tv_time_coordinates(uuid,uuid,uuid) to service_role;
create function public.synchronize_tv_time_media_issue_from_item()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if new.match_status='confirmed' then
    update public.import_issues x set status='resolved',resolution=jsonb_build_object('tmdbId',m.tmdb_id),resolved_at=now()
    from public.source_media_mappings m where x.import_item_id=new.id and x.user_id=new.user_id and x.status='open'
      and x.issue_type in ('ambiguous_media','unmatched_media') and m.id=new.mapping_id and m.user_id=new.user_id;
  elsif new.match_status='skipped' then
    update public.import_issues set status='skipped',resolution=jsonb_build_object('action','skip_item'),resolved_at=now()
    where import_item_id=new.id and user_id=new.user_id and status='open' and issue_type in ('ambiguous_media','unmatched_media');
  end if;
  return new;
end; $$;

create function public.normalize_tv_time_media_issue_on_write()
returns trigger language plpgsql security definer set search_path='' as $$
declare v_item public.import_items; v_tmdb_id integer;
begin
  if new.status<>'open' or new.issue_type not in ('ambiguous_media','unmatched_media') or new.import_item_id is null then return new; end if;
  select * into v_item from public.import_items where id=new.import_item_id and user_id=new.user_id;
  if v_item.match_status='confirmed' then
    select tmdb_id into v_tmdb_id from public.source_media_mappings where id=v_item.mapping_id and user_id=new.user_id;
    new.status:='resolved'; new.resolution:=jsonb_build_object('tmdbId',v_tmdb_id); new.resolved_at:=now();
  elsif v_item.match_status='skipped' then
    new.status:='skipped'; new.resolution:=jsonb_build_object('action','skip_item'); new.resolved_at:=now();
  end if;
  return new;
end; $$;

create trigger import_items_sync_media_issue after update of match_status on public.import_items for each row when (old.match_status is distinct from new.match_status) execute function public.synchronize_tv_time_media_issue_from_item();
create trigger import_issues_normalize_media_state before insert or update of status,import_item_id,issue_type on public.import_issues for each row execute function public.normalize_tv_time_media_issue_on_write();
revoke execute on function public.initialize_tv_time_import(uuid,text,jsonb,jsonb,jsonb,jsonb) from public,anon,authenticated;
revoke execute on function public.claim_import_items_for_matching(uuid,uuid,integer,integer) from public,anon,authenticated;
revoke execute on function public.complete_import_match_claim(uuid,uuid,uuid,text,integer,integer[],text,text) from public,anon,authenticated;
revoke execute on function public.confirm_tv_time_import_mapping(uuid,uuid,uuid,integer) from public,anon,authenticated;
revoke execute on function public.skip_tv_time_import_item(uuid,uuid,uuid) from public,anon,authenticated;
revoke execute on function public.resolve_tv_time_import_issue(uuid,uuid,uuid,text) from public,anon,authenticated;
revoke execute on function public.set_tv_time_import_paused(uuid,uuid,boolean) from public,anon,authenticated;
revoke execute on function public.recalculate_tv_time_import_status(uuid,uuid) from public,anon,authenticated;
revoke execute on function public.delete_tv_time_import(uuid,uuid) from public,anon,authenticated;
grant execute on function public.claim_import_items_for_matching(uuid,uuid,integer,integer) to service_role;
grant execute on function public.is_valid_import_match_context(text,jsonb) to service_role;
grant execute on function public.is_valid_candidate_tmdb_ids(integer[]) to service_role;
grant execute on function public.initialize_tv_time_import(uuid,text,jsonb,jsonb,jsonb,jsonb) to service_role;
grant execute on function public.complete_import_match_claim(uuid,uuid,uuid,text,integer,integer[],text,text) to service_role;
grant execute on function public.confirm_tv_time_import_mapping(uuid,uuid,uuid,integer) to service_role;
grant execute on function public.skip_tv_time_import_item(uuid,uuid,uuid) to service_role;
grant execute on function public.resolve_tv_time_import_issue(uuid,uuid,uuid,text) to service_role;
grant execute on function public.set_tv_time_import_paused(uuid,uuid,boolean) to service_role;
grant execute on function public.recalculate_tv_time_import_status(uuid,uuid) to service_role;
grant execute on function public.delete_tv_time_import(uuid,uuid) to service_role;
revoke execute on function public.synchronize_tv_time_media_issue_from_item() from public,anon,authenticated,service_role;
revoke execute on function public.normalize_tv_time_media_issue_on_write() from public,anon,authenticated,service_role;
