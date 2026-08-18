begin;
select plan(20);

select ok(not has_function_privilege('anon', 'public.load_watch_list_projection(date,timestamptz,date)', 'EXECUTE'), 'anonymous cannot execute projection');
select ok(has_function_privilege('authenticated', 'public.load_watch_list_projection(date,timestamptz,date)', 'EXECUTE'), 'authenticated can execute projection');
select ok(not has_function_privilege('service_role', 'public.load_watch_list_projection(date,timestamptz,date)', 'EXECUTE'), 'service role cannot execute owner projection');
select is(to_regprocedure('public.load_watch_list_projection(uuid,date,timestamptz,date)'), null, 'no caller-provided owner overload exists');

insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
values
('00000000-0000-0000-0000-000000000000','19000000-0000-0000-0000-000000000001','authenticated','authenticated','projection-a@example.invalid','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','19000000-0000-0000-0000-000000000002','authenticated','authenticated','projection-b@example.invalid','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','19000000-0000-0000-0000-000000000003','authenticated','authenticated','projection-empty@example.invalid','',now(),'{}','{}',now(),now());

insert into public.media_items(id,tmdb_id,media_type,title,tmdb_status) values
('29000000-0000-0000-0000-000000000001',2901,'tv','Recent Partial','Returning Series'),
('29000000-0000-0000-0000-000000000002',2902,'tv','Stale Partial','Ended'),
('29000000-0000-0000-0000-000000000003',2903,'tv','Future and Special','Returning Series'),
('29000000-0000-0000-0000-000000000004',2904,'tv','Missing Episodes','Returning Series'),
('29000000-0000-0000-0000-000000000005',2905,'tv','Completed Mixed Case','eNdEd'),
('29000000-0000-0000-0000-000000000006',2906,'tv','Paused','Returning Series'),
('29000000-0000-0000-0000-000000000007',2907,'tv','Dropped','Returning Series'),
('29000000-0000-0000-0000-000000000008',2908,'tv','Other User','Returning Series'),
('29000000-0000-0000-0000-000000000009',2909,'tv','Newly Aired','Returning Series');

update public.media_items
set genres = '[{"id":18,"name":"Drama"}]', vote_average = 7.8
where id = '29000000-0000-0000-0000-000000000001';

insert into public.user_shows(id,user_id,media_item_id,status) values
('39000000-0000-0000-0000-000000000001','19000000-0000-0000-0000-000000000001','29000000-0000-0000-0000-000000000001','active'),
('39000000-0000-0000-0000-000000000002','19000000-0000-0000-0000-000000000001','29000000-0000-0000-0000-000000000002','active'),
('39000000-0000-0000-0000-000000000003','19000000-0000-0000-0000-000000000001','29000000-0000-0000-0000-000000000003','active'),
('39000000-0000-0000-0000-000000000004','19000000-0000-0000-0000-000000000001','29000000-0000-0000-0000-000000000004','active'),
('39000000-0000-0000-0000-000000000005','19000000-0000-0000-0000-000000000001','29000000-0000-0000-0000-000000000005','active'),
('39000000-0000-0000-0000-000000000006','19000000-0000-0000-0000-000000000001','29000000-0000-0000-0000-000000000006','paused'),
('39000000-0000-0000-0000-000000000007','19000000-0000-0000-0000-000000000001','29000000-0000-0000-0000-000000000007','dropped'),
('39000000-0000-0000-0000-000000000008','19000000-0000-0000-0000-000000000002','29000000-0000-0000-0000-000000000008','active'),
('39000000-0000-0000-0000-000000000009','19000000-0000-0000-0000-000000000001','29000000-0000-0000-0000-000000000009','active');

insert into public.episodes(id,media_item_id,season_number,episode_number,title,air_date,tmdb_episode_id) values
('59000000-0000-0000-0000-000000000001','29000000-0000-0000-0000-000000000001',1,1,'Watched','2020-01-01',5901),
('59000000-0000-0000-0000-000000000002','29000000-0000-0000-0000-000000000001',1,2,'Next','2020-01-02',5902),
('59000000-0000-0000-0000-000000000003','29000000-0000-0000-0000-000000000002',1,1,'Old watched','2020-01-01',5903),
('59000000-0000-0000-0000-000000000004','29000000-0000-0000-0000-000000000002',1,2,'Old unwatched','2020-01-02',5904),
('59000000-0000-0000-0000-000000000005','29000000-0000-0000-0000-000000000003',0,1,'Special','2026-07-15',5905),
('59000000-0000-0000-0000-000000000006','29000000-0000-0000-0000-000000000003',1,1,'Future','2026-07-16',5906),
('59000000-0000-0000-0000-000000000007','29000000-0000-0000-0000-000000000005',1,1,'Complete','2020-01-01',5907),
('59000000-0000-0000-0000-000000000008','29000000-0000-0000-0000-000000000006',1,1,'Paused episode','2020-01-01',5908),
('59000000-0000-0000-0000-000000000009','29000000-0000-0000-0000-000000000007',1,1,'Dropped episode','2020-01-01',5909),
('59000000-0000-0000-0000-000000000010','29000000-0000-0000-0000-000000000008',1,1,'Private episode','2020-01-01',5910),
('59000000-0000-0000-0000-000000000011','29000000-0000-0000-0000-000000000009',1,1,'Older watched','2020-01-01',5911),
('59000000-0000-0000-0000-000000000012','29000000-0000-0000-0000-000000000009',1,2,'Boundary air','2026-06-15',5912);

insert into public.watched_episodes(user_id,episode_id,watched_at) values
('19000000-0000-0000-0000-000000000001','59000000-0000-0000-0000-000000000001','2026-06-15T12:00:00Z'),
('19000000-0000-0000-0000-000000000001','59000000-0000-0000-0000-000000000003','2026-06-15T11:59:59Z'),
('19000000-0000-0000-0000-000000000001','59000000-0000-0000-0000-000000000005','2026-07-15T00:00:00Z'),
('19000000-0000-0000-0000-000000000001','59000000-0000-0000-0000-000000000007','2026-07-14T00:00:00Z'),
('19000000-0000-0000-0000-000000000001','59000000-0000-0000-0000-000000000011','2020-01-01T00:00:00Z'),
('19000000-0000-0000-0000-000000000002','59000000-0000-0000-0000-000000000010','2026-07-15T00:00:00Z');

set local role authenticated;
select set_config('request.jwt.claim.sub','19000000-0000-0000-0000-000000000003',true);
select is(jsonb_array_length(public.load_watch_list_projection('2026-07-15','2026-06-15T12:00:00Z','2026-06-15')->'shows'),0,'empty owner library is empty');

select set_config('request.jwt.claim.sub','19000000-0000-0000-0000-000000000001',true);
create temporary table projection_result as
select public.load_watch_list_projection('2026-07-15','2026-06-15T12:00:00Z','2026-06-15') value;

select is(jsonb_array_length(value->'shows'),8,'one projection row per owner membership') from projection_result;
select is((select count(*) from jsonb_array_elements(value->'shows') row where row->>'tmdb_id'='2908'),0::bigint,'other user membership is isolated') from projection_result;
select is((select row->>'category' from jsonb_array_elements(value->'shows') row where row->>'tmdb_id'='2901'),'watch_next','exact timestamp boundary is inclusive') from projection_result;
select is((select row->'genres' from jsonb_array_elements(value->'shows') row where row->>'tmdb_id'='2901'),'[{"id": 18, "name": "Drama"}]'::jsonb,'show genres are projected') from projection_result;
select is((select (row->>'vote_average')::numeric from jsonb_array_elements(value->'shows') row where row->>'tmdb_id'='2901'),7.8::numeric,'show rating is projected') from projection_result;
select is((select row->>'category' from jsonb_array_elements(value->'shows') row where row->>'tmdb_id'='2902'),'inactive','older timestamp is inactive') from projection_result;
select is((select row->>'category' from jsonb_array_elements(value->'shows') row where row->>'tmdb_id'='2909'),'watch_next','caller supplied date boundary promotes newly aired episode') from projection_result;
select is((select row->>'category' from jsonb_array_elements(value->'shows') row where row->>'tmdb_id'='2903'),'not_started','Season 0 and future episodes do not affect progress') from projection_result;
select is((select row->>'category' from jsonb_array_elements(value->'shows') row where row->>'tmdb_id'='2904'),'needs_episode_data','no episode rows needs data') from projection_result;
select is((select row->>'category' from jsonb_array_elements(value->'shows') row where row->>'tmdb_id'='2905'),'completed','mixed-case ended status completes') from projection_result;
select is((select row->>'category' from jsonb_array_elements(value->'shows') row where row->>'tmdb_id'='2906'),'paused','paused overrides episode state') from projection_result;
select is((select row->>'category' from jsonb_array_elements(value->'shows') row where row->>'tmdb_id'='2907'),'dropped','dropped overrides episode state') from projection_result;
select is((select row->>'next_episode_id' from jsonb_array_elements(value->'shows') row where row->>'tmdb_id'='2901'),'59000000-0000-0000-0000-000000000002','earliest released unwatched episode is projected') from projection_result;
select is((select count(*) from (select row->>'membership_id' from jsonb_array_elements(value->'shows') row group by row->>'membership_id' having count(*) > 1) duplicates),0::bigint,'joins do not duplicate memberships') from projection_result;
select ok(jsonb_array_length(value->'recently_watched') <= 10,'Recently Watched is bounded to ten') from projection_result;

select * from finish();
rollback;
