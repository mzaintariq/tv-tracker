begin;
select plan(27);

select ok(
  not has_function_privilege('anon', 'public.load_profile_statistics()', 'EXECUTE'),
  'anonymous users cannot execute Profile statistics'
);
select ok(
  not has_function_privilege('anon', 'public.load_profile_favourites()', 'EXECUTE'),
  'anonymous users cannot execute Profile favourites'
);
select ok(
  has_function_privilege('authenticated', 'public.load_profile_statistics()', 'EXECUTE'),
  'authenticated users can execute Profile statistics'
);
select ok(
  has_function_privilege('authenticated', 'public.load_profile_favourites()', 'EXECUTE'),
  'authenticated users can execute Profile favourites'
);
select ok(
  not has_function_privilege('service_role', 'public.load_profile_statistics()', 'EXECUTE'),
  'service role cannot execute owner-context Profile statistics'
);
select ok(
  not has_function_privilege('service_role', 'public.load_profile_favourites()', 'EXECUTE'),
  'service role cannot execute owner-context Profile favourites'
);
select is(
  to_regprocedure('public.load_profile_statistics(uuid)'),
  null,
  'Profile statistics has no caller-provided owner overload'
);

set local role anon;
select throws_ok(
  $$select * from public.load_profile_statistics()$$,
  '42501',
  'permission denied for function load_profile_statistics',
  'anonymous Profile statistics execution is rejected'
);
select throws_ok(
  $$select * from public.load_profile_favourites()$$,
  '42501',
  'permission denied for function load_profile_favourites',
  'anonymous Profile favourites execution is rejected'
);
reset role;

insert into auth.users(
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
values
  ('00000000-0000-0000-0000-000000000000', '11000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'profile-stats-a@example.invalid', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '11000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'profile-stats-b@example.invalid', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '11000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'profile-stats-empty@example.invalid', '', now(), '{}', '{}', now(), now());

insert into public.media_items(
  id,
  tmdb_id,
  media_type,
  title,
  poster_path,
  runtime_minutes,
  average_episode_runtime_minutes,
  tmdb_status
)
values
  ('21000000-0000-0000-0000-000000000001', 2101, 'tv', 'Alpha Ended', '/alpha.jpg', null, 40, 'Ended'),
  ('21000000-0000-0000-0000-000000000002', 2102, 'tv', 'Bravo Returning', '/bravo.jpg', null, 30, 'Returning Series'),
  ('21000000-0000-0000-0000-000000000003', 2103, 'tv', 'Charlie Partial', null, null, null, 'Ended'),
  ('21000000-0000-0000-0000-000000000004', 2104, 'tv', 'Delta Unstarted', null, null, null, 'Returning Series'),
  ('21000000-0000-0000-0000-000000000005', 2105, 'tv', 'Echo No Releases', null, null, null, 'Ended'),
  ('21000000-0000-0000-0000-000000000006', 2106, 'tv', 'Foxtrot Paused', null, null, null, 'Ended'),
  ('21000000-0000-0000-0000-000000000007', 2107, 'tv', 'Golf Mixed Case', null, null, null, 'eNdEd'),
  ('21000000-0000-0000-0000-000000000008', 2108, 'tv', 'Hotel Removed', null, null, 15, 'Ended'),
  ('21000000-0000-0000-0000-000000000009', 2201, 'tv', 'Other User Show', '/other-show.jpg', null, 99, 'Returning Series'),
  ('21000000-0000-0000-0000-000000000010', 2301, 'movie', 'Alpha Movie', '/alpha-movie.jpg', 90, null, null),
  ('21000000-0000-0000-0000-000000000011', 2302, 'movie', 'Zulu Movie', '/zulu-movie.jpg', 120, null, null),
  ('21000000-0000-0000-0000-000000000012', 2303, 'movie', 'Removed Movie', null, 100, null, null),
  ('21000000-0000-0000-0000-000000000013', 2401, 'movie', 'Other User Movie', '/other-movie.jpg', 80, null, null);

insert into public.user_shows(id, user_id, media_item_id, status, is_favourite)
values
  ('31000000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000001', '21000000-0000-0000-0000-000000000001', 'active', true),
  ('31000000-0000-0000-0000-000000000002', '11000000-0000-0000-0000-000000000001', '21000000-0000-0000-0000-000000000002', 'active', true),
  ('31000000-0000-0000-0000-000000000003', '11000000-0000-0000-0000-000000000001', '21000000-0000-0000-0000-000000000003', 'active', false),
  ('31000000-0000-0000-0000-000000000004', '11000000-0000-0000-0000-000000000001', '21000000-0000-0000-0000-000000000004', 'active', false),
  ('31000000-0000-0000-0000-000000000005', '11000000-0000-0000-0000-000000000001', '21000000-0000-0000-0000-000000000005', 'active', false),
  ('31000000-0000-0000-0000-000000000006', '11000000-0000-0000-0000-000000000001', '21000000-0000-0000-0000-000000000006', 'paused', false),
  ('31000000-0000-0000-0000-000000000007', '11000000-0000-0000-0000-000000000001', '21000000-0000-0000-0000-000000000007', 'active', false),
  ('31000000-0000-0000-0000-000000000008', '11000000-0000-0000-0000-000000000001', '21000000-0000-0000-0000-000000000008', 'active', false),
  ('31000000-0000-0000-0000-000000000009', '11000000-0000-0000-0000-000000000002', '21000000-0000-0000-0000-000000000009', 'active', true);

insert into public.user_movies(id, user_id, media_item_id, watched_at, is_favourite)
values
  ('41000000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000001', '21000000-0000-0000-0000-000000000010', null, true),
  ('41000000-0000-0000-0000-000000000002', '11000000-0000-0000-0000-000000000001', '21000000-0000-0000-0000-000000000011', '2025-01-01T00:00:00Z', true),
  ('41000000-0000-0000-0000-000000000003', '11000000-0000-0000-0000-000000000001', '21000000-0000-0000-0000-000000000012', '2025-01-01T00:00:00Z', false),
  ('41000000-0000-0000-0000-000000000004', '11000000-0000-0000-0000-000000000002', '21000000-0000-0000-0000-000000000013', '2025-01-01T00:00:00Z', true);

insert into public.episodes(
  id,
  media_item_id,
  season_number,
  episode_number,
  title,
  air_date,
  runtime_minutes,
  tmdb_episode_id
)
values
  ('51000000-0000-0000-0000-000000000001', '21000000-0000-0000-0000-000000000001', 1, 1, 'Explicit runtime', '2020-01-01', 50, 5101),
  ('51000000-0000-0000-0000-000000000002', '21000000-0000-0000-0000-000000000001', 1, 2, 'Fallback runtime', '2020-01-02', null, 5102),
  ('51000000-0000-0000-0000-000000000003', '21000000-0000-0000-0000-000000000001', 1, 3, 'Future regular', '2999-01-01', 40, 5103),
  ('51000000-0000-0000-0000-000000000004', '21000000-0000-0000-0000-000000000001', 0, 1, 'Watched special', '2020-01-01', 5, 5104),
  ('51000000-0000-0000-0000-000000000005', '21000000-0000-0000-0000-000000000002', 1, 1, 'Caught up regular', '2020-01-01', 30, 5201),
  ('51000000-0000-0000-0000-000000000006', '21000000-0000-0000-0000-000000000002', 1, 2, 'Caught up future', '2999-01-01', 30, 5202),
  ('51000000-0000-0000-0000-000000000007', '21000000-0000-0000-0000-000000000003', 1, 1, 'Partial watched no runtime', '2020-01-01', null, 5301),
  ('51000000-0000-0000-0000-000000000008', '21000000-0000-0000-0000-000000000003', 1, 2, 'Partial unwatched', '2020-01-02', 45, 5302),
  ('51000000-0000-0000-0000-000000000009', '21000000-0000-0000-0000-000000000004', 1, 1, 'Unstarted regular', '2020-01-01', 45, 5401),
  ('51000000-0000-0000-0000-000000000010', '21000000-0000-0000-0000-000000000005', 1, 1, 'Only future regular', '2999-01-01', 45, 5501),
  ('51000000-0000-0000-0000-000000000011', '21000000-0000-0000-0000-000000000005', 0, 1, 'Only special', '2020-01-01', 10, 5502),
  ('51000000-0000-0000-0000-000000000012', '21000000-0000-0000-0000-000000000006', 1, 1, 'Paused watched', '2020-01-01', 20, 5601),
  ('51000000-0000-0000-0000-000000000013', '21000000-0000-0000-0000-000000000007', 1, 1, 'Mixed case ended', '2020-01-01', 25, 5701),
  ('51000000-0000-0000-0000-000000000014', '21000000-0000-0000-0000-000000000008', 1, 1, 'Removed history', '2020-01-01', null, 5801),
  ('51000000-0000-0000-0000-000000000015', '21000000-0000-0000-0000-000000000009', 1, 1, 'Other user watched', '2020-01-01', 99, 5901);

insert into public.watched_episodes(user_id, episode_id, watched_at)
values
  ('11000000-0000-0000-0000-000000000001', '51000000-0000-0000-0000-000000000001', '2025-01-01T00:00:00Z'),
  ('11000000-0000-0000-0000-000000000001', '51000000-0000-0000-0000-000000000002', '2025-01-01T00:00:00Z'),
  ('11000000-0000-0000-0000-000000000001', '51000000-0000-0000-0000-000000000004', '2025-01-01T00:00:00Z'),
  ('11000000-0000-0000-0000-000000000001', '51000000-0000-0000-0000-000000000005', '2025-01-01T00:00:00Z'),
  ('11000000-0000-0000-0000-000000000001', '51000000-0000-0000-0000-000000000007', '2025-01-01T00:00:00Z'),
  ('11000000-0000-0000-0000-000000000001', '51000000-0000-0000-0000-000000000012', '2025-01-01T00:00:00Z'),
  ('11000000-0000-0000-0000-000000000001', '51000000-0000-0000-0000-000000000013', '2025-01-01T00:00:00Z'),
  ('11000000-0000-0000-0000-000000000001', '51000000-0000-0000-0000-000000000014', '2025-01-01T00:00:00Z'),
  ('11000000-0000-0000-0000-000000000002', '51000000-0000-0000-0000-000000000015', '2025-01-01T00:00:00Z')
on conflict (user_id, episode_id) do nothing;

insert into public.watched_episodes(user_id, episode_id, watched_at)
values (
  '11000000-0000-0000-0000-000000000001',
  '51000000-0000-0000-0000-000000000001',
  '2025-01-01T00:00:00Z'
)
on conflict (user_id, episode_id) do nothing;

delete from public.user_shows
where id = '31000000-0000-0000-0000-000000000008';

delete from public.user_movies
where id = '41000000-0000-0000-0000-000000000003';

set local role authenticated;
select set_config('request.jwt.claim.sub', '11000000-0000-0000-0000-000000000001', true);

select is(tracked_shows, 7::bigint, 'only current shows are counted') from public.load_profile_statistics();
select is(episodes_watched, 8::bigint, 'all unique watched history rows are counted, including Season 0 and removed shows') from public.load_profile_statistics();
select is(movies_in_library, 2::bigint, 'only current movie memberships are counted') from public.load_profile_statistics();
select is(movies_watched, 1::bigint, 'only current watched movies are counted') from public.load_profile_statistics();
select is(favourite_shows, 2::bigint, 'favourite show count is correct') from public.load_profile_statistics();
select is(favourite_movies, 2::bigint, 'favourite movie count is correct') from public.load_profile_statistics();
select is(completed_shows, 2::bigint, 'fully watched active ended shows are completed, including status case variants') from public.load_profile_statistics();
select is(caught_up_shows, 1::bigint, 'fully watched active non-ended shows are caught up') from public.load_profile_statistics();
select is(tv_minutes, 185::bigint, 'TV time uses explicit, fallback, zero, Season 0, and removed-history runtimes once each') from public.load_profile_statistics();
select is(movie_minutes, 120::bigint, 'movie time includes only retained watched movies') from public.load_profile_statistics();

select is((select count(*) from public.load_profile_favourites()), 4::bigint, 'only the owner favourites are returned');
select is((select count(*) from public.load_profile_favourites() where media_type = 'tv'), 2::bigint, 'favourite show projections are returned');
select is((select count(*) from public.load_profile_favourites() where media_type = 'movie'), 2::bigint, 'favourite movie projections are returned');

select set_config('request.jwt.claim.sub', '11000000-0000-0000-0000-000000000002', true);
select is(tracked_shows, 1::bigint, 'User B cannot see User A show statistics') from public.load_profile_statistics();
select is(episodes_watched, 1::bigint, 'User B cannot see User A watched history') from public.load_profile_statistics();
select is((select count(*) from public.load_profile_favourites()), 2::bigint, 'User B cannot see User A favourites');

select set_config('request.jwt.claim.sub', '11000000-0000-0000-0000-000000000003', true);
select is(
  (select row(
    tracked_shows,
    episodes_watched,
    movies_in_library,
    movies_watched,
    favourite_shows,
    favourite_movies,
    completed_shows,
    caught_up_shows,
    tv_minutes,
    movie_minutes
  )::text from public.load_profile_statistics()),
  '(0,0,0,0,0,0,0,0,0,0)',
  'empty account statistics contain zero rather than null'
);
select is((select count(*) from public.load_profile_favourites()), 0::bigint, 'empty account favourites are empty');

select * from finish();
rollback;
