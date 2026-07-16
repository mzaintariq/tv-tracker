begin;
select plan(1);

insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
values ('00000000-0000-0000-0000-000000000000','13000000-0000-0000-0000-000000000001','authenticated','authenticated','phase8-claims@example.invalid','',now(),'{}','{}',now(),now());
select public.initialize_tv_time_import(
  '13000000-0000-0000-0000-000000000001',repeat('3',64),'{}','{}',
  '[{"mediaType":"movie","sourceKey":"processed","sourceTitle":"Processed","releaseDate":null,"importMode":"watch_next_movie","matchContext":{"version":1,"kind":"movie","releaseDate":null},"sourceRecordCount":1,"normalizedEventCount":0,"collapsedEventCount":0,"sourceItemDigest":"eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee"},{"mediaType":"movie","sourceKey":"pending","sourceTitle":"Pending","releaseDate":null,"importMode":"watch_next_movie","matchContext":{"version":1,"kind":"movie","releaseDate":null},"sourceRecordCount":1,"normalizedEventCount":0,"collapsedEventCount":0,"sourceItemDigest":"ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"}]',
  '[]'
) as import_id \gset
update public.import_items set match_status='unmatched',created_at=now()-interval '1 hour' where import_id=:'import_id' and source_key='processed';
create temporary table claimed as select * from public.claim_import_items_for_matching('13000000-0000-0000-0000-000000000001',:'import_id',1,60);
select is((select source_key from public.import_items where id=(select item_id from claimed)),'pending','automatic claims do not recycle resolution items ahead of pending work');

select * from finish();
rollback;
