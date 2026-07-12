-- Shared media metadata cache and per-user library / watchlist tables

create table public.media_items (
  id uuid primary key default gen_random_uuid(),
  tmdb_id integer not null,
  media_type text not null
    check (media_type in ('tv', 'movie')),
  title text not null,
  original_title text,
  overview text,
  poster_path text,
  backdrop_path text,
  release_date date,
  imdb_id text,
  runtime_minutes integer
    check (runtime_minutes is null or runtime_minutes > 0),
  average_episode_runtime_minutes integer
    check (
      average_episode_runtime_minutes is null
      or average_episode_runtime_minutes > 0
    ),
  tmdb_status text,
  last_synced_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tmdb_id, media_type)
);

comment on table public.media_items is
  'Shared TMDB metadata cache. Writable only via server admin client.';

create index media_items_media_type_tmdb_id_idx
  on public.media_items (media_type, tmdb_id);

create trigger media_items_set_updated_at
before update on public.media_items
for each row
execute function public.set_updated_at();

create table public.user_shows (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  media_item_id uuid not null references public.media_items (id) on delete restrict,
  status text not null default 'active'
    check (status in ('active', 'paused', 'dropped')),
  is_favourite boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, media_item_id)
);

comment on table public.user_shows is
  'Per-user television library membership and tracking state.';

create index user_shows_user_id_idx on public.user_shows (user_id);
create index user_shows_media_item_id_idx on public.user_shows (media_item_id);

create trigger user_shows_set_updated_at
before update on public.user_shows
for each row
execute function public.set_updated_at();

create table public.user_movies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  media_item_id uuid not null references public.media_items (id) on delete restrict,
  watched_at timestamptz,
  is_favourite boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, media_item_id)
);

comment on table public.user_movies is
  'Per-user movie library. watched_at NULL = Watch Next; non-NULL = Watched.';

create index user_movies_user_id_idx on public.user_movies (user_id);
create index user_movies_media_item_id_idx on public.user_movies (media_item_id);
create index user_movies_user_id_watched_at_idx
  on public.user_movies (user_id, watched_at);

create trigger user_movies_set_updated_at
before update on public.user_movies
for each row
execute function public.set_updated_at();

-- media_items: authenticated users may SELECT only
alter table public.media_items enable row level security;

create policy "Authenticated users can select media items"
on public.media_items
for select
to authenticated
using (true);

grant select on table public.media_items to authenticated;
grant all on table public.media_items to service_role;

-- user_shows: owner-only
alter table public.user_shows enable row level security;

create policy "Users can select their own shows"
on public.user_shows
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can insert their own shows"
on public.user_shows
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can update their own shows"
on public.user_shows
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete their own shows"
on public.user_shows
for delete
to authenticated
using (auth.uid() = user_id);

grant select, insert, update, delete on table public.user_shows to authenticated;
grant all on table public.user_shows to service_role;

-- user_movies: owner-only
alter table public.user_movies enable row level security;

create policy "Users can select their own movies"
on public.user_movies
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can insert their own movies"
on public.user_movies
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can update their own movies"
on public.user_movies
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete their own movies"
on public.user_movies
for delete
to authenticated
using (auth.uid() = user_id);

grant select, insert, update, delete on table public.user_movies to authenticated;
grant all on table public.user_movies to service_role;
