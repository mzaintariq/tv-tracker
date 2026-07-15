-- Phase 7: prevent future movie watched dates through the direct table API.

drop policy "Users can insert their own movies" on public.user_movies;
create policy "Users can insert their own movies"
on public.user_movies for insert to authenticated
with check (
  auth.uid() = user_id
  and (watched_at is null or watched_at <= now())
);

drop policy "Users can update their own movies" on public.user_movies;
create policy "Users can update their own movies"
on public.user_movies for update to authenticated
using (auth.uid() = user_id)
with check (
  auth.uid() = user_id
  and (watched_at is null or watched_at <= now())
);
