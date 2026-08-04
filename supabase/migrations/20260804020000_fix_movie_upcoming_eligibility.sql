create or replace function public.load_movie_upcoming(p_region text, p_today date)
returns table (
  membership_id uuid, media_item_id uuid, tmdb_id integer, title text,
  poster_path text, watched_at timestamptz, is_favourite boolean,
  theatrical_date date, theatrical_type smallint, digital_date date,
  release_dates_synced_at timestamptz
)
language sql stable security invoker set search_path = '' as $$
  with owned as (
    select um.id membership_id, m.id media_item_id, m.tmdb_id, m.title,
      m.poster_path, um.watched_at, um.is_favourite, m.release_date general_release_date,
      m.release_dates_synced_at
    from public.user_movies um
    join public.media_items m on m.id = um.media_item_id and m.media_type = 'movie'
    where um.user_id = auth.uid()
      and p_today is not null
      and p_region = any(array['AU','AT','BE','BR','CA','CN','DK','EG','FI','FR','DE','GR','HK','IN','ID','IE','IT','JP','MY','MX','NL','NZ','NO','PK','PH','PL','PT','SA','SG','ZA','KR','ES','SE','CH','TW','TH','TR','AE','GB','US'])
  ), selected as (
    select o.*,
      theatrical.release_date theatrical_date,
      theatrical.release_type theatrical_type,
      digital.release_date digital_date
    from owned o
    left join lateral (
      select r.release_date, r.release_type
      from public.movie_release_dates r
      where r.media_item_id = o.media_item_id and r.region = p_region
        and r.release_type in (2, 3)
      order by r.release_date, r.release_type
      limit 1
    ) theatrical on true
    left join lateral (
      select r.release_date
      from public.movie_release_dates r
      where r.media_item_id = o.media_item_id and r.region = p_region
        and r.release_type = 4
      order by r.release_date
      limit 1
    ) digital on true
  )
  select s.membership_id, s.media_item_id, s.tmdb_id, s.title, s.poster_path,
    s.watched_at, s.is_favourite, s.theatrical_date, s.theatrical_type,
    s.digital_date, s.release_dates_synced_at
  from selected s
  where
    s.theatrical_date > p_today or s.digital_date > p_today
    or (
      not coalesce(s.theatrical_date > p_today or s.digital_date > p_today, false)
      and (
        s.theatrical_date between p_today - 30 and p_today
        or s.digital_date between p_today - 30 and p_today
      )
    )
    or (
      s.theatrical_date is null and s.digital_date is null
      and s.watched_at is null
      and (
        s.general_release_date is null
        or s.general_release_date >= (p_today - interval '1 year')::date
      )
    )
  order by
    case
      when s.theatrical_date > p_today or s.digital_date > p_today then 1
      when s.theatrical_date between p_today - 30 and p_today
        or s.digital_date between p_today - 30 and p_today then 0
      else 2
    end,
    case when not coalesce(s.theatrical_date > p_today or s.digital_date > p_today, false) then
      greatest(
        case when s.theatrical_date between p_today - 30 and p_today then s.theatrical_date end,
        case when s.digital_date between p_today - 30 and p_today then s.digital_date end
      )
    end desc nulls last,
    least(
      case when s.theatrical_date > p_today then s.theatrical_date end,
      case when s.digital_date > p_today then s.digital_date end
    ) nulls last,
    lower(s.title), s.tmdb_id, s.membership_id;
$$;

revoke execute on function public.load_movie_upcoming(text,date) from public, anon, service_role;
grant execute on function public.load_movie_upcoming(text,date) to authenticated;
