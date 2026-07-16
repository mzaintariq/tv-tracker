create function public.start_tv_time_import_apply(p_user_id uuid,p_import_id uuid)
returns void language plpgsql security invoker set search_path='' as $$
declare v_status text;
begin
  select status into v_status from public.imports where id=p_import_id and user_id=p_user_id for update;
  if not found or v_status not in ('ready','paused','applying') then raise exception 'Import is not ready to apply'; end if;
  update public.imports set status='applying',apply_started_at=coalesce(apply_started_at,now()),last_error_code=null where id=p_import_id and user_id=p_user_id;
end; $$;
create function public.apply_tv_time_show_import(p_user_id uuid,p_import_id uuid,p_import_item_id uuid,p_tmdb_id integer,p_is_favourite boolean,p_episode_events jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare v_item public.import_items; v_media_id uuid; v_event jsonb; v_count integer; v_inserted integer:=0; v_preserved integer:=0; v_skipped integer:=0; v_missing integer:=0; v_status text;
begin
 select status into v_status from public.imports where id=p_import_id and user_id=p_user_id for update;
 if not found or v_status<>'applying' then raise exception 'Import is not applying'; end if;
 select * into v_item from public.import_items where id=p_import_item_id and import_id=p_import_id and user_id=p_user_id for update;
 if not found then raise exception 'Import item is not applicable'; end if;
 update public.import_issues set is_blocking=false,status='skipped',resolution=case when status='open' then jsonb_build_object('action','automatic_coordinate_exclusion') else resolution end,resolved_at=coalesce(resolved_at,now())
 where import_item_id=v_item.id and user_id=p_user_id and issue_type='missing_episode_coordinate' and (status='open' or is_blocking);
 if v_item.application_status='applied' then return jsonb_build_object('idempotent',true); end if;
 if v_item.media_type<>'tv' or v_item.match_status<>'confirmed' or v_item.application_status not in ('pending','blocked','failed') then raise exception 'TV item state is invalid'; end if;
 if exists(select 1 from public.import_issues x where x.import_item_id=v_item.id and x.user_id=p_user_id and x.is_blocking and x.status='open') then
   update public.import_items set application_status='blocked',last_error_code='blocking_issue' where id=v_item.id;
   return jsonb_build_object('blocked',true,'reason','blocking_issue');
 end if;
 perform 1 from public.source_media_mappings where id=v_item.mapping_id and user_id=p_user_id and media_type='tv' and resolution_status in ('auto_confirmed','user_confirmed') and tmdb_id=p_tmdb_id;
 if not found then raise exception 'Confirmed TV mapping mismatch'; end if;
 select id into v_media_id from public.media_items where tmdb_id=p_tmdb_id and media_type='tv'; if not found then raise exception 'Synchronized TV metadata is required'; end if;
 update public.import_issues x set is_blocking=false,status='resolved',resolution=coalesce(x.resolution,'{}'::jsonb)||jsonb_build_object('action','coordinate_became_resolvable','previouslyUnavailable',true),resolved_at=now()
 where x.import_item_id=v_item.id and x.user_id=p_user_id and x.issue_type='missing_episode_coordinate' and x.status='skipped' and x.resolution->>'action'='automatic_coordinate_exclusion'
   and exists(select 1 from public.episodes e where e.media_item_id=v_media_id and e.season_number=(x.details->>'seasonNumber')::integer and e.episode_number=(x.details->>'episodeNumber')::integer);
 if jsonb_typeof(p_episode_events)<>'array' or jsonb_array_length(p_episode_events)>2000 or octet_length(p_episode_events::text)>2097152 then raise exception 'Episode payload bounds exceeded'; end if;
 for v_event in select value from jsonb_array_elements(p_episode_events) loop
   if jsonb_typeof(v_event)<>'object' or exists(select 1 from jsonb_object_keys(v_event) k where k not in ('seasonNumber','episodeNumber','watchedAt','sourceEventCount')) or not(v_event?&array['seasonNumber','episodeNumber','watchedAt','sourceEventCount']) then raise exception 'Invalid episode payload shape'; end if;
 end loop;
 if exists(
   select 1 from jsonb_to_recordset(p_episode_events) as p("seasonNumber" integer,"episodeNumber" integer,"watchedAt" timestamptz,"sourceEventCount" integer)
   where "seasonNumber" is null or "episodeNumber" is null or "watchedAt" is null or "sourceEventCount" is null
      or "seasonNumber" not between 0 and 10000 or "episodeNumber" not between 1 and 100000 or "watchedAt">now() or "sourceEventCount" not between 1 and 10000
 ) then raise exception 'Invalid episode payload value'; end if;
 if (select count(*) from jsonb_to_recordset(p_episode_events) as p("seasonNumber" integer,"episodeNumber" integer,"watchedAt" timestamptz,"sourceEventCount" integer))
    <> (select count(*) from (select distinct "seasonNumber","episodeNumber" from jsonb_to_recordset(p_episode_events) as p("seasonNumber" integer,"episodeNumber" integer,"watchedAt" timestamptz,"sourceEventCount" integer)) d)
 then raise exception 'Duplicate final episode coordinates'; end if;
 -- Extra payload coordinates and payload/skipped overlap are invalid.
 select count(*) into v_count from jsonb_to_recordset(p_episode_events) as p("seasonNumber" integer,"episodeNumber" integer,"watchedAt" timestamptz,"sourceEventCount" integer) where not exists(select 1 from jsonb_array_elements(v_item.match_context->'coordinates') c where (c->>'seasonNumber')::integer=p."seasonNumber" and (c->>'episodeNumber')::integer=p."episodeNumber");
 if v_count>0
    or exists(select 1 from jsonb_to_recordset(p_episode_events) as p("seasonNumber" integer,"episodeNumber" integer,"watchedAt" timestamptz,"sourceEventCount" integer) join public.import_issues x on x.import_item_id=v_item.id and x.user_id=p_user_id and x.issue_type='missing_episode_coordinate' and x.status='skipped' and (x.details->>'seasonNumber')::integer=p."seasonNumber" and (x.details->>'episodeNumber')::integer=p."episodeNumber")
    or exists(select 1 from public.import_issues x where x.import_id=p_import_id and x.import_item_id=v_item.id and x.user_id=p_user_id and x.issue_type='missing_episode_coordinate' and x.status='skipped' and not exists(select 1 from jsonb_array_elements(v_item.match_context->'coordinates') c where (c->>'seasonNumber')::integer=(x.details->>'seasonNumber')::integer and (c->>'episodeNumber')::integer=(x.details->>'episodeNumber')::integer)) then
   update public.import_items set application_status='blocked',last_error_code='invalid_coordinate_partition' where id=v_item.id; return jsonb_build_object('blocked',true,'reason','invalid_coordinate_partition');
 end if;
 -- Every payload coordinate must resolve before it can be treated as resolved.
 if exists(select 1 from jsonb_to_recordset(p_episode_events) as p("seasonNumber" integer,"episodeNumber" integer,"watchedAt" timestamptz,"sourceEventCount" integer) where not exists(select 1 from public.episodes e where e.media_item_id=v_media_id and e.season_number=p."seasonNumber" and e.episode_number=p."episodeNumber")) then
   update public.import_items set application_status='blocked',last_error_code='payload_coordinate_unresolved' where id=v_item.id; return jsonb_build_object('blocked',true,'reason','payload_coordinate_unresolved');
 end if;
 -- Persist one non-blocking exclusion notice for each expected coordinate absent from synchronized TMDB metadata.
 insert into public.import_issues(user_id,import_id,import_item_id,issue_key,issue_type,is_blocking,status,details,resolution,resolved_at)
 select p_user_id,p_import_id,v_item.id,'item:'||v_item.id||':coordinate:'||(c->>'seasonNumber')||':'||(c->>'episodeNumber'),'missing_episode_coordinate',false,'skipped',jsonb_build_object('seasonNumber',(c->>'seasonNumber')::integer,'episodeNumber',(c->>'episodeNumber')::integer),jsonb_build_object('action','automatic_coordinate_exclusion'),now()
 from jsonb_array_elements(v_item.match_context->'coordinates') c
 where not exists(select 1 from jsonb_to_recordset(p_episode_events) as p("seasonNumber" integer,"episodeNumber" integer,"watchedAt" timestamptz,"sourceEventCount" integer) where p."seasonNumber"=(c->>'seasonNumber')::integer and p."episodeNumber"=(c->>'episodeNumber')::integer)
 and not exists(select 1 from public.import_issues x where x.import_item_id=v_item.id and x.user_id=p_user_id and x.issue_type='missing_episode_coordinate' and x.status='skipped' and (x.details->>'seasonNumber')::integer=(c->>'seasonNumber')::integer and (x.details->>'episodeNumber')::integer=(c->>'episodeNumber')::integer)
 on conflict(import_id,issue_key) do update set is_blocking=false,status='skipped',details=excluded.details,resolution=excluded.resolution,resolved_at=coalesce(public.import_issues.resolved_at,excluded.resolved_at);
 -- Conflict handling is not proof: verify exact same-user/item/coordinate issues and the exact partition.
 select count(*) into v_missing from jsonb_array_elements(v_item.match_context->'coordinates') c
 where not exists(select 1 from jsonb_to_recordset(p_episode_events) as p("seasonNumber" integer,"episodeNumber" integer,"watchedAt" timestamptz,"sourceEventCount" integer) where p."seasonNumber"=(c->>'seasonNumber')::integer and p."episodeNumber"=(c->>'episodeNumber')::integer)
 and not exists(select 1 from public.import_issues x where x.import_id=p_import_id and x.import_item_id=v_item.id and x.user_id=p_user_id and x.issue_type='missing_episode_coordinate' and x.status='skipped' and (x.details->>'seasonNumber')::integer=(c->>'seasonNumber')::integer and (x.details->>'episodeNumber')::integer=(c->>'episodeNumber')::integer);
 if v_missing>0 then
   update public.import_items set application_status='blocked',last_error_code='coordinate_exclusion_not_persisted' where id=v_item.id; return jsonb_build_object('blocked',true,'reason','coordinate_exclusion_not_persisted');
 end if;
 if exists(select 1 from public.import_issues x where x.import_item_id=v_item.id and x.user_id=p_user_id and x.is_blocking and x.status='open') then
   update public.import_items set application_status='blocked',last_error_code='blocking_issue' where id=v_item.id; return jsonb_build_object('blocked',true,'reason','blocking_issue');
 end if;
 update public.import_items set application_status='applying',application_attempt_count=application_attempt_count+1,last_attempted_at=now() where id=v_item.id;
 if v_item.import_mode='active_membership' then insert into public.user_shows(user_id,media_item_id,status,is_favourite) values(p_user_id,v_media_id,'active',p_is_favourite) on conflict(user_id,media_item_id) do update set is_favourite=public.user_shows.is_favourite or excluded.is_favourite;
 elsif v_item.import_mode<>'history_only' then raise exception 'Invalid TV import mode'; end if;
 select count(*) into v_preserved from jsonb_to_recordset(p_episode_events) as p("seasonNumber" integer,"episodeNumber" integer,"watchedAt" timestamptz,"sourceEventCount" integer) join public.episodes e on e.media_item_id=v_media_id and e.season_number=p."seasonNumber" and e.episode_number=p."episodeNumber" join public.watched_episodes w on w.user_id=p_user_id and w.episode_id=e.id;
 insert into public.watched_episodes(user_id,episode_id,watched_at) select p_user_id,e.id,p."watchedAt" from jsonb_to_recordset(p_episode_events) as p("seasonNumber" integer,"episodeNumber" integer,"watchedAt" timestamptz,"sourceEventCount" integer) join public.episodes e on e.media_item_id=v_media_id and e.season_number=p."seasonNumber" and e.episode_number=p."episodeNumber" on conflict(user_id,episode_id) do nothing; get diagnostics v_inserted=row_count;
 select count(*) into v_skipped from public.import_issues where import_item_id=v_item.id and issue_type='missing_episode_coordinate' and status='skipped';
 update public.import_items set application_status='applied',match_context=null,applied_at=now(),last_error_code=null where id=v_item.id;
 update public.imports set applied_items=applied_items+1 where id=p_import_id and user_id=p_user_id;
 return jsonb_build_object('inserted',v_inserted,'preserved',v_preserved,'skippedCoordinates',v_skipped);
exception when unique_violation then raise exception 'Duplicate final episode coordinates';
end; $$;

create function public.forget_tv_time_import_data(p_user_id uuid)
returns void language plpgsql security invoker set search_path='' as $$
begin
 perform 1 from public.imports where user_id=p_user_id and source_type='tv_time_gdpr' order by id for update;
 if exists(select 1 from public.imports where user_id=p_user_id and source_type='tv_time_gdpr' and status in ('matching','applying'))
    or exists(select 1 from public.import_items where user_id=p_user_id and match_claim_expires_at>now()) then raise exception 'TV Time import has active work'; end if;
 delete from public.imports where user_id=p_user_id and source_type='tv_time_gdpr';
 delete from public.source_media_mappings where user_id=p_user_id and source_provider='tv_time';
end; $$;

create function public.apply_tv_time_movie_import_batch(p_user_id uuid,p_import_id uuid,p_items jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare v_input jsonb; v_item public.import_items; v_mapping public.source_media_mappings; v_media_id uuid; v_watched_at timestamptz; v_favourite boolean; v_applied integer:=0; v_preserved integer:=0; v_status text;
begin
 select status into v_status from public.imports where id=p_import_id and user_id=p_user_id for update;
 if not found or v_status<>'applying' then raise exception 'Import is not applying'; end if;
 if jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items) not between 1 and 100 or octet_length(p_items::text)>524288 then raise exception 'Movie batch bounds exceeded'; end if;
 if (select count(*) from jsonb_array_elements(p_items))<>(select count(distinct value->>'importItemId') from jsonb_array_elements(p_items)) then raise exception 'Duplicate movie item IDs'; end if;
 for v_input in select value from jsonb_array_elements(p_items) loop
  if jsonb_typeof(v_input)<>'object' or exists(select 1 from jsonb_object_keys(v_input) k where k not in ('importItemId','tmdbId','watchedAt','isFavourite')) or not(v_input?&array['importItemId','tmdbId','watchedAt','isFavourite']) then raise exception 'Invalid movie payload shape'; end if;
  select * into v_item from public.import_items where id=(v_input->>'importItemId')::uuid and import_id=p_import_id and user_id=p_user_id for update;
  if not found then raise exception 'Movie item ownership mismatch'; end if; if v_item.application_status='applied' then continue; end if;
  if v_item.media_type<>'movie' or v_item.match_status<>'confirmed' or v_item.application_status not in ('pending','blocked','failed') then raise exception 'Movie item state is invalid'; end if;
  select * into v_mapping from public.source_media_mappings where id=v_item.mapping_id and user_id=p_user_id and media_type='movie' and resolution_status in ('auto_confirmed','user_confirmed') and tmdb_id=(v_input->>'tmdbId')::integer;
  if not found then raise exception 'Confirmed movie mapping mismatch'; end if;
  select id into v_media_id from public.media_items where tmdb_id=v_mapping.tmdb_id and media_type='movie'; if not found then raise exception 'Cached movie metadata is required'; end if;
  v_watched_at:=case when v_input->'watchedAt'='null'::jsonb then null else (v_input->>'watchedAt')::timestamptz end; v_favourite:=(v_input->>'isFavourite')::boolean;
  if v_watched_at>now() then raise exception 'Future movie watched timestamp'; end if;
  if (v_item.import_mode='watched_movie' and v_watched_at is null) or (v_item.import_mode='watch_next_movie' and v_watched_at is not null) then raise exception 'Movie payload conflicts with import mode'; end if;
  if v_favourite and not exists(select 1 from public.import_issues where import_id=p_import_id and user_id=p_user_id and issue_type='movie_favourites_confirmation' and status='accepted') then raise exception 'Movie favourites were not confirmed'; end if;
  if exists(select 1 from public.user_movies where user_id=p_user_id and media_item_id=v_media_id and watched_at is not null) then v_preserved:=v_preserved+1; end if;
  insert into public.user_movies(user_id,media_item_id,watched_at,is_favourite) values(p_user_id,v_media_id,v_watched_at,v_favourite)
  on conflict(user_id,media_item_id) do update set watched_at=coalesce(public.user_movies.watched_at,excluded.watched_at),is_favourite=public.user_movies.is_favourite or excluded.is_favourite;
  update public.import_items set application_status='applied',match_context=null,application_attempt_count=application_attempt_count+1,last_attempted_at=now(),applied_at=now(),last_error_code=null where id=v_item.id;
  v_applied:=v_applied+1;
 end loop;
 update public.imports set applied_items=applied_items+v_applied where id=p_import_id and user_id=p_user_id;
 return jsonb_build_object('applied',v_applied,'preserved',v_preserved);
end; $$;

-- Existing post-Apply pending work came from the former 1,000-row reads. Preserve it as resumable accounting.
create function public.get_tv_time_import_apply_progress(p_import_id uuid)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select jsonb_build_object(
    'status', i.status,
    'applyPhase', case
      when i.status = 'applying' then 'applying'
      when i.status = 'completed' then 'completed'
      when i.status = 'paused' then 'paused'
      when i.status = 'cancelled' then 'cancelled'
      else null
    end,
    'tvTotalEligible', coalesce(a.tv_total_eligible, 0),
    'tvApplied', coalesce(a.tv_applied, 0),
    'tvBlocked', coalesce(a.tv_blocked, 0),
    'tvRemaining', coalesce(a.tv_remaining, 0),
    'movieTotalEligible', coalesce(a.movie_total_eligible, 0),
    'movieApplied', coalesce(a.movie_applied, 0),
    'movieRemaining', coalesce(a.movie_remaining, 0),
    'tvSkipped', coalesce(a.tv_skipped, 0),
    'movieSkipped', coalesce(a.movie_skipped, 0),
    'lastErrorCode', i.last_error_code,
    'updatedAt', greatest(i.updated_at, coalesce(a.items_updated_at, i.updated_at))
  )
  from public.imports i
  left join lateral (
    select
      count(*) filter (where ii.media_type = 'tv' and ii.application_status <> 'skipped')::integer as tv_total_eligible,
      count(*) filter (where ii.media_type = 'tv' and ii.application_status = 'applied')::integer as tv_applied,
      count(*) filter (where ii.media_type = 'tv' and ii.application_status = 'blocked')::integer as tv_blocked,
      count(*) filter (where ii.media_type = 'tv' and ii.application_status in ('pending', 'applying', 'failed'))::integer as tv_remaining,
      count(*) filter (where ii.media_type = 'movie' and ii.application_status <> 'skipped')::integer as movie_total_eligible,
      count(*) filter (where ii.media_type = 'movie' and ii.application_status = 'applied')::integer as movie_applied,
      count(*) filter (where ii.media_type = 'movie' and ii.application_status not in ('applied', 'skipped'))::integer as movie_remaining,
      count(*) filter (where ii.media_type = 'tv' and ii.application_status = 'skipped')::integer as tv_skipped,
      count(*) filter (where ii.media_type = 'movie' and ii.application_status = 'skipped')::integer as movie_skipped,
      max(ii.updated_at) as items_updated_at
    from public.import_items ii
    where ii.import_id = i.id and ii.user_id = auth.uid()
  ) a on true
  where i.id = p_import_id and i.user_id = auth.uid();
$$;

revoke execute on function public.get_tv_time_import_apply_progress(uuid) from public, anon, service_role;
grant execute on function public.get_tv_time_import_apply_progress(uuid) to authenticated;
revoke execute on function public.start_tv_time_import_apply(uuid,uuid) from public,anon,authenticated;
revoke execute on function public.apply_tv_time_show_import(uuid,uuid,uuid,integer,boolean,jsonb) from public,anon,authenticated;
revoke execute on function public.apply_tv_time_movie_import_batch(uuid,uuid,jsonb) from public,anon,authenticated;
revoke execute on function public.forget_tv_time_import_data(uuid) from public,anon,authenticated;
grant execute on function public.start_tv_time_import_apply(uuid,uuid) to service_role;
grant execute on function public.apply_tv_time_show_import(uuid,uuid,uuid,integer,boolean,jsonb) to service_role;
grant execute on function public.apply_tv_time_movie_import_batch(uuid,uuid,jsonb) to service_role;
grant execute on function public.forget_tv_time_import_data(uuid) to service_role;
