begin;
select plan(9);
insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
values ('00000000-0000-0000-0000-000000000000','16000000-0000-0000-0000-000000000001','authenticated','authenticated','phase8-resume@example.invalid','',now(),'{}','{}',now(),now());
insert into public.imports(id,user_id,source_type,source_fingerprint,status,timestamp_policy,total_items,matched_items,applied_items,skipped_items) values
('26000000-0000-0000-0000-000000000001','16000000-0000-0000-0000-000000000001','tv_time_gdpr',repeat('5',64),'ready','legacy_epoch_else_created_at_utc',6,6,4,2),
('26000000-0000-0000-0000-000000000002','16000000-0000-0000-0000-000000000001','tv_time_gdpr',repeat('6',64),'paused','legacy_epoch_else_created_at_utc',6,6,4,2),
('26000000-0000-0000-0000-000000000003','16000000-0000-0000-0000-000000000001','tv_time_gdpr',repeat('7',64),'applying','legacy_epoch_else_created_at_utc',6,6,4,2),
('26000000-0000-0000-0000-000000000004','16000000-0000-0000-0000-000000000001','tv_time_gdpr',repeat('8',64),'completed','legacy_epoch_else_created_at_utc',6,6,4,2),
('26000000-0000-0000-0000-000000000005','16000000-0000-0000-0000-000000000001','tv_time_gdpr',repeat('9',64),'matching','legacy_epoch_else_created_at_utc',6,6,4,2),
('26000000-0000-0000-0000-000000000006','16000000-0000-0000-0000-000000000001','tv_time_gdpr',repeat('a',64),'awaiting_resolution','legacy_epoch_else_created_at_utc',6,6,4,2);
update public.imports set last_error_code='apply_failed' where id='26000000-0000-0000-0000-000000000002';
select lives_ok($$select public.start_tv_time_import_apply('16000000-0000-0000-0000-000000000001','26000000-0000-0000-0000-000000000001')$$,'ready enters applying');
select lives_ok($$select public.start_tv_time_import_apply('16000000-0000-0000-0000-000000000001','26000000-0000-0000-0000-000000000002')$$,'paused enters applying');
select lives_ok($$select public.start_tv_time_import_apply('16000000-0000-0000-0000-000000000001','26000000-0000-0000-0000-000000000003')$$,'already applying start is idempotent');
select is((select applied_items||':'||skipped_items from public.imports where id='26000000-0000-0000-0000-000000000002'),'4:2','paused resume preserves progress counters');
select ok((select apply_started_at is not null from public.imports where id='26000000-0000-0000-0000-000000000002'),'paused resume records Apply start');
select is((select last_error_code from public.imports where id='26000000-0000-0000-0000-000000000002'),null,'paused resume clears the stale current Apply error');
select throws_matching($$select public.start_tv_time_import_apply('16000000-0000-0000-0000-000000000001','26000000-0000-0000-0000-000000000004')$$,'.*not ready.*','completed cannot resume');
select throws_matching($$select public.start_tv_time_import_apply('16000000-0000-0000-0000-000000000001','26000000-0000-0000-0000-000000000005')$$,'.*not ready.*','matching cannot apply');
select throws_matching($$select public.start_tv_time_import_apply('16000000-0000-0000-0000-000000000001','26000000-0000-0000-0000-000000000006')$$,'.*not ready.*','awaiting resolution cannot apply');
select * from finish();
rollback;
