create function public.load_watch_list_projection(
  p_today date,
  p_recent_cutoff timestamptz,
  p_recent_cutoff_date date
)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  with owned_shows as (
    select
      us.id as membership_id,
      us.user_id,
      us.media_item_id,
      us.status,
      us.is_favourite,
      us.created_at,
      us.updated_at,
      m.tmdb_id,
      m.title,
      m.poster_path,
      m.release_date,
      m.tmdb_status
    from public.user_shows us
    join public.media_items m
      on m.id = us.media_item_id
     and m.media_type = 'tv'
    where us.user_id = auth.uid()
  ),
  episode_totals as (
    select
      owned.media_item_id,
      count(e.id) as episode_count,
      count(e.id) filter (
        where e.season_number > 0
          and e.air_date is not null
          and e.air_date <= p_today
      ) as released_count,
      count(w.id) filter (
        where e.season_number > 0
          and e.air_date is not null
          and e.air_date <= p_today
      ) as watched_released_count,
      max(w.watched_at) filter (
        where e.season_number > 0
          and e.air_date is not null
          and e.air_date <= p_today
      ) as latest_regular_watched_at,
      max(e.air_date) filter (
        where e.season_number > 0
          and e.air_date is not null
          and e.air_date <= p_today
          and w.id is null
      ) as latest_unwatched_released_air_date
    from owned_shows owned
    left join public.episodes e on e.media_item_id = owned.media_item_id
    left join public.watched_episodes w
      on w.episode_id = e.id
     and w.user_id = owned.user_id
    group by owned.media_item_id
  ),
  projected as (
    select
      owned.*,
      totals.episode_count,
      totals.released_count,
      totals.watched_released_count,
      totals.latest_regular_watched_at,
      totals.latest_unwatched_released_air_date,
      case
        when owned.status = 'dropped' then 'dropped'
        when owned.status = 'paused' then 'paused'
        when totals.episode_count = 0 then 'needs_episode_data'
        when totals.watched_released_count > 0
         and totals.watched_released_count = totals.released_count
         and lower(coalesce(owned.tmdb_status, '')) = 'ended' then 'completed'
        when totals.watched_released_count > 0
         and totals.watched_released_count = totals.released_count then 'caught_up'
        when totals.watched_released_count = 0 then 'not_started'
        when totals.latest_regular_watched_at >= p_recent_cutoff
          or totals.latest_unwatched_released_air_date >= p_recent_cutoff_date
          then 'watch_next'
        else 'inactive'
      end as category,
      next_episode.id as next_episode_id,
      next_episode.season_number as next_season_number,
      next_episode.episode_number as next_episode_number,
      next_episode.title as next_episode_title,
      next_episode.air_date as next_episode_air_date
    from owned_shows owned
    join episode_totals totals on totals.media_item_id = owned.media_item_id
    left join lateral (
      select e.id, e.season_number, e.episode_number, e.title, e.air_date
      from public.episodes e
      left join public.watched_episodes w
        on w.episode_id = e.id
       and w.user_id = owned.user_id
      where e.media_item_id = owned.media_item_id
        and e.season_number > 0
        and e.air_date is not null
        and e.air_date <= p_today
        and w.id is null
      order by e.season_number, e.episode_number, e.id
      limit 1
    ) next_episode on true
  ),
  recent as (
    select
      w.id as watched_id,
      w.episode_id,
      w.watched_at,
      owned.membership_id,
      owned.user_id,
      owned.media_item_id,
      owned.status,
      owned.is_favourite,
      owned.created_at,
      owned.updated_at,
      owned.tmdb_id,
      owned.title,
      owned.poster_path,
      owned.release_date,
      owned.tmdb_status,
      e.season_number,
      e.episode_number,
      e.title as episode_title,
      e.air_date
    from owned_shows owned
    join public.episodes e on e.media_item_id = owned.media_item_id
    join public.watched_episodes w
      on w.episode_id = e.id
     and w.user_id = owned.user_id
    order by w.watched_at desc, lower(owned.title), owned.tmdb_id,
      e.season_number, e.episode_number, w.id
    limit 10
  )
  select jsonb_build_object(
    'shows', coalesce((
      select jsonb_agg(jsonb_build_object(
        'membership_id', membership_id,
        'user_id', user_id,
        'media_item_id', media_item_id,
        'status', status,
        'is_favourite', is_favourite,
        'created_at', created_at,
        'updated_at', updated_at,
        'tmdb_id', tmdb_id,
        'title', title,
        'poster_path', poster_path,
        'release_date', release_date,
        'tmdb_status', tmdb_status,
        'released_count', released_count,
        'watched_released_count', watched_released_count,
        'latest_regular_watched_at', latest_regular_watched_at,
        'latest_unwatched_released_air_date', latest_unwatched_released_air_date,
        'category', category,
        'next_episode_id', next_episode_id,
        'next_season_number', next_season_number,
        'next_episode_number', next_episode_number,
        'next_episode_title', next_episode_title,
        'next_episode_air_date', next_episode_air_date
      ) order by membership_id)
      from projected
    ), '[]'::jsonb),
    'recently_watched', coalesce((
      select jsonb_agg(jsonb_build_object(
        'watched_id', watched_id,
        'episode_id', episode_id,
        'watched_at', watched_at,
        'membership_id', membership_id,
        'user_id', user_id,
        'media_item_id', media_item_id,
        'status', status,
        'is_favourite', is_favourite,
        'created_at', created_at,
        'updated_at', updated_at,
        'tmdb_id', tmdb_id,
        'title', title,
        'poster_path', poster_path,
        'release_date', release_date,
        'tmdb_status', tmdb_status,
        'season_number', season_number,
        'episode_number', episode_number,
        'episode_title', episode_title,
        'air_date', air_date
      ) order by watched_at desc, lower(title), tmdb_id,
        season_number, episode_number, watched_id)
      from recent
    ), '[]'::jsonb)
  );
$$;

revoke execute on function public.load_watch_list_projection(date, timestamptz, date)
  from public, anon, service_role;
grant execute on function public.load_watch_list_projection(date, timestamptz, date)
  to authenticated;
