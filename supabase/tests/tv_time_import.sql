begin;
select no_plan();

select has_table('public','imports','imports exists');
select has_table('public','source_media_mappings','source mappings exist');
select has_table('public','import_items','import items exist');
select has_table('public','import_issues','import issues exist');
select ok((select bool_and(relrowsecurity) from pg_class where oid in ('public.imports'::regclass,'public.source_media_mappings'::regclass,'public.import_items'::regclass,'public.import_issues'::regclass)),'all import tables use RLS');
select ok(not has_table_privilege('anon','public.imports','SELECT'),'anon cannot read imports');
select ok(not has_table_privilege('authenticated','public.imports','INSERT') and not has_table_privilege('authenticated','public.imports','UPDATE') and not has_table_privilege('authenticated','public.imports','DELETE'),'authenticated users cannot mutate imports directly');
select ok(not has_function_privilege('authenticated','public.initialize_tv_time_import(uuid,text,jsonb,jsonb,jsonb,jsonb)','EXECUTE'),'authenticated cannot initialize through trusted RPC');
select ok(not has_function_privilege('authenticated','public.apply_tv_time_show_import(uuid,uuid,uuid,integer,boolean,jsonb)','EXECUTE'),'authenticated cannot execute TV Apply');
select ok(not has_function_privilege('authenticated','public.apply_tv_time_movie_import_batch(uuid,uuid,jsonb)','EXECUTE'),'authenticated cannot execute movie Apply');
select ok(has_function_privilege('service_role','public.initialize_tv_time_import(uuid,text,jsonb,jsonb,jsonb,jsonb)','EXECUTE'),'service role can initialize');
select ok(has_function_privilege('service_role','public.apply_tv_time_show_import(uuid,uuid,uuid,integer,boolean,jsonb)','EXECUTE'),'service role can apply TV items');
select ok(not has_table_privilege('service_role','public.imports','TRUNCATE') and not has_table_privilege('service_role','public.imports','REFERENCES') and not has_table_privilege('service_role','public.imports','TRIGGER'),'service role table grants are narrowly scoped');
select ok(public.is_valid_candidate_tmdb_ids('{}') and public.is_valid_candidate_tmdb_ids(array[1,2]) and not public.is_valid_candidate_tmdb_ids(array[1,null]::integer[]) and not public.is_valid_candidate_tmdb_ids(array[1,1]) and not public.is_valid_candidate_tmdb_ids(array[0]),'candidate validation rejects null, duplicate, and non-positive IDs');

insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
values
 ('00000000-0000-0000-0000-000000000000','10000000-0000-0000-0000-000000000001','authenticated','authenticated','phase8-a@example.invalid','',now(),'{}','{}',now(),now()),
 ('00000000-0000-0000-0000-000000000000','10000000-0000-0000-0000-000000000002','authenticated','authenticated','phase8-b@example.invalid','',now(),'{}','{}',now(),now());

select throws_ok($$
 insert into public.imports(user_id,source_type,source_fingerprint,status,timestamp_policy)
 values('10000000-0000-0000-0000-000000000001','tv_time_gdpr',repeat('a',64),'matching','legacy_epoch_else_created_at_utc');
 insert into public.source_media_mappings(user_id,source_provider,media_type,source_key,source_title,resolution_status,first_import_id)
 select '10000000-0000-0000-0000-000000000002','tv_time','tv','cross-user','Cross user','unmatched',id from public.imports where source_fingerprint=repeat('a',64)
$$, '23503', null, 'composite FK rejects cross-user references');
delete from public.imports where source_fingerprint=repeat('a',64);

select public.initialize_tv_time_import(
 '10000000-0000-0000-0000-000000000001',repeat('b',64),'{}','{}',
 '[{"mediaType":"tv","sourceKey":"v1:tv:active","sourceTitle":"Active","releaseDate":null,"importMode":"active_membership","matchContext":{"version":1,"kind":"tv","coordinates":[{"seasonNumber":0,"episodeNumber":1},{"seasonNumber":1,"episodeNumber":1}]},"sourceRecordCount":2,"normalizedEventCount":2,"collapsedEventCount":0,"sourceItemDigest":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"},{"mediaType":"tv","sourceKey":"v1:tv:history","sourceTitle":"History","releaseDate":null,"importMode":"history_only","matchContext":{"version":1,"kind":"tv","coordinates":[{"seasonNumber":1,"episodeNumber":1}]},"sourceRecordCount":1,"normalizedEventCount":1,"collapsedEventCount":0,"sourceItemDigest":"bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"},{"mediaType":"movie","sourceKey":"v1:movie:watched","sourceTitle":"Watched","releaseDate":"2020-01-01","importMode":"watched_movie","matchContext":{"version":1,"kind":"movie","releaseDate":"2020-01-01"},"sourceRecordCount":1,"normalizedEventCount":1,"collapsedEventCount":0,"sourceItemDigest":"cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc"},{"mediaType":"movie","sourceKey":"v1:movie:next","sourceTitle":"Next","releaseDate":"2021-01-01","importMode":"watch_next_movie","matchContext":{"version":1,"kind":"movie","releaseDate":"2021-01-01"},"sourceRecordCount":1,"normalizedEventCount":0,"collapsedEventCount":0,"sourceItemDigest":"dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd"}]',
 '[{"issueKey":"movie-favourites-confirmation","issueType":"movie_favourites_confirmation","isBlocking":true,"details":{"itemCount":1}}]'
) as import_id \gset

select is(public.initialize_tv_time_import('10000000-0000-0000-0000-000000000001',repeat('b',64),'{}','{}','[]','[]'),:'import_id'::uuid,'concurrent/repeated Analyze safely reuses initialized fingerprint');
select is((select status from public.imports where id=:'import_id'),'matching','Analyze transitions atomically to matching');
select is((select count(*)::integer from public.import_items where import_id=:'import_id'),4,'Analyze creates all items atomically');

set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',true);
select is((select count(*)::integer from public.imports),1,'owner SELECT sees own import');
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000002',true);
select is((select count(*)::integer from public.imports),0,'second user cannot see another user import');
reset role;

create temporary table first_claim as select * from public.claim_import_items_for_matching('10000000-0000-0000-0000-000000000001',:'import_id',1,30);
create temporary table second_claim as select * from public.claim_import_items_for_matching('10000000-0000-0000-0000-000000000001',:'import_id',1,30);
select is((select count(*)::integer from first_claim),1,'initial claim succeeds');
select isnt((select item_id from first_claim),(select item_id from second_claim),'simultaneous claims exclude already leased item');
update public.import_items
set match_claimed_at=now()-interval '10 minutes',match_claim_expires_at=now()-interval '5 minutes'
where id=(select item_id from first_claim);
create temporary table reclaimed as select * from public.claim_import_items_for_matching('10000000-0000-0000-0000-000000000001',:'import_id',1,30);
select is((select item_id from reclaimed),(select item_id from first_claim),'expired matching lease is reclaimable');
select isnt((select claim_token from reclaimed),(select claim_token from first_claim),'reclaim atomically replaces claim token');
select throws_matching(format('select public.complete_import_match_claim(%L,%L,%L,''confirmed'',101,array[101],''high'',''stale'')','10000000-0000-0000-0000-000000000001',(select item_id from first_claim),(select claim_token from first_claim)),'.*Invalid or expired match claim.*','stale token completion is rejected');
select lives_ok(format('select public.complete_import_match_claim(%L,%L,%L,''confirmed'',101,array[101],''high'',''fresh'')','10000000-0000-0000-0000-000000000001',(select item_id from reclaimed),(select claim_token from reclaimed)),'new token completion succeeds for same user');

update public.source_media_mappings set resolution_status='user_confirmed',tmdb_id=case source_key when 'v1:tv:active' then 101 when 'v1:tv:history' then 102 when 'v1:movie:watched' then 201 else 202 end,candidate_tmdb_ids=array[case source_key when 'v1:tv:active' then 101 when 'v1:tv:history' then 102 when 'v1:movie:watched' then 201 else 202 end],confidence='manual',resolved_at=now() where user_id='10000000-0000-0000-0000-000000000001';
update public.import_items set match_status='confirmed',match_claim_token=null,match_claimed_at=null,match_claim_expires_at=null where import_id=:'import_id';
update public.imports set status='ready',matched_items=4 where id=:'import_id';

insert into public.media_items(id,tmdb_id,media_type,title) values
 ('20000000-0000-0000-0000-000000000101',101,'tv','Active'),('20000000-0000-0000-0000-000000000102',102,'tv','History'),
 ('20000000-0000-0000-0000-000000000201',201,'movie','Watched'),('20000000-0000-0000-0000-000000000202',202,'movie','Next');
insert into public.episodes(id,media_item_id,season_number,episode_number,title,tmdb_episode_id) values
 ('30000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000101',0,1,'Special',1001),
 ('30000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000101',1,1,'Pilot',1002),
 ('30000000-0000-0000-0000-000000000003','20000000-0000-0000-0000-000000000102',1,1,'History Pilot',2001);
insert into public.user_shows(user_id,media_item_id,status,is_favourite) values('10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000101','paused',false);
insert into public.watched_episodes(user_id,episode_id,watched_at) values('10000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000001','2019-01-01T00:00:00Z');
select public.start_tv_time_import_apply('10000000-0000-0000-0000-000000000001',:'import_id');

select lives_ok(format('select public.apply_tv_time_show_import(%L,%L,%L,101,true,%L::jsonb)','10000000-0000-0000-0000-000000000001',:'import_id',(select id from public.import_items where import_id=:'import_id' and source_key='v1:tv:active'),'[{"seasonNumber":0,"episodeNumber":1,"watchedAt":"2024-01-01T00:00:00Z","sourceEventCount":1},{"seasonNumber":1,"episodeNumber":1,"watchedAt":"2024-01-02T00:00:00Z","sourceEventCount":1}]'),'all-resolved TV item applies transactionally');
select is((select status from public.user_shows where media_item_id='20000000-0000-0000-0000-000000000101'),'paused','existing paused/dropped status is preserved');
select ok((select is_favourite from public.user_shows where media_item_id='20000000-0000-0000-0000-000000000101'),'TV favourites are additive');
select is((select watched_at from public.watched_episodes where episode_id='30000000-0000-0000-0000-000000000001'),'2019-01-01T00:00:00Z'::timestamptz,'existing watched date wins');
select ok(exists(select 1 from public.watched_episodes where episode_id='30000000-0000-0000-0000-000000000002'),'Season 0 and regular-season history import');
select lives_ok(format('select public.apply_tv_time_show_import(%L,%L,%L,101,true,''[]''::jsonb)','10000000-0000-0000-0000-000000000001',:'import_id',(select id from public.import_items where import_id=:'import_id' and source_key='v1:tv:active')),'TV Apply is idempotent after completion');

select lives_ok(format('select public.apply_tv_time_show_import(%L,%L,%L,102,false,%L::jsonb)','10000000-0000-0000-0000-000000000001',:'import_id',(select id from public.import_items where import_id=:'import_id' and source_key='v1:tv:history'),'[{"seasonNumber":1,"episodeNumber":1,"watchedAt":"2024-01-01T00:00:00Z","sourceEventCount":1}]'),'history-only TV item applies');
select ok(not exists(select 1 from public.user_shows where user_id='10000000-0000-0000-0000-000000000001' and media_item_id='20000000-0000-0000-0000-000000000102'),'history-only cannot create membership in PostgreSQL');
select ok(exists(select 1 from public.watched_episodes where episode_id='30000000-0000-0000-0000-000000000003'),'history-only still imports watched episodes');

insert into public.source_media_mappings(user_id,source_provider,media_type,source_key,source_title,tmdb_id,resolution_status,candidate_tmdb_ids,confidence,resolved_at,first_import_id,last_import_id)
select '10000000-0000-0000-0000-000000000001','tv_time','tv',key,key,case when key='partition-active-skip' then 102 else 101 end,'user_confirmed',array[case when key='partition-active-skip' then 102 else 101 end],'manual',now(),:'import_id',:'import_id'
from unnest(array['partition-active-skip','partition-overlap','partition-missing-a','partition-missing-b','partition-extra','partition-duplicate']) key;
insert into public.import_items(user_id,import_id,mapping_id,media_type,source_key,import_mode,match_status,application_status,match_context,source_item_digest)
select '10000000-0000-0000-0000-000000000001',:'import_id',m.id,'tv',m.source_key,case when m.source_key='partition-active-skip' then 'active_membership' else 'history_only' end,'confirmed','pending',
 case when m.source_key='partition-missing-a' then '{"version":1,"kind":"tv","coordinates":[{"seasonNumber":0,"episodeNumber":99}]}'::jsonb when m.source_key in ('partition-missing-b','partition-active-skip') then '{"version":1,"kind":"tv","coordinates":[{"seasonNumber":9,"episodeNumber":9}]}'::jsonb else '{"version":1,"kind":"tv","coordinates":[{"seasonNumber":1,"episodeNumber":1}]}'::jsonb end,
 repeat('e',64)
from public.source_media_mappings m where m.last_import_id=:'import_id' and m.source_key like 'partition-%';
update public.imports set total_items=10 where id=:'import_id';
insert into public.import_issues(user_id,import_id,import_item_id,issue_key,issue_type,is_blocking,status,details,resolution,resolved_at)
select '10000000-0000-0000-0000-000000000001',:'import_id',i.id,'item:'||i.id||':coordinate:9:9','missing_episode_coordinate',true,'skipped','{"seasonNumber":9,"episodeNumber":9}','{"accepted":false}',now()
from public.import_items i where i.import_id=:'import_id' and i.source_key='partition-active-skip';
select lives_ok(format('select public.apply_tv_time_show_import(%L,%L,%L,102,false,''[]''::jsonb)','10000000-0000-0000-0000-000000000001',:'import_id',(select id from public.import_items where import_id=:'import_id' and source_key='partition-active-skip')),'one explicitly skipped coordinate forms a valid partition');
select is((select status from public.user_shows where media_item_id='20000000-0000-0000-0000-000000000102'),'active','active_membership inserts membership when absent');

insert into public.import_issues(user_id,import_id,import_item_id,issue_key,issue_type,is_blocking,status,details,resolution,resolved_at)
select '10000000-0000-0000-0000-000000000001',:'import_id',i.id,'item:'||i.id||':coordinate:1:1','missing_episode_coordinate',true,'skipped','{"seasonNumber":1,"episodeNumber":1}','{"accepted":false}',now()
from public.import_items i where i.import_id=:'import_id' and i.source_key='partition-overlap';
select is((public.apply_tv_time_show_import('10000000-0000-0000-0000-000000000001',:'import_id',(select id from public.import_items where import_id=:'import_id' and source_key='partition-overlap'),101,false,'[{"seasonNumber":1,"episodeNumber":1,"watchedAt":"2024-01-01T00:00:00Z","sourceEventCount":1}]')->>'reason'),'invalid_coordinate_partition','skipped/payload overlap is blocked');
select is((public.apply_tv_time_show_import('10000000-0000-0000-0000-000000000001',:'import_id',(select id from public.import_items where import_id=:'import_id' and source_key='partition-extra'),101,false,'[{"seasonNumber":1,"episodeNumber":2,"watchedAt":"2024-01-01T00:00:00Z","sourceEventCount":1}]')->>'reason'),'invalid_coordinate_partition','extra payload coordinate is blocked');
select throws_matching(format('select public.apply_tv_time_show_import(%L,%L,%L,101,false,%L::jsonb)','10000000-0000-0000-0000-000000000001',:'import_id',(select id from public.import_items where import_id=:'import_id' and source_key='partition-duplicate'),'[{"seasonNumber":1,"episodeNumber":1,"watchedAt":"2024-01-01T00:00:00Z","sourceEventCount":1},{"seasonNumber":1,"episodeNumber":1,"watchedAt":"2024-01-01T00:00:00Z","sourceEventCount":1}]'),'.*Duplicate final episode coordinates.*','duplicate payload coordinate is rejected');
select ok((public.apply_tv_time_show_import('10000000-0000-0000-0000-000000000001',:'import_id',(select id from public.import_items where import_id=:'import_id' and source_key='partition-missing-a'),101,false,'[]')->>'blocked') is null,'missing Season 0 coordinate is automatically excluded');
insert into public.import_issues(user_id,import_id,import_item_id,issue_key,issue_type,is_blocking,status,details,resolution,resolved_at)
select '10000000-0000-0000-0000-000000000001',:'import_id',i.id,'item:'||i.id||':coordinate:9:9','missing_episode_coordinate',false,'skipped','{"seasonNumber":9,"episodeNumber":9}','{"action":"automatic_coordinate_exclusion"}',now()
from public.import_items i where i.import_id=:'import_id' and i.source_key='partition-missing-b';
insert into public.episodes(id,media_item_id,tmdb_episode_id,season_number,episode_number,title,air_date,runtime_minutes) values('30000000-0000-0000-0000-000000000099','20000000-0000-0000-0000-000000000101',1099,9,9,'Later metadata','2020-01-01',45);
select ok((public.apply_tv_time_show_import('10000000-0000-0000-0000-000000000001',:'import_id',(select id from public.import_items where import_id=:'import_id' and source_key='partition-missing-b'),101,false,'[{"seasonNumber":9,"episodeNumber":9,"watchedAt":"2021-02-03T04:05:06Z","sourceEventCount":1}]')->>'blocked') is null,'automatic exclusion becomes a resolved payload coordinate');
select is((select status from public.import_issues where import_item_id=(select id from public.import_items where import_id=:'import_id' and source_key='partition-missing-b') and issue_type='missing_episode_coordinate'),'resolved','automatic exclusion remains as resolved historical notice');
select is((select resolution->>'action' from public.import_issues where import_item_id=(select id from public.import_items where import_id=:'import_id' and source_key='partition-missing-b') and issue_type='missing_episode_coordinate'),'coordinate_became_resolvable','historical notice records later metadata reconciliation');
select is((select watched_at from public.watched_episodes where episode_id='30000000-0000-0000-0000-000000000099'),'2021-02-03T04:05:06Z'::timestamptz,'newly resolvable coordinate preserves its source watched date');
select is((select count(*)::integer from public.import_issues where import_id=:'import_id' and issue_type='missing_episode_coordinate' and details='{"seasonNumber":9,"episodeNumber":9}'::jsonb),2,'item-specific issue keys prevent same-coordinate collisions across shows');
select is((select count(*)::integer from public.import_issues where import_id=:'import_id' and issue_type='missing_episode_coordinate' and is_blocking),0,'automatic coordinate notices remain non-blocking');

select throws_matching(format('select public.apply_tv_time_movie_import_batch(%L,%L,%L::jsonb)','10000000-0000-0000-0000-000000000001',:'import_id',format('[{"importItemId":"%s","tmdbId":201,"watchedAt":null,"isFavourite":false}]',(select id from public.import_items where import_id=:'import_id' and source_key='v1:movie:watched'))),'.*Movie payload conflicts with import mode.*','watched_movie requires watched_at');
select throws_matching(format('select public.apply_tv_time_movie_import_batch(%L,%L,%L::jsonb)','10000000-0000-0000-0000-000000000001',:'import_id',format('[{"importItemId":"%s","tmdbId":202,"watchedAt":"2024-01-01T00:00:00Z","isFavourite":false}]',(select id from public.import_items where import_id=:'import_id' and source_key='v1:movie:next'))),'.*Movie payload conflicts with import mode.*','watch_next_movie forbids watched_at');
select throws_matching(format('select public.apply_tv_time_movie_import_batch(%L,%L,%L::jsonb)','10000000-0000-0000-0000-000000000001',:'import_id',format('[{"importItemId":"%s","tmdbId":201,"watchedAt":"2024-01-01T00:00:00Z","isFavourite":true}]',(select id from public.import_items where import_id=:'import_id' and source_key='v1:movie:watched'))),'.*Movie favourites were not confirmed.*','unresolved movie favourite decision is enforced');
update public.import_issues set status='declined',resolved_at=now() where import_id=:'import_id' and issue_type='movie_favourites_confirmation';
select throws_matching(format('select public.apply_tv_time_movie_import_batch(%L,%L,%L::jsonb)','10000000-0000-0000-0000-000000000001',:'import_id',format('[{"importItemId":"%s","tmdbId":201,"watchedAt":"2024-01-01T00:00:00Z","isFavourite":true}]',(select id from public.import_items where import_id=:'import_id' and source_key='v1:movie:watched'))),'.*Movie favourites were not confirmed.*','declined movie favourite decision is enforced');
update public.import_issues set status='accepted',resolved_at=now() where import_id=:'import_id' and issue_type='movie_favourites_confirmation';
insert into public.user_movies(user_id,media_item_id,watched_at,is_favourite) values('10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000201','2018-01-01T00:00:00Z',true);
select lives_ok(format('select public.apply_tv_time_movie_import_batch(%L,%L,%L::jsonb)','10000000-0000-0000-0000-000000000001',:'import_id',format('[{"importItemId":"%s","tmdbId":201,"watchedAt":"2024-01-01T00:00:00Z","isFavourite":true}]',(select id from public.import_items where import_id=:'import_id' and source_key='v1:movie:watched'))),'accepted movie favourite applies');
select is((select watched_at from public.user_movies where media_item_id='20000000-0000-0000-0000-000000000201'),'2018-01-01T00:00:00Z'::timestamptz,'existing movie watched date wins');
select ok((select is_favourite from public.user_movies where media_item_id='20000000-0000-0000-0000-000000000201'),'existing movie favourite remains true');
select lives_ok(format('select public.apply_tv_time_movie_import_batch(%L,%L,%L::jsonb)','10000000-0000-0000-0000-000000000001',:'import_id',format('[{"importItemId":"%s","tmdbId":202,"watchedAt":null,"isFavourite":false}]',(select id from public.import_items where import_id=:'import_id' and source_key='v1:movie:next'))),'watch-next movie applies without clearing state');

select lives_ok(format('select public.set_tv_time_import_paused(%L,%L,true)','10000000-0000-0000-0000-000000000001',:'import_id'),'Pause serializes with Apply and succeeds from applying');
select is((select status from public.imports where id=:'import_id'),'paused','Pause transition is persisted');
select lives_ok(format('select public.set_tv_time_import_paused(%L,%L,false)','10000000-0000-0000-0000-000000000001',:'import_id'),'paused import can return to ready');
select public.start_tv_time_import_apply('10000000-0000-0000-0000-000000000001',:'import_id');
select throws_matching(format('select public.delete_tv_time_import(%L,%L)','10000000-0000-0000-0000-000000000001',:'import_id'),'.*active apply work.*','delete is rejected while applying');
select throws_matching($$select public.forget_tv_time_import_data('10000000-0000-0000-0000-000000000001')$$,'.*active work.*','forget-all is rejected while applying');
select public.initialize_tv_time_import('10000000-0000-0000-0000-000000000002',repeat('f',64),'{}','{}','[]','[]') as disposable_import \gset
update public.imports set status='cancelled' where id=:'disposable_import';
select lives_ok(format('select public.delete_tv_time_import(%L,%L)','10000000-0000-0000-0000-000000000002',:'disposable_import'),'safe cancelled session can be deleted');
select ok(not exists(select 1 from public.imports where id=:'disposable_import'),'delete-session removes only the selected owner session');
update public.imports set status='completed' where id=:'import_id';
select lives_ok($$select public.forget_tv_time_import_data('10000000-0000-0000-0000-000000000001')$$,'forget-all succeeds in a safe state');
select ok(not exists(select 1 from public.imports where user_id='10000000-0000-0000-0000-000000000001'),'forget-all deletes import metadata');
select ok(exists(select 1 from public.user_shows where user_id='10000000-0000-0000-0000-000000000001') and exists(select 1 from public.watched_episodes where user_id='10000000-0000-0000-0000-000000000001') and exists(select 1 from public.user_movies where user_id='10000000-0000-0000-0000-000000000001'),'imported TrackTV library and history survive metadata deletion');

select * from finish();
rollback;
