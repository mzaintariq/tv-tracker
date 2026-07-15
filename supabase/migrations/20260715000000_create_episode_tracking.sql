-- Phase 4: shared episode metadata and private television watch history.

create table public.episodes (
  id uuid primary key default gen_random_uuid(),
  media_item_id uuid not null references public.media_items (id) on delete restrict,
  season_number integer not null check (season_number >= 0),
  episode_number integer not null check (episode_number > 0),
  title text not null,
  air_date date,
  runtime_minutes integer check (runtime_minutes is null or runtime_minutes > 0),
  tmdb_episode_id integer not null check (tmdb_episode_id > 0),
  last_synced_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (media_item_id, tmdb_episode_id),
  unique (media_item_id, season_number, episode_number)
);

comment on table public.episodes is
  'Shared TMDB episode metadata. Writable only by trusted server code.';

create index episodes_media_item_season_episode_idx
  on public.episodes (media_item_id, season_number, episode_number);
create index episodes_media_item_air_date_idx
  on public.episodes (media_item_id, air_date);

create trigger episodes_set_updated_at
before update on public.episodes
for each row execute function public.set_updated_at();

create table public.watched_episodes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  episode_id uuid not null references public.episodes (id) on delete restrict,
  watched_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, episode_id)
);

comment on table public.watched_episodes is
  'Private per-user episode history. Rows survive removal from user_shows.';

create index watched_episodes_user_watched_at_idx
  on public.watched_episodes (user_id, watched_at desc);
create index watched_episodes_episode_id_idx
  on public.watched_episodes (episode_id);

create trigger watched_episodes_set_updated_at
before update on public.watched_episodes
for each row execute function public.set_updated_at();

alter table public.episodes enable row level security;

create policy "Authenticated users can select episodes"
on public.episodes for select to authenticated using (true);

revoke all privileges on table public.episodes from anon, authenticated;
grant select on table public.episodes to authenticated;
grant all on table public.episodes to service_role;

alter table public.watched_episodes enable row level security;

create policy "Users can select their own watched episodes"
on public.watched_episodes for select to authenticated
using (auth.uid() = user_id);

create policy "Users can insert watched episodes for tracked shows"
on public.watched_episodes for insert to authenticated
with check (
  auth.uid() = user_id
  and watched_at <= now()
  and exists (
    select 1
    from public.episodes as e
    join public.user_shows as us on us.media_item_id = e.media_item_id
    where e.id = episode_id
      and e.air_date is not null
      and e.air_date <= current_date
      and us.user_id = auth.uid()
  )
);

create policy "Users can update watched episodes for tracked shows"
on public.watched_episodes for update to authenticated
using (
  auth.uid() = user_id
  and exists (
    select 1
    from public.episodes as e
    join public.user_shows as us on us.media_item_id = e.media_item_id
    where e.id = episode_id and us.user_id = auth.uid()
  )
)
with check (
  auth.uid() = user_id
  and watched_at <= now()
  and exists (
    select 1
    from public.episodes as e
    join public.user_shows as us on us.media_item_id = e.media_item_id
    where e.id = episode_id
      and e.air_date is not null
      and e.air_date <= current_date
      and us.user_id = auth.uid()
  )
);

create policy "Users can delete watched episodes for tracked shows"
on public.watched_episodes for delete to authenticated
using (
  auth.uid() = user_id
  and exists (
    select 1
    from public.episodes as e
    join public.user_shows as us on us.media_item_id = e.media_item_id
    where e.id = episode_id and us.user_id = auth.uid()
  )
);

revoke all privileges on table public.watched_episodes from anon, authenticated;
grant select, insert, update, delete on table public.watched_episodes to authenticated;
grant all on table public.watched_episodes to service_role;

create function public.mark_episode_watched(
  p_media_item_id uuid,
  p_episode_id uuid,
  p_watched_at timestamptz default now()
) returns void
language plpgsql security invoker set search_path = '' as $$
declare v_user_id uuid := auth.uid();
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  if p_media_item_id is null or p_episode_id is null then raise exception 'Show and episode are required'; end if;
  if p_watched_at is null or p_watched_at > now() then raise exception 'Watched date must not be in the future'; end if;
  if not exists (
    select 1 from public.episodes e
    join public.media_items m on m.id = e.media_item_id and m.media_type = 'tv'
    join public.user_shows us on us.media_item_id = m.id and us.user_id = v_user_id
    where e.id = p_episode_id and e.media_item_id = p_media_item_id
      and e.air_date is not null and e.air_date <= current_date
  ) then raise exception 'Released episode is not in your tracked show'; end if;
  insert into public.watched_episodes (user_id, episode_id, watched_at)
  values (v_user_id, p_episode_id, p_watched_at)
  on conflict (user_id, episode_id) do nothing;
end;
$$;

create function public.mark_episode_unwatched(p_media_item_id uuid, p_episode_id uuid)
returns void language plpgsql security invoker set search_path = '' as $$
declare v_user_id uuid := auth.uid();
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  if p_media_item_id is null or p_episode_id is null then raise exception 'Show and episode are required'; end if;
  if not exists (
    select 1 from public.episodes e
    join public.media_items m on m.id = e.media_item_id and m.media_type = 'tv'
    join public.user_shows us on us.media_item_id = m.id and us.user_id = v_user_id
    where e.id = p_episode_id and e.media_item_id = p_media_item_id
  ) then raise exception 'Episode is not in your tracked show'; end if;
  delete from public.watched_episodes
  where user_id = v_user_id and episode_id = p_episode_id;
end;
$$;

create function public.update_episode_watched_at(
  p_media_item_id uuid,
  p_episode_id uuid,
  p_watched_at timestamptz
) returns void
language plpgsql security invoker set search_path = '' as $$
declare v_user_id uuid := auth.uid();
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  if p_media_item_id is null or p_episode_id is null then raise exception 'Show and episode are required'; end if;
  if p_watched_at is null or p_watched_at > now() then raise exception 'Watched date must not be in the future'; end if;
  if not exists (
    select 1 from public.episodes e
    join public.media_items m on m.id = e.media_item_id and m.media_type = 'tv'
    join public.user_shows us on us.media_item_id = m.id and us.user_id = v_user_id
    where e.id = p_episode_id and e.media_item_id = p_media_item_id
      and e.air_date is not null and e.air_date <= current_date
  ) then raise exception 'Released episode is not in your tracked show'; end if;
  update public.watched_episodes set watched_at = p_watched_at
  where user_id = v_user_id and episode_id = p_episode_id;
  if not found then raise exception 'Episode is not marked watched'; end if;
end;
$$;

create function public.set_season_watched(
  p_media_item_id uuid,
  p_season_number integer,
  p_watched boolean,
  p_watched_at timestamptz default now()
) returns void
language plpgsql security invoker set search_path = '' as $$
declare v_user_id uuid := auth.uid();
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  if p_media_item_id is null or p_season_number is null or p_season_number < 0 or p_watched is null then
    raise exception 'Valid show, season, and watched state are required';
  end if;
  if p_watched and (p_watched_at is null or p_watched_at > now()) then raise exception 'Watched date must not be in the future'; end if;
  if not exists (
    select 1 from public.user_shows us join public.media_items m on m.id = us.media_item_id
    where us.user_id = v_user_id and us.media_item_id = p_media_item_id and m.media_type = 'tv'
  ) then raise exception 'Show is not in your library'; end if;
  if p_watched then
    insert into public.watched_episodes (user_id, episode_id, watched_at)
    select v_user_id, e.id, p_watched_at from public.episodes e
    where e.media_item_id = p_media_item_id and e.season_number = p_season_number
      and e.air_date is not null and e.air_date <= current_date
    on conflict (user_id, episode_id) do nothing;
  else
    delete from public.watched_episodes we using public.episodes e
    where we.user_id = v_user_id and we.episode_id = e.id
      and e.media_item_id = p_media_item_id and e.season_number = p_season_number;
  end if;
end;
$$;

create function public.mark_episodes_before(
  p_media_item_id uuid,
  p_season_number integer,
  p_episode_number integer,
  p_watched_at timestamptz default now()
) returns void
language plpgsql security invoker set search_path = '' as $$
declare v_user_id uuid := auth.uid();
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  if p_media_item_id is null or p_season_number is null or p_season_number < 1
     or p_episode_number is null or p_episode_number < 1 then raise exception 'Valid show and episode numbers are required'; end if;
  if p_watched_at is null or p_watched_at > now() then raise exception 'Watched date must not be in the future'; end if;
  if not exists (
    select 1 from public.episodes e join public.user_shows us on us.media_item_id = e.media_item_id
    join public.media_items m on m.id = e.media_item_id and m.media_type = 'tv'
    where us.user_id = v_user_id and e.media_item_id = p_media_item_id
      and e.season_number = p_season_number and e.episode_number = p_episode_number
  ) then raise exception 'Selected episode is not in your tracked show'; end if;
  insert into public.watched_episodes (user_id, episode_id, watched_at)
  select v_user_id, e.id, p_watched_at from public.episodes e
  where e.media_item_id = p_media_item_id and e.season_number > 0
    and (e.season_number, e.episode_number) < (p_season_number, p_episode_number)
    and e.air_date is not null and e.air_date <= current_date
  on conflict (user_id, episode_id) do nothing;
end;
$$;

create function public.initialize_user_show(
  p_media_item_id uuid,
  p_mode text,
  p_season_number integer default null,
  p_episode_number integer default null,
  p_season_numbers integer[] default null,
  p_watched_at timestamptz default now()
) returns void
language plpgsql security invoker set search_path = '' as $$
declare v_user_id uuid := auth.uid();
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  if p_media_item_id is null or p_mode is null or p_mode not in ('start', 'before_episode', 'seasons') then raise exception 'Invalid initialization request'; end if;
  if p_watched_at is null or p_watched_at > now() then raise exception 'Watched date must not be in the future'; end if;
  if not exists (select 1 from public.media_items m where m.id = p_media_item_id and m.media_type = 'tv') then raise exception 'TV show not found'; end if;
  if exists (select 1 from public.user_shows us where us.user_id = v_user_id and us.media_item_id = p_media_item_id) then
    raise exception 'Show is already in your library';
  end if;
  if p_mode = 'before_episode' and (p_season_number is null or p_season_number < 1 or p_episode_number is null or p_episode_number < 1) then
    raise exception 'A valid regular episode is required';
  end if;
  if p_mode = 'before_episode' and not exists (
    select 1 from public.episodes e where e.media_item_id = p_media_item_id
      and e.season_number = p_season_number and e.episode_number = p_episode_number
  ) then raise exception 'Selected episode not found'; end if;
  if p_mode = 'seasons' and (
    p_season_numbers is null or cardinality(p_season_numbers) = 0
    or cardinality(p_season_numbers) > 100
    or exists (select 1 from unnest(p_season_numbers) s where s is null or s < 1)
  ) then raise exception 'At least one valid regular season is required'; end if;
  if p_mode = 'seasons' and cardinality(p_season_numbers) <> (
    select count(distinct selected.season_number)
    from unnest(p_season_numbers) as selected(season_number)
  ) then raise exception 'Duplicate seasons are not allowed'; end if;
  if p_mode = 'seasons' and exists (
    select 1
    from unnest(p_season_numbers) as selected(season_number)
    where not exists (
      select 1
      from public.episodes as e
      where e.media_item_id = p_media_item_id
        and e.season_number = selected.season_number
    )
  ) then raise exception 'Selected season not found'; end if;

  insert into public.user_shows (user_id, media_item_id) values (v_user_id, p_media_item_id);

  if p_mode = 'before_episode' then
    insert into public.watched_episodes (user_id, episode_id, watched_at)
    select v_user_id, e.id, p_watched_at from public.episodes e
    where e.media_item_id = p_media_item_id and e.season_number > 0
      and (e.season_number, e.episode_number) < (p_season_number, p_episode_number)
      and e.air_date is not null and e.air_date <= current_date
    on conflict (user_id, episode_id) do nothing;
  elsif p_mode = 'seasons' then
    insert into public.watched_episodes (user_id, episode_id, watched_at)
    select v_user_id, e.id, p_watched_at from public.episodes e
    where e.media_item_id = p_media_item_id and e.season_number = any (p_season_numbers)
      and e.season_number > 0 and e.air_date is not null and e.air_date <= current_date
    on conflict (user_id, episode_id) do nothing;
  end if;
end;
$$;

revoke execute on function public.mark_episode_watched(uuid, uuid, timestamptz) from public, anon;
revoke execute on function public.mark_episode_unwatched(uuid, uuid) from public, anon;
revoke execute on function public.update_episode_watched_at(uuid, uuid, timestamptz) from public, anon;
revoke execute on function public.set_season_watched(uuid, integer, boolean, timestamptz) from public, anon;
revoke execute on function public.mark_episodes_before(uuid, integer, integer, timestamptz) from public, anon;
revoke execute on function public.initialize_user_show(uuid, text, integer, integer, integer[], timestamptz) from public, anon;

grant execute on function public.mark_episode_watched(uuid, uuid, timestamptz) to authenticated;
grant execute on function public.mark_episode_unwatched(uuid, uuid) to authenticated;
grant execute on function public.update_episode_watched_at(uuid, uuid, timestamptz) to authenticated;
grant execute on function public.set_season_watched(uuid, integer, boolean, timestamptz) to authenticated;
grant execute on function public.mark_episodes_before(uuid, integer, integer, timestamptz) to authenticated;
grant execute on function public.initialize_user_show(uuid, text, integer, integer, integer[], timestamptz) to authenticated;
