begin;
select plan(8);

insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
values
('00000000-0000-0000-0000-000000000000','1a000000-0000-0000-0000-000000000001','authenticated','authenticated','upcoming-rpc@example.invalid','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','1a000000-0000-0000-0000-000000000002','authenticated','authenticated','upcoming-rpc-other@example.invalid','',now(),'{}','{}',now(),now());
insert into public.media_items(id,tmdb_id,media_type,title,tmdb_status) values
('2a000000-0000-0000-0000-000000000001',1001,'tv','Active fixture','Returning Series'),
('2a000000-0000-0000-0000-000000000002',1002,'tv','Paused fixture','Returning Series'),
('2a000000-0000-0000-0000-000000000003',1003,'tv','Other fixture','Returning Series');
insert into public.user_shows(user_id,media_item_id,status) values
('1a000000-0000-0000-0000-000000000001','2a000000-0000-0000-0000-000000000001','active'),
('1a000000-0000-0000-0000-000000000001','2a000000-0000-0000-0000-000000000002','paused'),
('1a000000-0000-0000-0000-000000000002','2a000000-0000-0000-0000-000000000003','active');
insert into public.episodes(media_item_id,season_number,episode_number,title,air_date,tmdb_episode_id) values
('2a000000-0000-0000-0000-000000000001',1,1,'Past fixture','2026-07-15',1101),
('2a000000-0000-0000-0000-000000000001',1,2,'Today fixture','2026-07-16',1102),
('2a000000-0000-0000-0000-000000000001',1,3,'Future fixture','2026-07-17',1103),
('2a000000-0000-0000-0000-000000000001',0,1,'Special fixture','2026-07-16',1104),
('2a000000-0000-0000-0000-000000000002',1,1,'Paused future','2026-07-16',1201),
('2a000000-0000-0000-0000-000000000003',1,1,'Other future','2026-07-16',1301);

set local role authenticated;
select set_config('request.jwt.claim.sub','1a000000-0000-0000-0000-000000000001',true);
select is(jsonb_array_length(public.load_upcoming_data('2026-07-16')->'shows'),1,'only current active shows are returned');
select is(jsonb_array_length(public.load_upcoming_data('2026-07-16')->'shows'->0->'episodes'),3,'only today/future cached episodes are returned');
select is((select count(*)::integer from jsonb_array_elements(public.load_upcoming_data('2026-07-16')->'shows'->0->'episodes') e where (e->>'season_number')::integer=0),1,'Season 0 remains available for unchanged application-side exclusion');
select is((public.load_upcoming_data('2026-07-16')->'shows'->0->'media'->>'tmdb_id')::integer,1001,'joined media belongs to the active membership');
select is(jsonb_array_length(public.load_upcoming_refresh_candidates(array[1001,1002,1003])),1,'refresh candidates enforce active ownership');
select is((public.load_upcoming_refresh_candidates(array[1001])->0->>'tmdb_id')::integer,1001,'requested active refresh candidate is returned');
select throws_ok($$select public.load_upcoming_refresh_candidates(array_fill(1,array[101]))$$,'P0001','Invalid Upcoming refresh candidate IDs','refresh candidate input is bounded');
select is(jsonb_array_length(public.load_upcoming_refresh_candidates(array[]::integer[])),0,'empty refresh request is safe');
select * from finish();
rollback;

