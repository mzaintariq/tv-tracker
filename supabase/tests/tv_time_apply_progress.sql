begin;
select plan(6);

insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
values
('00000000-0000-0000-0000-000000000000','17000000-0000-0000-0000-000000000001','authenticated','authenticated','phase8-progress@example.invalid','',now(),'{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','17000000-0000-0000-0000-000000000002','authenticated','authenticated','phase8-progress-other@example.invalid','',now(),'{}','{}',now(),now());

insert into public.imports(id,user_id,source_type,source_fingerprint,status,timestamp_policy,total_items,matched_items,last_error_code)
values
('27000000-0000-0000-0000-000000000001','17000000-0000-0000-0000-000000000001','tv_time_gdpr',repeat('b',64),'paused','legacy_epoch_else_created_at_utc',7,7,'apply_failed'),
('27000000-0000-0000-0000-000000000002','17000000-0000-0000-0000-000000000002','tv_time_gdpr',repeat('c',64),'applying','legacy_epoch_else_created_at_utc',0,0,null);

insert into public.import_items(user_id,import_id,media_type,source_key,import_mode,match_status,application_status,match_context,source_item_digest)
values
('17000000-0000-0000-0000-000000000001','27000000-0000-0000-0000-000000000001','tv','tv-applied','history_only','skipped','applied',null,repeat('1',64)),
('17000000-0000-0000-0000-000000000001','27000000-0000-0000-0000-000000000001','tv','tv-blocked','history_only','pending','blocked','{"version":"1","kind":"tv","coordinates":[]}',repeat('2',64)),
('17000000-0000-0000-0000-000000000001','27000000-0000-0000-0000-000000000001','tv','tv-pending','history_only','pending','pending','{"version":"1","kind":"tv","coordinates":[]}',repeat('3',64)),
('17000000-0000-0000-0000-000000000001','27000000-0000-0000-0000-000000000001','tv','tv-skipped','history_only','skipped','skipped',null,repeat('4',64)),
('17000000-0000-0000-0000-000000000001','27000000-0000-0000-0000-000000000001','movie','movie-applied','watched_movie','skipped','applied',null,repeat('5',64)),
('17000000-0000-0000-0000-000000000001','27000000-0000-0000-0000-000000000001','movie','movie-pending','watched_movie','pending','pending','{"version":"1","kind":"movie","releaseDate":null}',repeat('6',64)),
('17000000-0000-0000-0000-000000000001','27000000-0000-0000-0000-000000000001','movie','movie-skipped','watched_movie','skipped','skipped',null,repeat('7',64));

set local role authenticated;
select set_config('request.jwt.claim.sub','17000000-0000-0000-0000-000000000001',true);

select is((public.get_tv_time_import_apply_progress('27000000-0000-0000-0000-000000000001')->>'status'),'paused','returns persisted status');
select is((public.get_tv_time_import_apply_progress('27000000-0000-0000-0000-000000000001')->>'tvTotalEligible'),'3','TV denominator excludes skipped items');
select is((public.get_tv_time_import_apply_progress('27000000-0000-0000-0000-000000000001')->>'tvBlocked'),'1','blocked TV units remain separate');
select is((public.get_tv_time_import_apply_progress('27000000-0000-0000-0000-000000000001')->>'movieTotalEligible'),'2','movie denominator excludes skipped items');
select is((public.get_tv_time_import_apply_progress('27000000-0000-0000-0000-000000000001')->>'movieSkipped'),'1','movie skipped count remains separate');
select is(public.get_tv_time_import_apply_progress('27000000-0000-0000-0000-000000000002'),null::jsonb,'another user import is not visible');

select * from finish();
rollback;

