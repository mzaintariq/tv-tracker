create function public.reconcile_show_episodes(p_media_item_id uuid,p_episodes jsonb)
returns void language plpgsql security invoker set search_path='' as $$
declare v_input record; v_identity public.episodes; v_coordinate public.episodes; v_count integer;
begin
  if jsonb_typeof(p_episodes)<>'array' or jsonb_array_length(p_episodes)>5000 or octet_length(p_episodes::text)>4194304 then raise exception 'Invalid episode snapshot'; end if;
  select count(*) into v_count from jsonb_to_recordset(p_episodes) as x(tmdb_episode_id integer,season_number integer,episode_number integer,title text,air_date date,runtime_minutes integer,last_synced_at timestamptz);
  if v_count<>jsonb_array_length(p_episodes)
    or exists(select 1 from jsonb_to_recordset(p_episodes) as x(tmdb_episode_id integer,season_number integer,episode_number integer,title text,air_date date,runtime_minutes integer,last_synced_at timestamptz) where tmdb_episode_id is null or tmdb_episode_id<=0 or season_number is null or season_number<0 or season_number=2147483647 or episode_number is null or episode_number<=0 or title is null or btrim(title)='' or runtime_minutes is not null and runtime_minutes<=0)
    or v_count<>(select count(distinct tmdb_episode_id) from jsonb_to_recordset(p_episodes) as x(tmdb_episode_id integer))
    or v_count<>(select count(*) from (select distinct season_number,episode_number from jsonb_to_recordset(p_episodes) as x(season_number integer,episode_number integer)) q)
  then raise exception 'Invalid episode snapshot'; end if;

  perform 1 from public.media_items where id=p_media_item_id and media_type='tv' for update;
  if not found then raise exception 'TV media item not found'; end if;
  perform 1 from public.episodes where media_item_id=p_media_item_id for update;

  for v_input in select tmdb_episode_id,row_number() over(order by tmdb_episode_id) temporary_episode from jsonb_to_recordset(p_episodes) as x(tmdb_episode_id integer) loop
    update public.episodes set season_number=2147483647,episode_number=v_input.temporary_episode where media_item_id=p_media_item_id and tmdb_episode_id=v_input.tmdb_episode_id;
  end loop;

  for v_input in select * from jsonb_to_recordset(p_episodes) as x(tmdb_episode_id integer,season_number integer,episode_number integer,title text,air_date date,runtime_minutes integer,last_synced_at timestamptz) order by season_number,episode_number loop
    select * into v_identity from public.episodes where media_item_id=p_media_item_id and tmdb_episode_id=v_input.tmdb_episode_id for update;
    select * into v_coordinate from public.episodes where media_item_id=p_media_item_id and season_number=v_input.season_number and episode_number=v_input.episode_number for update;
    if v_identity.id is not null then
      if v_coordinate.id is not null and v_coordinate.id<>v_identity.id then
        insert into public.watched_episodes(user_id,episode_id,watched_at,created_at,updated_at)
        select user_id,v_identity.id,watched_at,created_at,updated_at from public.watched_episodes where episode_id=v_coordinate.id
        on conflict(user_id,episode_id) do nothing;
        delete from public.watched_episodes where episode_id=v_coordinate.id;
        delete from public.episodes where id=v_coordinate.id;
      end if;
      update public.episodes set season_number=v_input.season_number,episode_number=v_input.episode_number,title=v_input.title,air_date=v_input.air_date,runtime_minutes=v_input.runtime_minutes,last_synced_at=v_input.last_synced_at where id=v_identity.id;
    elsif v_coordinate.id is not null then
      update public.episodes set tmdb_episode_id=v_input.tmdb_episode_id,title=v_input.title,air_date=v_input.air_date,runtime_minutes=v_input.runtime_minutes,last_synced_at=v_input.last_synced_at where id=v_coordinate.id;
    else
      insert into public.episodes(media_item_id,tmdb_episode_id,season_number,episode_number,title,air_date,runtime_minutes,last_synced_at)
      values(p_media_item_id,v_input.tmdb_episode_id,v_input.season_number,v_input.episode_number,v_input.title,v_input.air_date,v_input.runtime_minutes,v_input.last_synced_at);
    end if;
    v_identity:=null; v_coordinate:=null;
  end loop;
end; $$;
revoke execute on function public.reconcile_show_episodes(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.reconcile_show_episodes(uuid,jsonb) to service_role;
create function public.load_watch_list_episode_data()
returns jsonb language sql stable security invoker set search_path='' as $$
  select jsonb_build_object(
    'memberships',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',us.id,'user_id',us.user_id,'media_item_id',us.media_item_id,'status',us.status,
        'is_favourite',us.is_favourite,'created_at',us.created_at,'updated_at',us.updated_at
      ) order by us.created_at desc,us.id)
      from public.user_shows us where us.user_id=auth.uid()
    ),'[]'::jsonb),
    'media',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',m.id,'tmdb_id',m.tmdb_id,'title',m.title,'poster_path',m.poster_path,
        'release_date',m.release_date,'tmdb_status',m.tmdb_status
      ) order by m.title,m.id)
      from public.user_shows us
      join public.media_items m on m.id=us.media_item_id and m.media_type='tv'
      where us.user_id=auth.uid()
    ),'[]'::jsonb),
    'episodes',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',e.id,'media_item_id',e.media_item_id,'season_number',e.season_number,
        'episode_number',e.episode_number,'title',e.title,'air_date',e.air_date
      ) order by e.media_item_id,e.season_number,e.episode_number)
      from public.episodes e
      join public.user_shows us on us.media_item_id=e.media_item_id and us.user_id=auth.uid()
    ),'[]'::jsonb),
    'watched',coalesce((
      select jsonb_agg(jsonb_build_object('id',w.id,'episode_id',w.episode_id,'watched_at',w.watched_at) order by w.watched_at desc,w.id)
      from public.watched_episodes w
      join public.episodes e on e.id=w.episode_id
      join public.user_shows us on us.media_item_id=e.media_item_id and us.user_id=w.user_id
      where w.user_id=auth.uid()
    ),'[]'::jsonb)
  );
$$;

create function public.load_movie_library_data()
returns jsonb language sql stable security invoker set search_path='' as $$
  select jsonb_build_object('movies',coalesce((
    select jsonb_agg(jsonb_build_object(
      'membership',jsonb_build_object(
        'id',um.id,'user_id',um.user_id,'media_item_id',um.media_item_id,'watched_at',um.watched_at,
        'is_favourite',um.is_favourite,'created_at',um.created_at,'updated_at',um.updated_at
      ),
      'media',jsonb_build_object(
        'id',m.id,'tmdb_id',m.tmdb_id,'title',m.title,'poster_path',m.poster_path,'release_date',m.release_date
      )
    ) order by um.created_at desc,um.id)
    from public.user_movies um
    join public.media_items m on m.id=um.media_item_id and m.media_type='movie'
    where um.user_id=auth.uid()
  ),'[]'::jsonb));
$$;

revoke execute on function public.load_movie_library_data() from public,anon,service_role;
grant execute on function public.load_movie_library_data() to authenticated;

create function public.load_upcoming_data(p_today date)
returns jsonb language sql stable security invoker set search_path='' as $$
  select jsonb_build_object('shows',coalesce(jsonb_agg(jsonb_build_object(
    'membership',jsonb_build_object('media_item_id',us.media_item_id,'status',us.status),
    'media',jsonb_build_object(
      'id',m.id,'tmdb_id',m.tmdb_id,'title',m.title,'poster_path',m.poster_path,
      'tmdb_status',m.tmdb_status,'episodes_synced_at',m.episodes_synced_at
    ),
    'episodes',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',e.id,'media_item_id',e.media_item_id,'season_number',e.season_number,
        'episode_number',e.episode_number,'title',e.title,'air_date',e.air_date,
        'tmdb_episode_id',e.tmdb_episode_id
      ) order by e.air_date,e.season_number,e.episode_number,e.tmdb_episode_id,e.id)
      from public.episodes e
      where e.media_item_id=m.id and e.air_date>=p_today
    ),'[]'::jsonb)
  ) order by m.title,m.tmdb_id),'[]'::jsonb))
  from public.user_shows us
  join public.media_items m on m.id=us.media_item_id and m.media_type='tv'
  where us.user_id=auth.uid() and us.status='active';
$$;

create function public.load_upcoming_refresh_candidates(p_tmdb_ids integer[])
returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare v_result jsonb;
begin
  if p_tmdb_ids is null or cardinality(p_tmdb_ids)>100
     or exists(select 1 from unnest(p_tmdb_ids) id where id is null or id<=0) then
    raise exception 'Invalid Upcoming refresh candidate IDs';
  end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'tmdb_id',m.tmdb_id,'tmdb_status',m.tmdb_status,'episodes_synced_at',m.episodes_synced_at
  ) order by m.tmdb_id),'[]'::jsonb) into v_result
  from public.user_shows us
  join public.media_items m on m.id=us.media_item_id and m.media_type='tv'
  where us.user_id=auth.uid() and us.status='active' and m.tmdb_id=any(p_tmdb_ids);
  return v_result;
end; $$;

revoke execute on function public.load_upcoming_data(date) from public,anon,service_role;
revoke execute on function public.load_upcoming_refresh_candidates(integer[]) from public,anon,service_role;
grant execute on function public.load_upcoming_data(date) to authenticated;
grant execute on function public.load_upcoming_refresh_candidates(integer[]) to authenticated;
