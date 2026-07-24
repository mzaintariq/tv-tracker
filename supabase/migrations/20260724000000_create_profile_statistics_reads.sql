-- Focused, owner-scoped reads for the Profile statistics and favourite rails.

create or replace function public.load_profile_statistics()
returns table (
  tracked_shows bigint,
  episodes_watched bigint,
  movies_in_library bigint,
  movies_watched bigint,
  favourite_shows bigint,
  favourite_movies bigint,
  completed_shows bigint,
  caught_up_shows bigint,
  tv_minutes bigint,
  movie_minutes bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  with
  show_memberships as (
    select us.id, us.is_favourite, us.status, m.id as media_item_id, m.tmdb_status
    from public.user_shows as us
    join public.media_items as m on m.id = us.media_item_id
    where us.user_id = auth.uid()
  ),
  show_progress as (
    select
      sm.id,
      sm.status,
      sm.tmdb_status,
      count(e.id) filter (
        where e.season_number > 0
          and e.air_date is not null
          and e.air_date <= current_date
      ) as released_count,
      count(we.episode_id) filter (
        where e.season_number > 0
          and e.air_date is not null
          and e.air_date <= current_date
      ) as watched_released_count
    from show_memberships as sm
    left join public.episodes as e
      on e.media_item_id = sm.media_item_id
    left join public.watched_episodes as we
      on we.user_id = auth.uid()
     and we.episode_id = e.id
    group by sm.id, sm.status, sm.tmdb_status
  ),
  show_totals as (
    select
      count(*) as tracked_shows,
      count(*) filter (where is_favourite) as favourite_shows
    from show_memberships
  ),
  show_state_totals as (
    select
      count(*) filter (
        where status = 'active'
          and watched_released_count > 0
          and watched_released_count = released_count
          and lower(tmdb_status) = 'ended'
      ) as completed_shows,
      count(*) filter (
        where status = 'active'
          and watched_released_count > 0
          and watched_released_count = released_count
          and lower(tmdb_status) is distinct from 'ended'
      ) as caught_up_shows
    from show_progress
  ),
  episode_history_totals as (
    select
      count(*) as episodes_watched,
      coalesce(
        sum(coalesce(e.runtime_minutes, m.average_episode_runtime_minutes, 0)),
        0
      ) as tv_minutes
    from public.watched_episodes as we
    join public.episodes as e on e.id = we.episode_id
    join public.media_items as m on m.id = e.media_item_id
    where we.user_id = auth.uid()
  ),
  movie_totals as (
    select
      count(*) as movies_in_library,
      count(*) filter (where um.watched_at is not null) as movies_watched,
      count(*) filter (where um.is_favourite) as favourite_movies,
      coalesce(
        sum(coalesce(m.runtime_minutes, 0)) filter (where um.watched_at is not null),
        0
      ) as movie_minutes
    from public.user_movies as um
    join public.media_items as m
      on m.id = um.media_item_id
     and m.media_type = 'movie'
    where um.user_id = auth.uid()
  )
  select
    st.tracked_shows,
    eht.episodes_watched,
    mt.movies_in_library,
    mt.movies_watched,
    st.favourite_shows,
    mt.favourite_movies,
    sst.completed_shows,
    sst.caught_up_shows,
    eht.tv_minutes,
    mt.movie_minutes
  from show_totals as st
  cross join show_state_totals as sst
  cross join episode_history_totals as eht
  cross join movie_totals as mt;
$$;

create or replace function public.load_profile_favourites()
returns table (
  membership_id uuid,
  media_item_id uuid,
  tmdb_id integer,
  media_type text,
  title text,
  poster_path text
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    us.id as membership_id,
    m.id as media_item_id,
    m.tmdb_id,
    'tv'::text as media_type,
    m.title,
    m.poster_path
  from public.user_shows as us
  join public.media_items as m on m.id = us.media_item_id
  where us.user_id = auth.uid()
    and us.is_favourite

  union all

  select
    um.id as membership_id,
    m.id as media_item_id,
    m.tmdb_id,
    'movie'::text as media_type,
    m.title,
    m.poster_path
  from public.user_movies as um
  join public.media_items as m
    on m.id = um.media_item_id
   and m.media_type = 'movie'
  where um.user_id = auth.uid()
    and um.is_favourite;
$$;

revoke execute on function public.load_profile_statistics() from public, anon, service_role;
revoke execute on function public.load_profile_favourites() from public, anon, service_role;

grant execute on function public.load_profile_statistics() to authenticated;
grant execute on function public.load_profile_favourites() to authenticated;
