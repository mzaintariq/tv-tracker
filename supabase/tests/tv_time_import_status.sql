begin;
select plan(3);

insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
values ('00000000-0000-0000-0000-000000000000','11000000-0000-0000-0000-000000000001','authenticated','authenticated','phase8-status@example.invalid','',now(),'{}','{}',now(),now());

select public.initialize_tv_time_import(
  '11000000-0000-0000-0000-000000000001',repeat('1',64),'{}','{}',
  '[{"mediaType":"movie","sourceKey":"status-a","sourceTitle":"Status A","releaseDate":null,"importMode":"watch_next_movie","matchContext":{"version":1,"kind":"movie","releaseDate":null},"sourceRecordCount":1,"normalizedEventCount":0,"collapsedEventCount":0,"sourceItemDigest":"1111111111111111111111111111111111111111111111111111111111111111"},{"mediaType":"movie","sourceKey":"status-b","sourceTitle":"Status B","releaseDate":null,"importMode":"watch_next_movie","matchContext":{"version":1,"kind":"movie","releaseDate":null},"sourceRecordCount":1,"normalizedEventCount":0,"collapsedEventCount":0,"sourceItemDigest":"2222222222222222222222222222222222222222222222222222222222222222"}]',
  '[]'
) as import_id \gset

update public.import_items set match_status='ambiguous' where import_id=:'import_id' and source_key='status-a';
select is(public.recalculate_tv_time_import_status('11000000-0000-0000-0000-000000000001',:'import_id'),'matching','pending plus ambiguous remains matching');

update public.import_items set match_status='confirmed' where import_id=:'import_id' and source_key='status-b';
select is(public.recalculate_tv_time_import_status('11000000-0000-0000-0000-000000000001',:'import_id'),'awaiting_resolution','ambiguous with no automatic work awaits resolution');

update public.import_items set match_status='confirmed' where import_id=:'import_id';
select is(public.recalculate_tv_time_import_status('11000000-0000-0000-0000-000000000001',:'import_id'),'ready','fully matched import is ready');

select * from finish();
rollback;
