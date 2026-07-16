begin;
select plan(6);
insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
values ('00000000-0000-0000-0000-000000000000','19000000-0000-0000-0000-000000000001','authenticated','authenticated','apply-accounting@example.invalid','',now(),'{}','{}',now(),now());
insert into public.imports(id,user_id,source_type,source_fingerprint,status,timestamp_policy,total_items,matched_items,applied_items,apply_started_at,last_error_code) values
('29000000-0000-0000-0000-000000000001','19000000-0000-0000-0000-000000000001','tv_time_gdpr',repeat('d',64),'applying','legacy_epoch_else_created_at_utc',1,1,1,now(),'apply_failed'),
('29000000-0000-0000-0000-000000000002','19000000-0000-0000-0000-000000000001','tv_time_gdpr',repeat('e',64),'applying','legacy_epoch_else_created_at_utc',2,2,1,now(),'apply_failed');
insert into public.source_media_mappings(id,user_id,source_provider,media_type,source_key,source_title,tmdb_id,resolution_status,confidence)
values ('39000000-0000-0000-0000-000000000001','19000000-0000-0000-0000-000000000001','tv_time','movie','pending-movie','Fixture',901,'auto_confirmed','exact');
insert into public.import_items(user_id,import_id,mapping_id,media_type,source_key,import_mode,match_status,application_status,match_context,source_item_digest) values
('19000000-0000-0000-0000-000000000001','29000000-0000-0000-0000-000000000001',null,'tv','applied-tv','history_only','skipped','applied',null,repeat('1',64)),
('19000000-0000-0000-0000-000000000001','29000000-0000-0000-0000-000000000002',null,'tv','applied-tv','history_only','skipped','applied',null,repeat('2',64)),
('19000000-0000-0000-0000-000000000001','29000000-0000-0000-0000-000000000002','39000000-0000-0000-0000-000000000001','movie','pending-movie','watched_movie','confirmed','blocked','{"version":"1","kind":"movie","releaseDate":null}',repeat('3',64));

select is(public.recalculate_tv_time_import_status('19000000-0000-0000-0000-000000000001','29000000-0000-0000-0000-000000000001'),'completed','fully applied import completes');
select is((select last_error_code from public.imports where id='29000000-0000-0000-0000-000000000001'),null,'successful completion clears stale error');
select is(public.recalculate_tv_time_import_status('19000000-0000-0000-0000-000000000001','29000000-0000-0000-0000-000000000002'),'paused','post-Apply remaining work is resumable');
select is((select last_error_code from public.imports where id='29000000-0000-0000-0000-000000000002'),'apply_items_remaining','remaining work stores safe import reason');
select is((select application_status from public.import_items where import_id='29000000-0000-0000-0000-000000000002' and source_key='applied-tv'),'applied','applied item remains unchanged');
select is((select application_status from public.import_items where import_id='29000000-0000-0000-0000-000000000002' and source_key='pending-movie'),'blocked','retryable unit remains blocked and resumable');
select * from finish();
rollback;

