-- Shared regional TMDB movie release metadata with independent freshness.

alter table public.media_items
add column release_dates_synced_at timestamptz;

comment on column public.media_items.release_dates_synced_at is
  'Last successful transactional replacement of regional movie release dates. Nullable for TV and failed or not-yet-attempted movie synchronization.';

create table public.movie_release_dates (
  id uuid primary key default gen_random_uuid(),
  media_item_id uuid not null references public.media_items (id) on delete cascade,
  region text not null check (region ~ '^[A-Z]{2}$'),
  release_type smallint not null check (release_type between 1 and 6),
  release_date date not null,
  certification text,
  note text,
  language text check (language is null or language ~ '^[a-z]{2}$'),
  source text not null default 'tmdb' check (source = 'tmdb'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.movie_release_dates is
  'Shared regional TMDB movie release metadata. Authenticated users may read it; only trusted server synchronization may write it.';

create unique index movie_release_dates_identity_idx
  on public.movie_release_dates (
    media_item_id,
    region,
    release_type,
    release_date,
    coalesce(certification, ''),
    coalesce(note, ''),
    coalesce(language, ''),
    source
  );
create index movie_release_dates_movie_region_idx
  on public.movie_release_dates (media_item_id, region);
create index movie_release_dates_region_date_idx
  on public.movie_release_dates (region, release_date);
create index movie_release_dates_movie_region_type_date_idx
  on public.movie_release_dates (media_item_id, region, release_type, release_date);

create trigger movie_release_dates_set_updated_at
before update on public.movie_release_dates
for each row execute function public.set_updated_at();

create function public.enforce_movie_release_date_parent()
returns trigger
language plpgsql
set search_path = '' as $$
begin
  if exists (
    select 1 from public.media_items m
    where m.id = new.media_item_id and m.media_type <> 'movie'
  ) then
    raise exception 'Release date parent must be a movie' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger movie_release_dates_movie_parent
before insert or update of media_item_id on public.movie_release_dates
for each row execute function public.enforce_movie_release_date_parent();

alter table public.movie_release_dates enable row level security;
create policy "Authenticated users can select movie release dates"
on public.movie_release_dates for select to authenticated using (true);

revoke all privileges on table public.movie_release_dates from anon, authenticated;
grant select on table public.movie_release_dates to authenticated;
grant select, insert, update, delete on table public.movie_release_dates to service_role;

create function public.reconcile_movie_release_dates(
  p_media_item_id uuid,
  p_release_dates jsonb
) returns void
language plpgsql
security invoker
set search_path = '' as $$
begin
  if p_media_item_id is null or jsonb_typeof(p_release_dates) <> 'array' then
    raise exception 'Invalid movie release date snapshot';
  end if;
  if not exists (
    select 1 from public.media_items m
    where m.id = p_media_item_id and m.media_type = 'movie'
  ) then
    raise exception 'Release date parent must be a movie';
  end if;
  if exists (
    select 1
    from jsonb_array_elements(p_release_dates) value
    where jsonb_typeof(value) <> 'object'
       or not (value ?& array['region','release_type','release_date'])
       or (value->>'region') !~ '^[A-Z]{2}$'
       or (value->>'release_type') !~ '^[1-6]$'
       or not pg_input_is_valid(value->>'release_date', 'date')
       or (value->>'release_date')::date::text <> value->>'release_date'
       or (value ? 'certification' and jsonb_typeof(value->'certification') not in ('string','null'))
       or (value ? 'note' and jsonb_typeof(value->'note') not in ('string','null'))
       or (value ? 'language' and jsonb_typeof(value->'language') not in ('string','null'))
       or (nullif(value->>'language','') is not null and (value->>'language') !~ '^[a-z]{2}$')
  ) then
    raise exception 'Invalid movie release date snapshot';
  end if;

  delete from public.movie_release_dates where media_item_id = p_media_item_id;
  insert into public.movie_release_dates (
    media_item_id, region, release_type, release_date,
    certification, note, language, source
  )
  select distinct
    p_media_item_id,
    value->>'region',
    (value->>'release_type')::smallint,
    (value->>'release_date')::date,
    nullif(btrim(value->>'certification'), ''),
    nullif(btrim(value->>'note'), ''),
    nullif(value->>'language', ''),
    'tmdb'
  from jsonb_array_elements(p_release_dates) value;

  update public.media_items
  set release_dates_synced_at = now()
  where id = p_media_item_id;
end;
$$;

revoke execute on function public.reconcile_movie_release_dates(uuid,jsonb)
  from public, anon, authenticated;
grant execute on function public.reconcile_movie_release_dates(uuid,jsonb)
  to service_role;
revoke execute on function public.enforce_movie_release_date_parent()
  from public, anon, authenticated, service_role;
