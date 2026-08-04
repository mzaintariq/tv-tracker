begin;
select plan(18);

insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
values
  ('00000000-0000-0000-0000-000000000000','1e000000-0000-0000-0000-000000000001','authenticated','authenticated','release-a@example.invalid','',now(),'{}','{}',now(),now()),
  ('00000000-0000-0000-0000-000000000000','1e000000-0000-0000-0000-000000000002','authenticated','authenticated','release-b@example.invalid','',now(),'{}','{}',now(),now());

insert into public.media_items(id,tmdb_id,media_type,title)
values
  ('2e000000-0000-0000-0000-000000000001',8001,'movie','Release Movie'),
  ('2e000000-0000-0000-0000-000000000002',8002,'tv','Release Show');

set local role service_role;
select lives_ok($$insert into public.movie_release_dates(media_item_id,region,release_type,release_date) values ('2e000000-0000-0000-0000-000000000001','PK',3,'2026-08-04')$$,'trusted valid row is accepted');
select throws_ok($$insert into public.movie_release_dates(media_item_id,region,release_type,release_date) values ('2e000000-0000-0000-0000-000000000001','pk',3,'2026-08-04')$$,'23514',null,'invalid region is rejected');
select throws_ok($$insert into public.movie_release_dates(media_item_id,region,release_type,release_date) values ('2e000000-0000-0000-0000-000000000001','PK',7,'2026-08-04')$$,'23514',null,'invalid release type is rejected');
select throws_ok($$insert into public.movie_release_dates(media_item_id,region,release_type,release_date) values ('ffffffff-ffff-ffff-ffff-ffffffffffff','PK',3,'2026-08-04')$$,'23503',null,'missing movie foreign key is rejected');
select throws_ok($$insert into public.movie_release_dates(media_item_id,region,release_type,release_date) values ('2e000000-0000-0000-0000-000000000002','PK',3,'2026-08-04')$$,'23514',null,'TV parent is rejected');
select throws_ok($$insert into public.movie_release_dates(media_item_id,region,release_type,release_date) values ('2e000000-0000-0000-0000-000000000001','PK',3,'2026-08-04')$$,'23505',null,'duplicate meaningful identity is rejected');
select lives_ok($$select public.reconcile_movie_release_dates('2e000000-0000-0000-0000-000000000001','[{"region":"US","release_type":2,"release_date":"2026-07-01","certification":"PG","note":null,"language":"en"},{"region":"US","release_type":2,"release_date":"2026-07-01","certification":"PG","note":null,"language":"en"}]')$$,'trusted reconciliation deduplicates and replaces transactionally');
select is((select count(*)::integer from public.movie_release_dates where media_item_id='2e000000-0000-0000-0000-000000000001'),1,'stale rows are deleted and duplicate input collapses');
select ok((select release_dates_synced_at is not null from public.media_items where id='2e000000-0000-0000-0000-000000000001'),'successful replacement updates freshness');
select throws_matching($$select public.reconcile_movie_release_dates('2e000000-0000-0000-0000-000000000001','[{"region":"USA","release_type":3,"release_date":"2027-01-01"}]')$$,'.*Invalid movie release date snapshot.*','invalid snapshots fail');
select is((select region from public.movie_release_dates where media_item_id='2e000000-0000-0000-0000-000000000001'),'US','failed replacement preserves prior rows');
select throws_matching($$select public.reconcile_movie_release_dates('2e000000-0000-0000-0000-000000000002','[]')$$,'.*parent must be a movie.*','RPC rejects a TV media item');

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','1e000000-0000-0000-0000-000000000001',true);
select is((select count(*)::integer from public.movie_release_dates where media_item_id='2e000000-0000-0000-0000-000000000001'),1,'User A reads the shared fixture metadata');
select throws_ok($$insert into public.movie_release_dates(media_item_id,region,release_type,release_date) values ('2e000000-0000-0000-0000-000000000001','CH',4,'2026-08-05')$$,'42501',null,'authenticated insert is denied');
select throws_ok($$update public.movie_release_dates set note='changed'$$,'42501',null,'authenticated update is denied');
select throws_ok($$delete from public.movie_release_dates$$,'42501',null,'authenticated delete is denied');
select throws_ok($$select public.reconcile_movie_release_dates('2e000000-0000-0000-0000-000000000001','[]')$$,'42501',null,'authenticated RPC execution is denied');
select set_config('request.jwt.claim.sub','1e000000-0000-0000-0000-000000000002',true);
select is((select count(*)::integer from public.movie_release_dates where media_item_id='2e000000-0000-0000-0000-000000000001'),1,'User B reads the same shared fixture metadata');

select * from finish();
rollback;
