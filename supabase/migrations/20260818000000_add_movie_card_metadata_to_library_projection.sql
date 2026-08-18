create or replace function public.load_movie_library_data()
returns jsonb language sql stable security invoker set search_path='' as $$
  select jsonb_build_object('movies',coalesce((
    select jsonb_agg(jsonb_build_object(
      'membership',jsonb_build_object(
        'id',um.id,'user_id',um.user_id,'media_item_id',um.media_item_id,'watched_at',um.watched_at,
        'is_favourite',um.is_favourite,'created_at',um.created_at,'updated_at',um.updated_at
      ),
      'media',jsonb_build_object(
        'id',m.id,'tmdb_id',m.tmdb_id,'title',m.title,'poster_path',m.poster_path,'release_date',m.release_date,
        'genres',m.genres,'vote_average',m.vote_average
      )
    ) order by um.created_at desc,um.id)
    from public.user_movies um
    join public.media_items m on m.id=um.media_item_id and m.media_type='movie'
    where um.user_id=auth.uid()
  ),'[]'::jsonb));
$$;

revoke execute on function public.load_movie_library_data() from public,anon,service_role;
grant execute on function public.load_movie_library_data() to authenticated;
