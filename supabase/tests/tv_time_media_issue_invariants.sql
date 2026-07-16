begin;
select plan(6);
insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
values ('00000000-0000-0000-0000-000000000000','1c000000-0000-0000-0000-000000000001','authenticated','authenticated','issue-invariant@example.invalid','',now(),'{}','{}',now(),now());
insert into public.imports(id,user_id,source_type,source_fingerprint,status,timestamp_policy,total_items,matched_items) values
('2c000000-0000-0000-0000-000000000001','1c000000-0000-0000-0000-000000000001','tv_time_gdpr',repeat('1',64),'awaiting_resolution','legacy_epoch_else_created_at_utc',2,0);
insert into public.source_media_mappings(id,user_id,source_provider,media_type,source_key,source_title,resolution_status) values
('3c000000-0000-0000-0000-000000000001','1c000000-0000-0000-0000-000000000001','tv_time','tv','one','One','ambiguous'),
('3c000000-0000-0000-0000-000000000002','1c000000-0000-0000-0000-000000000001','tv_time','movie','two','Two','unmatched');
insert into public.import_items(id,user_id,import_id,mapping_id,media_type,source_key,import_mode,match_status,application_status,match_context,source_item_digest) values
('4c000000-0000-0000-0000-000000000001','1c000000-0000-0000-0000-000000000001','2c000000-0000-0000-0000-000000000001','3c000000-0000-0000-0000-000000000001','tv','one','history_only','ambiguous','pending','{"version":"1","kind":"tv","coordinates":[]}',repeat('2',64)),
('4c000000-0000-0000-0000-000000000002','1c000000-0000-0000-0000-000000000001','2c000000-0000-0000-0000-000000000001','3c000000-0000-0000-0000-000000000002','movie','two','watched_movie','unmatched','pending','{"version":"1","kind":"movie","releaseDate":null}',repeat('3',64));
insert into public.import_issues(user_id,import_id,import_item_id,issue_key,issue_type,is_blocking,status,details) values
('1c000000-0000-0000-0000-000000000001','2c000000-0000-0000-0000-000000000001','4c000000-0000-0000-0000-000000000001','one','ambiguous_media',true,'open','{}'),
('1c000000-0000-0000-0000-000000000001','2c000000-0000-0000-0000-000000000001','4c000000-0000-0000-0000-000000000002','two','unmatched_media',true,'open','{}');
update public.source_media_mappings set resolution_status='user_confirmed',tmdb_id=123 where id='3c000000-0000-0000-0000-000000000001';
update public.import_items set match_status='confirmed' where id='4c000000-0000-0000-0000-000000000001';
select is((select status from public.import_issues where issue_key='one'),'resolved','confirmed item resolves media issue transactionally');
update public.import_items set match_status='skipped',application_status='skipped',match_context=null where id='4c000000-0000-0000-0000-000000000002';
select is((select status from public.import_issues where issue_key='two'),'skipped','skipped item skips media issue transactionally');
select is((select count(*)::integer from public.import_issues where import_id='2c000000-0000-0000-0000-000000000001' and status='open' and issue_type in ('ambiguous_media','unmatched_media')),0,'no open media issue remains for final items');
update public.import_issues set status='open',resolution=null,resolved_at=null where issue_key='one';
select is((select status from public.import_issues where issue_key='one'),'resolved','confirmed item cannot be given an open media issue');
update public.import_issues set status='open',resolution=null,resolved_at=null where issue_key='two';
select is((select status from public.import_issues where issue_key='two'),'skipped','skipped item cannot be given an open media issue');
select is(public.recalculate_tv_time_import_status('1c000000-0000-0000-0000-000000000001','2c000000-0000-0000-0000-000000000001'),'ready','historical resolved issues do not block readiness');
select * from finish(); rollback;
