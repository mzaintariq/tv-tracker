begin;
select plan(11);

insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
values
  ('00000000-0000-0000-0000-000000000000','1a000000-0000-0000-0000-000000000001','authenticated','authenticated','region-a@example.invalid','',now(),'{}','{}',now(),now()),
  ('00000000-0000-0000-0000-000000000000','1a000000-0000-0000-0000-000000000002','authenticated','authenticated','region-b@example.invalid','',now(),'{}','{}',now(),now());

select is((select region from public.profiles where id='1a000000-0000-0000-0000-000000000001'),null,'existing profile shape keeps region null');
select lives_ok($$update public.profiles set region=null where id='1a000000-0000-0000-0000-000000000001'$$,'null region is accepted');
select lives_ok($$update public.profiles set region='PK' where id='1a000000-0000-0000-0000-000000000001'$$,'uppercase two-letter region is accepted');
select throws_ok($$update public.profiles set region='pk' where id='1a000000-0000-0000-0000-000000000001'$$,'23514',null,'lowercase direct database value is rejected');
select throws_ok($$update public.profiles set region='USA' where id='1a000000-0000-0000-0000-000000000001'$$,'23514',null,'invalid region length is rejected');
select throws_ok($$update public.profiles set region='1A' where id='1a000000-0000-0000-0000-000000000001'$$,'23514',null,'non-letter region is rejected');

set local role authenticated;
select set_config('request.jwt.claim.sub','1a000000-0000-0000-0000-000000000001',true);
select is((select count(*)::integer from public.profiles),1,'owner reads only their profile settings');
select lives_ok($$update public.profiles set region='CH' where id='1a000000-0000-0000-0000-000000000001'$$,'owner can update their region');
select is((select region from public.profiles),'CH','owner reads their saved region');
select lives_ok($$update public.profiles set region='US' where id='1a000000-0000-0000-0000-000000000002'$$,'cross-owner update is safely filtered by RLS');

reset role;
select is((select region from public.profiles where id='1a000000-0000-0000-0000-000000000002'),null,'another user region was not changed');

select * from finish();
rollback;
