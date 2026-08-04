begin;
select plan(16);
insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
('00000000-0000-0000-0000-000000000000','1b000000-0000-0000-0000-000000000001','authenticated','authenticated','up-a@example.invalid','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','1b000000-0000-0000-0000-000000000002','authenticated','authenticated','up-b@example.invalid','',now(),'{}','{}',now(),now());
insert into public.media_items(id,tmdb_id,media_type,title) values
('2b000000-0000-0000-0000-000000000001',901,'movie','Zulu'),('2b000000-0000-0000-0000-000000000002',902,'movie','Alpha'),('2b000000-0000-0000-0000-000000000003',903,'movie','Missing');
insert into public.user_movies(id,user_id,media_item_id,watched_at) values
('3b000000-0000-0000-0000-000000000001','1b000000-0000-0000-0000-000000000001','2b000000-0000-0000-0000-000000000001',null),
('3b000000-0000-0000-0000-000000000002','1b000000-0000-0000-0000-000000000001','2b000000-0000-0000-0000-000000000002',now()),
('3b000000-0000-0000-0000-000000000003','1b000000-0000-0000-0000-000000000001','2b000000-0000-0000-0000-000000000003',null),
('3b000000-0000-0000-0000-000000000004','1b000000-0000-0000-0000-000000000002','2b000000-0000-0000-0000-000000000001',null);
insert into public.movie_release_dates(media_item_id,region,release_type,release_date) values
('2b000000-0000-0000-0000-000000000001','PK',2,'2026-08-10'),('2b000000-0000-0000-0000-000000000001','PK',3,'2026-08-12'),('2b000000-0000-0000-0000-000000000001','PK',4,'2026-08-20'),
('2b000000-0000-0000-0000-000000000001','PK',5,'2026-08-01'),('2b000000-0000-0000-0000-000000000001','PK',6,'2026-08-02'),('2b000000-0000-0000-0000-000000000001','US',3,'2026-08-05'),
('2b000000-0000-0000-0000-000000000002','PK',3,'2026-08-10');
set local role anon;
select throws_ok($$select * from public.load_movie_upcoming('PK','2026-08-04')$$,'42501',null,'anonymous execution denied');
set local role authenticated; select set_config('request.jwt.claim.sub','1b000000-0000-0000-0000-000000000001',true);
select is((select count(*)::integer from public.load_movie_upcoming('PK','2026-08-04')),3,'one row per current membership');
select is((select theatrical_date::text from public.load_movie_upcoming('PK','2026-08-04') where tmdb_id=901),'2026-08-10','earliest theatrical selected');
select is((select theatrical_type::integer from public.load_movie_upcoming('PK','2026-08-04') where tmdb_id=901),2,'theatrical type preserved');
select is((select digital_date::text from public.load_movie_upcoming('PK','2026-08-04') where tmdb_id=901),'2026-08-20','earliest digital selected');
select is((select theatrical_date from public.load_movie_upcoming('PK','2026-08-04') where tmdb_id=903),null,'null dates retained');
select is((select theatrical_date from public.load_movie_upcoming('US','2026-08-04') where tmdb_id=902),null,'no cross-region fallback');
select is((select count(*)::integer from public.load_movie_upcoming('XX','2026-08-04')),0,'unsupported region returns no rows');
select is((select count(*)::integer from public.load_movie_upcoming(null,'2026-08-04')),0,'null region returns no rows');
select is((select count(*)::integer from public.load_movie_upcoming('PK',null)),0,'null today returns no rows');
select is((select string_agg(tmdb_id::text,',' order by row_number) from (select tmdb_id,row_number() over() from public.load_movie_upcoming('PK','2026-08-04')) q),'902,901,903','deterministic coming-soon then missing ordering');
select is((select count(*)::integer from public.load_movie_upcoming('PK','2026-08-04') where watched_at is null),2,'watched and unwatched memberships included');
delete from public.user_movies where id='3b000000-0000-0000-0000-000000000003';
select is((select count(*)::integer from public.load_movie_upcoming('PK','2026-08-04')),2,'removed memberships excluded');
select is((select count(*)::integer from public.load_movie_upcoming_refresh_candidates(array[901])),1,'refresh candidates are owner scoped');
select set_config('request.jwt.claim.sub','1b000000-0000-0000-0000-000000000002',true);
select is((select count(*)::integer from public.load_movie_upcoming('PK','2026-08-04')),1,'other user sees only own membership');
select is((select count(*)::integer from public.load_movie_upcoming_refresh_candidates(array[902,903])),0,'refresh candidates do not expose another owner');
select * from finish(); rollback;
