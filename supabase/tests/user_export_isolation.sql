begin;
select plan(12);

insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
values
  ('00000000-0000-0000-0000-000000000000','19000000-0000-0000-0000-000000000001','authenticated','authenticated','export-a@example.invalid','',now(),'{}','{}',now(),now()),
  ('00000000-0000-0000-0000-000000000000','19000000-0000-0000-0000-000000000002','authenticated','authenticated','export-b@example.invalid','',now(),'{}','{}',now(),now());

update public.profiles set display_name='Export A' where id='19000000-0000-0000-0000-000000000001';
update public.profiles set display_name='Export B' where id='19000000-0000-0000-0000-000000000002';

insert into public.media_items(id,tmdb_id,media_type,title) values
  ('29000000-0000-0000-0000-000000000001',9101,'tv','A current show'),
  ('29000000-0000-0000-0000-000000000002',9102,'tv','A removed show'),
  ('29000000-0000-0000-0000-000000000003',9103,'movie','A movie'),
  ('29000000-0000-0000-0000-000000000004',9201,'tv','B show'),
  ('29000000-0000-0000-0000-000000000005',9202,'movie','B movie');

insert into public.episodes(id,media_item_id,season_number,episode_number,title,tmdb_episode_id,air_date) values
  ('39000000-0000-0000-0000-000000000001','29000000-0000-0000-0000-000000000001',1,1,'A current episode',39101,'2020-01-01'),
  ('39000000-0000-0000-0000-000000000002','29000000-0000-0000-0000-000000000002',0,1,'A removed special',39102,'2020-01-01'),
  ('39000000-0000-0000-0000-000000000003','29000000-0000-0000-0000-000000000004',1,1,'B episode',39201,'2020-01-01');

insert into public.user_shows(user_id,media_item_id) values
  ('19000000-0000-0000-0000-000000000001','29000000-0000-0000-0000-000000000001'),
  ('19000000-0000-0000-0000-000000000001','29000000-0000-0000-0000-000000000002'),
  ('19000000-0000-0000-0000-000000000002','29000000-0000-0000-0000-000000000004');
insert into public.user_movies(user_id,media_item_id) values
  ('19000000-0000-0000-0000-000000000001','29000000-0000-0000-0000-000000000003'),
  ('19000000-0000-0000-0000-000000000002','29000000-0000-0000-0000-000000000005');
insert into public.watched_episodes(user_id,episode_id,watched_at) values
  ('19000000-0000-0000-0000-000000000001','39000000-0000-0000-0000-000000000001','2021-01-01T00:00:00Z'),
  ('19000000-0000-0000-0000-000000000001','39000000-0000-0000-0000-000000000002','2021-01-02T00:00:00Z'),
  ('19000000-0000-0000-0000-000000000002','39000000-0000-0000-0000-000000000003','2021-01-03T00:00:00Z');
delete from public.user_shows where user_id='19000000-0000-0000-0000-000000000001' and media_item_id='29000000-0000-0000-0000-000000000002';

set local role authenticated;
select set_config('request.jwt.claim.sub','19000000-0000-0000-0000-000000000001',true);
select is((select count(*)::integer from public.profiles),1,'export owner sees one profile');
select is((select display_name from public.profiles),'Export A','export owner sees only own profile');
select is((select count(*)::integer from public.user_shows),1,'export owner sees only own current show membership');
select is((select count(*)::integer from public.user_movies),1,'export owner sees only own movie membership');
select is((select count(*)::integer from public.watched_episodes),2,'export owner sees current and removed-show history only');
select ok(exists(select 1 from public.watched_episodes where episode_id='39000000-0000-0000-0000-000000000002'),'removed-show history remains readable by its owner');
select is((select count(*)::integer from public.episodes where id in (select episode_id from public.watched_episodes)),2,'episode metadata path is bounded by owner-visible watched IDs');
select is((select count(*)::integer from public.media_items where id in (
  select media_item_id from public.user_shows union select media_item_id from public.user_movies union
  select media_item_id from public.episodes where id in (select episode_id from public.watched_episodes)
)),3,'media metadata path is bounded by owner-visible membership and history IDs');

select set_config('request.jwt.claim.sub','19000000-0000-0000-0000-000000000002',true);
select is((select count(*)::integer from public.profiles),1,'second user sees one profile');
select is((select display_name from public.profiles),'Export B','second user cannot see first user profile');
select is((select count(*)::integer from public.user_shows),1,'second user cannot see first user shows');
select is((select count(*)::integer from public.watched_episodes),1,'second user cannot see first user history');

select * from finish();
rollback;
