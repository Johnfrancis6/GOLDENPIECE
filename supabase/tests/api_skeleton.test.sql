-- api skeleton contracts (API.md §1, §2.1).
begin;
create extension if not exists pgtap with schema extensions;
set search_path = extensions, public;
grant usage on schema extensions to anon, authenticated;
select plan(22);

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, is_anonymous, created_at, updated_at) values
 ('00000000-0000-4000-b000-00000000000a', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'apia@test.invalid', '{"country":"XX","language":"de"}', false, now(), now()),
 ('00000000-0000-4000-b000-00000000000b', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'apib@test.invalid', '{}', false, now(), now());
insert into mkt.fx_latest (quote, rate, as_of) values ('USD', 1.25, now())
  on conflict (quote) do update set rate = 1.25;

select is((select country || '/' || language || '/' || timezone from core.profiles where user_id = '00000000-0000-4000-b000-00000000000a'),
          'SN/fr/Africa/Dakar', 'unknown country/language fall back to SN/fr');

-- anon
set local role anon;
select is(api.health_public()->>'status', 'ok', 'health_public works for anon');
select ok(api.health_public() ? 'min_version', 'health_public returns min_version');
select cmp_ok(jsonb_array_length(api.countries('fr')), '>=', 249, 'countries returns all ISO countries');
select is((select e->>'name' from jsonb_array_elements(api.countries('en')) e where e->>'iso2' = 'SN'), 'Senegal', 'countries in English');
select is((select e->>'profile_id' from jsonb_array_elements(api.countries('fr')) e where e->>'iso2' = 'GA'), 'CEMAC', 'Gabon profile CEMAC');
select is(jsonb_array_length(api.legal_texts('en')), 3, 'legal_texts returns one text per kind');
select throws_ok('select api.bootstrap()', '42501', null, 'anon cannot bootstrap');
reset role;
select throws_ok($$set local role authenticated; select api.health_internal()$$, '42501', null, 'users cannot read the internal health');
reset role;
select is(api.health_internal()->>'ok', 'true', 'internal health ok on an idle project');

-- user A
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-b000-00000000000a","role":"authenticated"}';
select is(api.register_device('00000000-0000-4000-b000-0000000000d1', 'android', '0.1.0', 'weak', 'app_pin', 'Tecno Spark 50')->>'new_device',
          'true', 'first registration is a new device');
select is(api.register_device('00000000-0000-4000-b000-0000000000d1', 'android', '0.1.1', 'strong', 'biometric_strong')->>'new_device',
          'false', 'second registration updates the device');
select is((select count(*) from core.security_events where type = 'new_device'), 1::bigint, 'one new_device event written');
select throws_ok($$select api.register_device('00000000-0000-4000-b000-0000000000d2', 'symbian', '0.1', 'weak', 'app_pin')$$,
                 'PGRST', null, 'invalid platform rejected with an API error');
select is(api.record_consents('[{"kind":"terms","granted":true,"text_version":"0.1-draft"},{"kind":"ai_categorisation","granted":false,"text_version":"0.1-draft"}]')->>'recorded',
          '2', 'consents recorded');
select throws_ok($$select api.record_consents('[{"kind":"nope","granted":true,"text_version":"x"}]')$$, 'PGRST', null, 'bad consent kind rejected');

select is(api.bootstrap()->'data'->'profile'->>'country', 'SN', 'bootstrap returns the profile');
select is(jsonb_array_length(api.bootstrap()->'data'->'consents_current'), 2, 'bootstrap returns current consents');
select is((api.bootstrap(api.bootstrap()->>'etag'))->>'not_modified', 'true', 'same etag -> not_modified');
select is(api.fx_rate('EUR', 'XOF'), 655.957, 'EUR->XOF peg');
select is(round(api.fx_rate('XOF', 'USD'), 10), round(1.25 / 655.957, 10), 'XOF->USD via EUR');

-- user B cannot take A's device id
set local request.jwt.claims = '{"sub":"00000000-0000-4000-b000-00000000000b","role":"authenticated"}';
select throws_ok($$select api.register_device('00000000-0000-4000-b000-0000000000d1', 'android', '0.1.0', 'weak', 'app_pin')$$,
                 'PGRST', null, 'device id of another user is refused');

reset role;
select * from finish();
rollback;
