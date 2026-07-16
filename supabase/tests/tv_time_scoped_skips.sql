begin;
select plan(11);
insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
values ('00000000-0000-0000-0000-000000000000','1b000000-0000-0000-0000-000000000001','authenticated','authenticated','scoped-skips@example.invalid','',now(),'{}','{}',now(),now());
insert into public.imports(id,user_id,source_type,source_fingerprint,status,timestamp_policy,total_items,matched_items)
values ('2b000000-0000-0000-0000-000000000001','1b000000-0000-0000-0000-000000000001','tv_time_gdpr',repeat('f',64),'awaiting_resolution','legacy_epoch_else_created_at_utc',4,2);
insert into public.source_media_mappings(id,user_id,source_provider,media_type,source_key,source_title,tmdb_id,resolution_status,confidence) values
('3b000000-0000-0000-0000-000000000001','1b000000-0000-0000-0000-000000000001','tv_time','tv','tv-unresolved','TV unresolved',null,'ambiguous',null),
('3b000000-0000-0000-0000-000000000002','1b000000-0000-0000-0000-000000000001','tv_time','movie','movie-unresolved','Movie unresolved',null,'unmatched',null),
('3b000000-0000-0000-0000-000000000003','1b000000-0000-0000-0000-000000000001','tv_time','tv','tv-coordinate-a','TV coordinate A',1001,'auto_confirmed','exact'),
('3b000000-0000-0000-0000-000000000004','1b000000-0000-0000-0000-000000000001','tv_time','tv','tv-coordinate-b','TV coordinate B',1002,'auto_confirmed','exact');
insert into public.import_items(id,user_id,import_id,mapping_id,media_type,source_key,import_mode,match_status,application_status,match_context,source_item_digest) values
('4b000000-0000-0000-0000-000000000001','1b000000-0000-0000-0000-000000000001','2b000000-0000-0000-0000-000000000001','3b000000-0000-0000-0000-000000000001','tv','tv-unresolved','history_only','ambiguous','pending','{"version":"1","kind":"tv","coordinates":[]}',repeat('1',64)),
('4b000000-0000-0000-0000-000000000002','1b000000-0000-0000-0000-000000000001','2b000000-0000-0000-0000-000000000001','3b000000-0000-0000-0000-000000000002','movie','movie-unresolved','watched_movie','unmatched','pending','{"version":"1","kind":"movie","releaseDate":null}',repeat('2',64)),
('4b000000-0000-0000-0000-000000000003','1b000000-0000-0000-0000-000000000001','2b000000-0000-0000-0000-000000000001','3b000000-0000-0000-0000-000000000003','tv','tv-coordinate-a','history_only','confirmed','blocked','{"version":"1","kind":"tv","coordinates":[{"seasonNumber":1,"episodeNumber":1},{"seasonNumber":1,"episodeNumber":2}]}',repeat('3',64)),
('4b000000-0000-0000-0000-000000000004','1b000000-0000-0000-0000-000000000001','2b000000-0000-0000-0000-000000000001','3b000000-0000-0000-0000-000000000004','tv','tv-coordinate-b','history_only','confirmed','blocked','{"version":"1","kind":"tv","coordinates":[{"seasonNumber":2,"episodeNumber":1}]}',repeat('4',64));
insert into public.import_issues(user_id,import_id,import_item_id,issue_key,issue_type,is_blocking,status,details) values
('1b000000-0000-0000-0000-000000000001','2b000000-0000-0000-0000-000000000001','4b000000-0000-0000-0000-000000000001','tv-media','ambiguous_media',true,'open','{}'),
('1b000000-0000-0000-0000-000000000001','2b000000-0000-0000-0000-000000000001','4b000000-0000-0000-0000-000000000002','movie-media','unmatched_media',true,'open','{}'),
('1b000000-0000-0000-0000-000000000001','2b000000-0000-0000-0000-000000000001','4b000000-0000-0000-0000-000000000003','coord-a-1','missing_episode_coordinate',true,'open','{"seasonNumber":1,"episodeNumber":1}'),
('1b000000-0000-0000-0000-000000000001','2b000000-0000-0000-0000-000000000001','4b000000-0000-0000-0000-000000000003','coord-a-2','missing_episode_coordinate',true,'open','{"seasonNumber":1,"episodeNumber":2}'),
('1b000000-0000-0000-0000-000000000001','2b000000-0000-0000-0000-000000000001','4b000000-0000-0000-0000-000000000004','coord-b-1','missing_episode_coordinate',true,'open','{"seasonNumber":2,"episodeNumber":1}');

select is(public.skip_unresolved_tv_time_media_by_type('1b000000-0000-0000-0000-000000000001','2b000000-0000-0000-0000-000000000001','tv'),1,'TV bulk skip affects one TV item');
select is((select match_status from public.import_items where id='4b000000-0000-0000-0000-000000000001'),'skipped','TV item is skipped');
select is((select match_status from public.import_items where id='4b000000-0000-0000-0000-000000000002'),'unmatched','movie item is unchanged');
select is(public.recalculate_tv_time_import_status('1b000000-0000-0000-0000-000000000001','2b000000-0000-0000-0000-000000000001'),'awaiting_resolution','legacy open coordinate issues normalize without hiding genuine media blockers');
select is((select count(*)::integer from public.import_issues where import_id='2b000000-0000-0000-0000-000000000001' and issue_type='missing_episode_coordinate' and status='skipped' and not is_blocking),3,'existing coordinate issues normalize to final non-blocking exclusions');
select is(public.skip_missing_tv_time_coordinates('1b000000-0000-0000-0000-000000000001','2b000000-0000-0000-0000-000000000001','4b000000-0000-0000-0000-000000000003'),0,'compatibility coordinate skip has nothing to do');
select is((select count(*)::integer from public.import_issues where import_item_id='4b000000-0000-0000-0000-000000000004' and status='skipped'),1,'other show coordinate is also automatically excluded');
select is((select match_status from public.import_items where id='4b000000-0000-0000-0000-000000000003'),'confirmed','coordinate skip preserves show mapping');
select is((select application_status from public.import_items where id='4b000000-0000-0000-0000-000000000003'),'blocked','coordinate skip does not mark show applied or skipped');
select is(public.skip_missing_tv_time_coordinates('1b000000-0000-0000-0000-000000000001','2b000000-0000-0000-0000-000000000001',null),0,'global compatibility skip is idempotent');
select is((select count(*)::integer from public.import_issues where import_id='2b000000-0000-0000-0000-000000000001' and issue_type='unmatched_media' and status='open'),1,'global coordinate skip preserves media issues');
select * from finish(); rollback;
