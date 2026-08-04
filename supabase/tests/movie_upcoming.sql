begin;
select plan(32);
insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
('00000000-0000-0000-0000-000000000000','1b000000-0000-0000-0000-000000000001','authenticated','authenticated','up-a@example.invalid','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','1b000000-0000-0000-0000-000000000002','authenticated','authenticated','up-b@example.invalid','',now(),'{}','{}',now(),now());
insert into public.media_items(id,tmdb_id,media_type,title,release_date) values
('2b000000-0000-0000-0000-000000000001',901,'movie','Zulu',null),
('2b000000-0000-0000-0000-000000000002',902,'movie','Alpha',null),
('2b000000-0000-0000-0000-000000000003',903,'movie','Missing',null),
('2b000000-0000-0000-0000-000000000004',904,'movie','Old no dates','2012-03-12'),
('2b000000-0000-0000-0000-000000000005',905,'movie','Exact year','2025-08-04'),
('2b000000-0000-0000-0000-000000000006',906,'movie','Older than year','2025-08-03'),
('2b000000-0000-0000-0000-000000000007',907,'movie','Old rerelease','2006-01-20'),
('2b000000-0000-0000-0000-000000000008',908,'movie','Ancient regional','2012-03-12'),
('2b000000-0000-0000-0000-000000000009',909,'movie','Today',null),
('2b000000-0000-0000-0000-000000000010',910,'movie','Thirty days',null),
('2b000000-0000-0000-0000-000000000011',911,'movie','Thirty one days',null),
('2b000000-0000-0000-0000-000000000012',912,'movie','Watched recent',null),
('2b000000-0000-0000-0000-000000000013',913,'movie','Watched missing',null),
('2b000000-0000-0000-0000-000000000014',914,'movie','Watched future digital',null),
('2b000000-0000-0000-0000-000000000015',915,'movie','Watched today',null),
('2b000000-0000-0000-0000-000000000016',916,'movie','Watched ancient regional',null);
insert into public.user_movies(id,user_id,media_item_id,watched_at) values
('3b000000-0000-0000-0000-000000000001','1b000000-0000-0000-0000-000000000001','2b000000-0000-0000-0000-000000000001',null),
('3b000000-0000-0000-0000-000000000002','1b000000-0000-0000-0000-000000000001','2b000000-0000-0000-0000-000000000002',now()),
('3b000000-0000-0000-0000-000000000003','1b000000-0000-0000-0000-000000000001','2b000000-0000-0000-0000-000000000003',null),
('3b000000-0000-0000-0000-000000000004','1b000000-0000-0000-0000-000000000002','2b000000-0000-0000-0000-000000000001',null),
('3b000000-0000-0000-0000-000000000005','1b000000-0000-0000-0000-000000000001','2b000000-0000-0000-0000-000000000004',null),
('3b000000-0000-0000-0000-000000000006','1b000000-0000-0000-0000-000000000001','2b000000-0000-0000-0000-000000000005',null),
('3b000000-0000-0000-0000-000000000007','1b000000-0000-0000-0000-000000000001','2b000000-0000-0000-0000-000000000006',null),
('3b000000-0000-0000-0000-000000000008','1b000000-0000-0000-0000-000000000001','2b000000-0000-0000-0000-000000000007',null),
('3b000000-0000-0000-0000-000000000009','1b000000-0000-0000-0000-000000000001','2b000000-0000-0000-0000-000000000008',null),
('3b000000-0000-0000-0000-000000000010','1b000000-0000-0000-0000-000000000001','2b000000-0000-0000-0000-000000000009',null),
('3b000000-0000-0000-0000-000000000011','1b000000-0000-0000-0000-000000000001','2b000000-0000-0000-0000-000000000010',null),
('3b000000-0000-0000-0000-000000000012','1b000000-0000-0000-0000-000000000001','2b000000-0000-0000-0000-000000000011',null),
('3b000000-0000-0000-0000-000000000013','1b000000-0000-0000-0000-000000000001','2b000000-0000-0000-0000-000000000012',now()),
('3b000000-0000-0000-0000-000000000014','1b000000-0000-0000-0000-000000000001','2b000000-0000-0000-0000-000000000013',now()),
('3b000000-0000-0000-0000-000000000015','1b000000-0000-0000-0000-000000000001','2b000000-0000-0000-0000-000000000014',now()),
('3b000000-0000-0000-0000-000000000016','1b000000-0000-0000-0000-000000000001','2b000000-0000-0000-0000-000000000015',now()),
('3b000000-0000-0000-0000-000000000017','1b000000-0000-0000-0000-000000000001','2b000000-0000-0000-0000-000000000016',now());
insert into public.movie_release_dates(media_item_id,region,release_type,release_date) values
('2b000000-0000-0000-0000-000000000001','PK',2,'2026-08-10'),('2b000000-0000-0000-0000-000000000001','PK',3,'2026-08-12'),('2b000000-0000-0000-0000-000000000001','PK',4,'2026-08-20'),
('2b000000-0000-0000-0000-000000000001','PK',5,'2026-08-01'),('2b000000-0000-0000-0000-000000000001','PK',6,'2026-08-02'),('2b000000-0000-0000-0000-000000000001','US',3,'2026-08-05'),
('2b000000-0000-0000-0000-000000000002','PK',3,'2026-08-10'),
('2b000000-0000-0000-0000-000000000007','PK',3,'2026-09-01'),
('2b000000-0000-0000-0000-000000000008','PK',3,'2012-03-12'),
('2b000000-0000-0000-0000-000000000009','PK',4,'2026-08-04'),
('2b000000-0000-0000-0000-000000000010','PK',4,'2026-07-05'),
('2b000000-0000-0000-0000-000000000011','PK',4,'2026-07-04'),
('2b000000-0000-0000-0000-000000000012','PK',4,'2026-07-25'),
('2b000000-0000-0000-0000-000000000014','PK',4,'2026-08-15'),
('2b000000-0000-0000-0000-000000000015','PK',3,'2026-08-04'),
('2b000000-0000-0000-0000-000000000016','PK',3,'2012-03-12');
set local role anon;
select throws_ok($$select * from public.load_movie_upcoming('PK','2026-08-04')$$,'42501',null,'anonymous execution denied');
set local role authenticated; select set_config('request.jwt.claim.sub','1b000000-0000-0000-0000-000000000001',true);
select is((select count(*)::integer from public.load_movie_upcoming('PK','2026-08-04')),10,'eligible regional events include watched and unwatched memberships once');
select is((select theatrical_date::text from public.load_movie_upcoming('PK','2026-08-04') where tmdb_id=901),'2026-08-10','earliest theatrical selected');
select is((select theatrical_type::integer from public.load_movie_upcoming('PK','2026-08-04') where tmdb_id=901),2,'theatrical type preserved');
select is((select digital_date::text from public.load_movie_upcoming('PK','2026-08-04') where tmdb_id=901),'2026-08-20','earliest digital selected');
select is((select theatrical_date from public.load_movie_upcoming('PK','2026-08-04') where tmdb_id=903),null,'null dates retained');
select is((select theatrical_date from public.load_movie_upcoming('US','2026-08-04') where tmdb_id=905),null,'no cross-region fallback');
select is((select count(*)::integer from public.load_movie_upcoming('XX','2026-08-04')),0,'unsupported region returns no rows');
select is((select count(*)::integer from public.load_movie_upcoming(null,'2026-08-04')),0,'null region returns no rows');
select is((select count(*)::integer from public.load_movie_upcoming('PK',null)),0,'null today returns no rows');
select is((select string_agg(tmdb_id::text,',' order by row_number) from (select tmdb_id,row_number() over() from public.load_movie_upcoming('PK','2026-08-04')) q),'909,915,912,910,902,901,914,907,905,903','deterministic Out Now, Coming Soon, then missing ordering');
select is((select count(*)::integer from public.load_movie_upcoming('PK','2026-08-04') where watched_at is not null),4,'watched memberships remain for meaningful regional events');
select is((select count(*)::integer from public.load_movie_upcoming('PK','2026-08-04') where tmdb_id=909),1,'release today is included in Out Now');
select is((select count(*)::integer from public.load_movie_upcoming('PK','2026-08-04') where tmdb_id=910),1,'release exactly 30 days ago is included in Out Now');
select is((select count(*)::integer from public.load_movie_upcoming('PK','2026-08-04') where tmdb_id=911),0,'release 31 days ago is excluded');
select is((select count(*)::integer from public.load_movie_upcoming('PK','2026-08-04') where tmdb_id=908),0,'regional release from 2012 is excluded');
select is((select count(*)::integer from public.load_movie_upcoming('PK','2026-08-04') where tmdb_id=907),1,'future regional rerelease preserves an old general-release movie');
select is((select count(*)::integer from public.load_movie_upcoming('PK','2026-08-04') where tmdb_id=904),0,'old general release with no regional dates is excluded');
select is((select count(*)::integer from public.load_movie_upcoming('PK','2026-08-04') where tmdb_id=905),1,'general release exactly one calendar year ago is included when regional dates are missing');
select is((select count(*)::integer from public.load_movie_upcoming('PK','2026-08-04') where tmdb_id=906),0,'general release older than one calendar year is excluded when regional dates are missing');
select is((date '2028-02-29' - interval '1 year')::date::text,'2027-02-28','one-year cutoff follows PostgreSQL calendar interval semantics across leap day');
select is((select count(*)::integer from public.load_movie_upcoming('PK','2026-08-04') where tmdb_id=903),1,'null general and regional dates remain eligible');
select is((select count(*)::integer from public.load_movie_upcoming('PK','2026-08-04') where tmdb_id=902),1,'watched future theatrical movie remains in Coming Soon');
select is((select count(*)::integer from public.load_movie_upcoming('PK','2026-08-04') where tmdb_id=914),1,'watched future digital movie remains in Coming Soon');
select is((select count(*)::integer from public.load_movie_upcoming('PK','2026-08-04') where tmdb_id=915),1,'watched release today remains in Out Now');
select is((select count(*)::integer from public.load_movie_upcoming('PK','2026-08-04') where tmdb_id=912),1,'watched release ten days ago remains in Out Now');
select is((select count(*)::integer from public.load_movie_upcoming('PK','2026-08-04') where tmdb_id=913),0,'watched no-date movie is excluded');
select is((select count(*)::integer from public.load_movie_upcoming('PK','2026-08-04') where tmdb_id=916),0,'watched movie with only old regional dates is excluded');
delete from public.user_movies where id='3b000000-0000-0000-0000-000000000003';
select is((select count(*)::integer from public.load_movie_upcoming('PK','2026-08-04')),9,'removed memberships excluded');
select is((select count(*)::integer from public.load_movie_upcoming_refresh_candidates(array[901])),1,'refresh candidates are owner scoped');
select set_config('request.jwt.claim.sub','1b000000-0000-0000-0000-000000000002',true);
select is((select count(*)::integer from public.load_movie_upcoming('PK','2026-08-04')),1,'other user sees only own membership');
select is((select count(*)::integer from public.load_movie_upcoming_refresh_candidates(array[902,903])),0,'refresh candidates do not expose another owner');
select * from finish(); rollback;
