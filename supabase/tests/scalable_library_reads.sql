begin;
select plan(6);

insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
values ('00000000-0000-0000-0000-000000000000','18000000-0000-0000-0000-000000000001','authenticated','authenticated','library-rpc@example.invalid','',now(),'{}','{}',now(),now());
insert into public.media_items(id,tmdb_id,media_type,title) values
('28000000-0000-0000-0000-000000000001',801,'tv','TV fixture'),
('28000000-0000-0000-0000-000000000002',802,'movie','Movie fixture');
insert into public.user_shows(id,user_id,media_item_id) values ('38000000-0000-0000-0000-000000000001','18000000-0000-0000-0000-000000000001','28000000-0000-0000-0000-000000000001');
insert into public.user_movies(id,user_id,media_item_id,watched_at,is_favourite) values ('48000000-0000-0000-0000-000000000001','18000000-0000-0000-0000-000000000001','28000000-0000-0000-0000-000000000002',now(),true);
insert into public.episodes(id,media_item_id,season_number,episode_number,title,tmdb_episode_id) values
('58000000-0000-0000-0000-000000000001','28000000-0000-0000-0000-000000000001',0,1,'Special fixture',5801),
('58000000-0000-0000-0000-000000000002','28000000-0000-0000-0000-000000000001',1,1,'Regular fixture',5802);
insert into public.watched_episodes(user_id,episode_id) values ('18000000-0000-0000-0000-000000000001','58000000-0000-0000-0000-000000000002');

set local role authenticated;
select set_config('request.jwt.claim.sub','18000000-0000-0000-0000-000000000001',true);
select is(jsonb_array_length(public.load_watch_list_episode_data()->'memberships'),1,'show snapshot returns current membership');
select is(jsonb_array_length(public.load_watch_list_episode_data()->'media'),1,'show snapshot returns joined media');
select is(jsonb_array_length(public.load_watch_list_episode_data()->'episodes'),2,'show snapshot is not row-windowed and retains Season 0 for application-side exclusion');
select is(jsonb_array_length(public.load_watch_list_episode_data()->'watched'),1,'show snapshot returns current-library watched rows');
select is(jsonb_array_length(public.load_movie_library_data()->'movies'),1,'movie snapshot returns joined membership and media');
select is((public.load_movie_library_data()->'movies'->0->'membership'->>'is_favourite')::boolean,true,'movie membership state is preserved');
select * from finish();
rollback;

