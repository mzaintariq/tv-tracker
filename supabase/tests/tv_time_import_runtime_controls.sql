begin;
select plan(9);

insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
values ('00000000-0000-0000-0000-000000000000','12000000-0000-0000-0000-000000000001','authenticated','authenticated','phase8-controls@example.invalid','',now(),'{}','{}',now(),now());

select public.initialize_tv_time_import(
  '12000000-0000-0000-0000-000000000001',repeat('2',64),'{}','{}',
  '[{"mediaType":"movie","sourceKey":"ambiguous","sourceTitle":"A","releaseDate":null,"importMode":"watch_next_movie","matchContext":{"version":1,"kind":"movie","releaseDate":null},"sourceRecordCount":1,"normalizedEventCount":0,"collapsedEventCount":0,"sourceItemDigest":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"},{"mediaType":"movie","sourceKey":"unmatched","sourceTitle":"B","releaseDate":null,"importMode":"watch_next_movie","matchContext":{"version":1,"kind":"movie","releaseDate":null},"sourceRecordCount":1,"normalizedEventCount":0,"collapsedEventCount":0,"sourceItemDigest":"bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"},{"mediaType":"movie","sourceKey":"leased","sourceTitle":"C","releaseDate":null,"importMode":"watch_next_movie","matchContext":{"version":1,"kind":"movie","releaseDate":null},"sourceRecordCount":1,"normalizedEventCount":0,"collapsedEventCount":0,"sourceItemDigest":"cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc"},{"mediaType":"movie","sourceKey":"pending","sourceTitle":"D","releaseDate":null,"importMode":"watch_next_movie","matchContext":{"version":1,"kind":"movie","releaseDate":null},"sourceRecordCount":1,"normalizedEventCount":0,"collapsedEventCount":0,"sourceItemDigest":"dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd"}]',
  '[]'
) as import_id \gset

update public.import_items set match_status=case source_key when 'ambiguous' then 'ambiguous' when 'unmatched' then 'unmatched' when 'leased' then 'ambiguous' else match_status end where import_id=:'import_id';

select lives_ok(format('select public.confirm_tv_time_import_mapping(%L,%L,%L,101)','12000000-0000-0000-0000-000000000001',:'import_id',(select id from public.import_items where import_id=:'import_id' and source_key='ambiguous')),'ambiguous item can be confirmed while import is matching');
select lives_ok(format('select public.skip_tv_time_import_item(%L,%L,%L)','12000000-0000-0000-0000-000000000001',:'import_id',(select id from public.import_items where import_id=:'import_id' and source_key='unmatched')),'unmatched item can be skipped while import is matching');

update public.import_items set match_claim_token=gen_random_uuid(),match_claimed_at=now(),match_claim_expires_at=now()+interval '5 minutes' where import_id=:'import_id' and source_key='leased';
select throws_matching(format('select public.confirm_tv_time_import_mapping(%L,%L,%L,102)','12000000-0000-0000-0000-000000000001',:'import_id',(select id from public.import_items where import_id=:'import_id' and source_key='leased')),'.*Import item is busy.*','active leased item cannot be confirmed');
select throws_matching(format('select public.skip_tv_time_import_item(%L,%L,%L)','12000000-0000-0000-0000-000000000001',:'import_id',(select id from public.import_items where import_id=:'import_id' and source_key='leased')),'.*Import item is busy.*','active leased item cannot be skipped');
select throws_matching(format('select public.confirm_tv_time_import_mapping(%L,%L,%L,103)','12000000-0000-0000-0000-000000000001',:'import_id',(select id from public.import_items where import_id=:'import_id' and source_key='pending')),'.*not user-resolvable.*','pending item cannot be manually resolved');
select is(public.recalculate_tv_time_import_status('12000000-0000-0000-0000-000000000001',:'import_id'),'matching','resolution during matching preserves matching while pending remains');

select throws_matching(format('select public.delete_tv_time_import(%L,%L)','12000000-0000-0000-0000-000000000001',:'import_id'),'.*active matching work.*','active lease prevents cancellation and deletion');
select ok(exists(select 1 from public.imports where id=:'import_id' and status='matching'),'failed cancellation/delete rolls back without partial state');

update public.import_items set match_claim_token=null,match_claimed_at=null,match_claim_expires_at=null where import_id=:'import_id';
select lives_ok(format('select public.delete_tv_time_import(%L,%L)','12000000-0000-0000-0000-000000000001',:'import_id'),'matching import is transactionally cancelled and deleted without active leases');

select * from finish();
rollback;
