begin;
select plan(9);
insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
('00000000-0000-0000-0000-000000000000','15000000-0000-0000-0000-000000000001','authenticated','authenticated','episode-a@example.invalid','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','15000000-0000-0000-0000-000000000002','authenticated','authenticated','episode-b@example.invalid','',now(),'{}','{}',now(),now());
insert into public.media_items(id,tmdb_id,media_type,title) values('25000000-0000-0000-0000-000000000001',9001,'tv','Reconciliation fixture');
insert into public.episodes(id,media_item_id,season_number,episode_number,title,tmdb_episode_id) values
('35000000-0000-0000-0000-000000000001','25000000-0000-0000-0000-000000000001',1,1,'Old','101'),
('35000000-0000-0000-0000-000000000002','25000000-0000-0000-0000-000000000001',1,2,'Stale','999');
insert into public.watched_episodes(user_id,episode_id,watched_at) values
('15000000-0000-0000-0000-000000000001','35000000-0000-0000-0000-000000000001','2020-01-01T00:00:00Z'),
('15000000-0000-0000-0000-000000000001','35000000-0000-0000-0000-000000000002','2022-01-01T00:00:00Z'),
('15000000-0000-0000-0000-000000000002','35000000-0000-0000-0000-000000000002','2021-01-01T00:00:00Z');
select lives_ok($$select public.reconcile_show_episodes('25000000-0000-0000-0000-000000000001','[{"tmdb_episode_id":101,"season_number":1,"episode_number":2,"title":"Moved","air_date":"2024-01-01","runtime_minutes":42,"last_synced_at":"2026-01-01T00:00:00Z"}]')$$,'identity move reconciles occupied destination');
select is((select id from public.episodes where tmdb_episode_id=101),'35000000-0000-0000-0000-000000000001'::uuid,'identity move preserves local episode ID');
select is((select season_number||':'||episode_number from public.episodes where tmdb_episode_id=101),'1:2','authoritative identity moves to new coordinates');
select is((select watched_at from public.watched_episodes where user_id='15000000-0000-0000-0000-000000000001' and episode_id='35000000-0000-0000-0000-000000000001'),'2020-01-01T00:00:00Z'::timestamptz,'existing authoritative watched date is preserved');
select ok(exists(select 1 from public.watched_episodes where user_id='15000000-0000-0000-0000-000000000002' and episode_id='35000000-0000-0000-0000-000000000001') and not exists(select 1 from public.episodes where id='35000000-0000-0000-0000-000000000002'),'stale-row watched history is merged before deletion');
select lives_ok($$select public.reconcile_show_episodes('25000000-0000-0000-0000-000000000001','[{"tmdb_episode_id":101,"season_number":1,"episode_number":2,"title":"Updated","air_date":"2024-01-01","runtime_minutes":43,"last_synced_at":"2026-01-02T00:00:00Z"}]')$$,'unchanged identity updates and repeated synchronization is idempotent');
select is((select count(*)::integer from public.episodes where media_item_id='25000000-0000-0000-0000-000000000001'),1,'idempotent synchronization creates no additional rows');
select throws_matching($$select public.reconcile_show_episodes('25000000-0000-0000-0000-000000000001','[{"tmdb_episode_id":201,"season_number":2,"episode_number":1,"title":"A","last_synced_at":"2026-01-01T00:00:00Z"},{"tmdb_episode_id":201,"season_number":2,"episode_number":2,"title":"B","last_synced_at":"2026-01-01T00:00:00Z"}]')$$,'.*Invalid episode snapshot.*','duplicate incoming TMDB IDs fail transactionally');
select throws_matching($$select public.reconcile_show_episodes('25000000-0000-0000-0000-000000000001','[{"tmdb_episode_id":201,"season_number":2,"episode_number":1,"title":"A","last_synced_at":"2026-01-01T00:00:00Z"},{"tmdb_episode_id":202,"season_number":2,"episode_number":1,"title":"B","last_synced_at":"2026-01-01T00:00:00Z"}]')$$,'.*Invalid episode snapshot.*','duplicate incoming coordinates fail transactionally');
select * from finish();
rollback;
