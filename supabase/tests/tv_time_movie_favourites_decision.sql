begin;
select plan(14);
insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
('00000000-0000-0000-0000-000000000000','1d000000-0000-0000-0000-000000000001','authenticated','authenticated','decision-one@example.invalid','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','1d000000-0000-0000-0000-000000000002','authenticated','authenticated','decision-two@example.invalid','',now(),'{}','{}',now(),now());
insert into public.imports(id,user_id,source_type,source_fingerprint,status,timestamp_policy,total_items) values
('2d000000-0000-0000-0000-000000000001','1d000000-0000-0000-0000-000000000001','tv_time_gdpr',repeat('a',64),'awaiting_resolution','legacy_epoch_else_created_at_utc',1),
('2d000000-0000-0000-0000-000000000002','1d000000-0000-0000-0000-000000000002','tv_time_gdpr',repeat('b',64),'matching','legacy_epoch_else_created_at_utc',1);
insert into public.source_media_mappings(id,user_id,source_provider,media_type,source_key,source_title,tmdb_id,resolution_status) values
('4d000000-0000-0000-0000-000000000001','1d000000-0000-0000-0000-000000000001','tv_time','movie','confirmed','Confirmed',1,'auto_confirmed'),
('4d000000-0000-0000-0000-000000000002','1d000000-0000-0000-0000-000000000002','tv_time','movie','pending','Pending',null,'unmatched');
insert into public.import_items(user_id,import_id,mapping_id,media_type,source_key,import_mode,match_status,application_status,match_context,source_item_digest) values
('1d000000-0000-0000-0000-000000000001','2d000000-0000-0000-0000-000000000001','4d000000-0000-0000-0000-000000000001','movie','confirmed','watch_next_movie','confirmed','pending','{"version":"1","kind":"movie","releaseDate":null}',repeat('c',64)),
('1d000000-0000-0000-0000-000000000002','2d000000-0000-0000-0000-000000000002','4d000000-0000-0000-0000-000000000002','movie','pending','watch_next_movie','pending','pending','{"version":"1","kind":"movie","releaseDate":null}',repeat('d',64));
insert into public.media_items(id,tmdb_id,media_type,title) values ('5d000000-0000-0000-0000-000000000001',900001,'movie','Existing favourite');
insert into public.user_movies(user_id,media_item_id,is_favourite) values
('1d000000-0000-0000-0000-000000000001','5d000000-0000-0000-0000-000000000001',true),
('1d000000-0000-0000-0000-000000000002','5d000000-0000-0000-0000-000000000001',true);
insert into public.import_issues(id,user_id,import_id,issue_key,issue_type,is_blocking,status,details) values
('3d000000-0000-0000-0000-000000000001','1d000000-0000-0000-0000-000000000001','2d000000-0000-0000-0000-000000000001','favourites','movie_favourites_confirmation',true,'open','{}'),
('3d000000-0000-0000-0000-000000000002','1d000000-0000-0000-0000-000000000002','2d000000-0000-0000-0000-000000000002','favourites','movie_favourites_confirmation',true,'open','{}'),
('3d000000-0000-0000-0000-000000000003','1d000000-0000-0000-0000-000000000002','2d000000-0000-0000-0000-000000000002','other','aggregate_count_discrepancy',true,'open','{}');
select throws_matching($$select public.resolve_tv_time_import_issue('1d000000-0000-0000-0000-000000000001','2d000000-0000-0000-0000-000000000002','3d000000-0000-0000-0000-000000000002','accepted')$$,'.*not safely resolvable.*','Ownership is enforced');
select lives_ok($$select public.resolve_tv_time_import_issue('1d000000-0000-0000-0000-000000000001','2d000000-0000-0000-0000-000000000001','3d000000-0000-0000-0000-000000000001','accepted')$$,'Confirm succeeds');
select is((select status from public.import_issues where id='3d000000-0000-0000-0000-000000000001'),'accepted','Confirm stores accepted');
select is((select status from public.imports where id='2d000000-0000-0000-0000-000000000001'),'ready','Last blocker makes import ready');
select is((select is_favourite from public.user_movies where user_id='1d000000-0000-0000-0000-000000000001'),true,'Confirm preserves existing TrackTV favourites');
select lives_ok($$select public.resolve_tv_time_import_issue('1d000000-0000-0000-0000-000000000002','2d000000-0000-0000-0000-000000000002','3d000000-0000-0000-0000-000000000002','declined')$$,'Decline succeeds while matching');
select is((select status from public.import_issues where id='3d000000-0000-0000-0000-000000000002'),'declined','Decline stores declined');
select is((select status from public.imports where id='2d000000-0000-0000-0000-000000000002'),'matching','Remaining automatic work preserves matching');
select is((select is_favourite from public.user_movies where user_id='1d000000-0000-0000-0000-000000000002'),true,'Decline preserves existing TrackTV favourites');
select is((select count(*)::integer from public.import_issues where id in ('3d000000-0000-0000-0000-000000000001','3d000000-0000-0000-0000-000000000002') and status='open' and is_blocking),0,'Completed decisions are not active blockers');
select is((select resolution->>'accepted' from public.import_issues where id='3d000000-0000-0000-0000-000000000001'),'true','Accepted decision persists affirmative resolution');
select is((select resolution->>'accepted' from public.import_issues where id='3d000000-0000-0000-0000-000000000002'),'false','Declined decision persists negative resolution');
select throws_matching($$select public.resolve_tv_time_import_issue('1d000000-0000-0000-0000-000000000001','2d000000-0000-0000-0000-000000000001','3d000000-0000-0000-0000-000000000001','declined')$$,'.*no longer open.*','Repeated transition is rejected');
select throws_matching($$select public.resolve_tv_time_import_issue('1d000000-0000-0000-0000-000000000002','2d000000-0000-0000-0000-000000000002','3d000000-0000-0000-0000-000000000003','accepted')$$,'.*not manually resolvable.*','Unrelated issue is rejected');
select * from finish();
rollback;
