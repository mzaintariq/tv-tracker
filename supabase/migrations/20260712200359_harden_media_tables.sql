-- Require valid positive TMDB identifiers.

alter table public.media_items
add constraint media_items_tmdb_id_positive
check (tmdb_id > 0);

-- Reset table grants to explicit least-privilege access.

revoke all privileges
on table public.media_items
from anon, authenticated;

revoke all privileges
on table public.user_shows
from anon, authenticated;

revoke all privileges
on table public.user_movies
from anon, authenticated;

grant select
on table public.media_items
to authenticated;

grant select, insert, update, delete
on table public.user_shows
to authenticated;

grant select, insert, update, delete
on table public.user_movies
to authenticated;

grant all
on table public.media_items
to service_role;

grant all
on table public.user_shows
to service_role;

grant all
on table public.user_movies
to service_role;