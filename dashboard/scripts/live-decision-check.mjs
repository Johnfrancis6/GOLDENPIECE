#!/usr/bin/env node
/**
 * B9.3 live check (BUILD_PLAN B9 "Done"): a decision taken in the dashboard
 * reaches the app user by Realtime and logs its parameter change.
 *
 * 1. anonymous demo user (Dakar persona, account-demo-start);
 * 2. SIM swap + 80 % cash-out at a new agent → core.score_transaction → bank band, escalated;
 * 3. the app user subscribes to core.alerts (as app/src/state/data.tsx does);
 * 4. Playwright: dashboard login + TOTP (.env.analyst.local from npm run dev-analyst),
 *    F → comment → Enter, toast 8 s, then api.analyst_decide leaves;
 * 5. prints Realtime latency, ops.param_changes, core.analyst_decisions, ops.push_log.
 *
 * Needs `npx vite preview --port 4173` running, the session proxy (HTTPS_PROXY)
 * and the global Playwright. goldenpiece-dev only. Writes the decision screenshots
 * to docs/screens/b9/. Run: NODE_USE_ENV_PROXY=1 node scripts/live-decision-check.mjs
 */
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const DASH = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const req = createRequire(`${DASH}/package.json`);
const { createClient } = req('@supabase/supabase-js');
const { TOTP } = req('otpauth');
const { chromium } = createRequire(`${execSync('npm root -g').toString().trim()}/`)('playwright');
const REF = 'ynabfjwcdmaxfnppjtla', URL_ = `https://${REF}.supabase.co`;
const env = JSON.parse(readFileSync(`${DASH}/src/lib/env.dev.json`, 'utf8'));
const cred = Object.fromEntries(readFileSync(`${DASH}/.env.analyst.local`, 'utf8').split('\n').filter((l) => l.includes('=') && !l.startsWith('#')).map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]));
const sql = async (q) => {
  const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, { method: 'POST', headers: { Authorization: `Bearer sbp_${'0'.repeat(40)}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ query: q }) });
  const b = await r.text(); if (!r.ok) throw new Error(`${r.status} ${b.slice(0, 400)}`); return JSON.parse(b);
};
const log = (...a) => console.log(new Date().toISOString().slice(11, 23), ...a);

// 1. app user: anonymous demo (Dakar persona)
const app = createClient(URL_, env.supabasePublishableKey, { auth: { persistSession: false } });
const { data: anon, error: e1 } = await app.auth.signInAnonymously();
if (e1) throw e1;
const uid = anon.user.id;
const t0 = Date.now();
const { data: demo, error: e2 } = await app.functions.invoke('account-demo-start', { body: { persona: 'dakar_salaried', lang: 'fr', country: 'SN' } });
if (e2) throw new Error(`demo-start ${e2.message} ${await e2.context?.text?.()}`);
log('demo user', uid.slice(0, 8), 'demo-start ms', Date.now() - t0, JSON.stringify(demo).slice(0, 120));

// 2. escalated alert: SIM swap 50 min ago, then ~80 % of the wallet cashed out at a new agent (R1 → bank)
const acc = (await sql(`select id, currency from core.accounts where user_id = '${uid}' and kind = 'momo' order by created_at limit 1`))[0];
const tx = crypto.randomUUID();
await sql(`insert into core.security_events (user_id, type, source, at, details) values ('${uid}', 'sim_swap', 'sim', now() - interval '50 minutes', '{"test":"b9.3"}');
insert into core.transactions (id, user_id, account_id, provider_entry_id, status, cdt_dbt_ind, amount_minor, currency, booking_ts, value_date, cp_name, cp_key, category_id, category_source)
values ('${tx}', '${uid}', '${acc.id}', 'b93-live-${tx.slice(0, 8)}', 'BOOK', 'DBIT', 160000, '${acc.currency}', now() - interval '2 minutes', current_date, 'Agent Point 12', 'n:agent point 12 b93', 'transfers.cash', 'keyword');
insert into core.tx_momo (transaction_id, operator, op_type, operator_ref, balance_after_minor) values ('${tx}', (select coalesce(operator, 'teranga_mobile') from core.accounts where id = '${acc.id}'), 'cash_out', 'B93-' || left('${tx}', 8), 40000);`);
const sc = (await sql(`select core.score_transaction('${tx}') r`))[0].r;
log('scored', JSON.stringify(sc));
const alertId = sc.alert_id;
if (!alertId || sc.band !== 'bank') throw new Error('no bank alert');

// 3. app user listens to its alerts (as the app does: core.alerts filter user_id)
await app.realtime.setAuth((await app.auth.getSession()).data.session.access_token);
const got = new Promise((resolve) => {
  app.channel('b93-user').on('postgres_changes', { event: '*', schema: 'core', table: 'alerts', filter: `user_id=eq.${uid}` }, (p) => {
    if (p.new?.status?.startsWith('decided')) resolve({ at: Date.now(), status: p.new.status });
  }).subscribe((s) => log('user channel', s));
});
await new Promise((r) => setTimeout(r, 1500));

// 4. analyst decides in the dashboard (vite preview on :4173)
const browser = await chromium.launch({ proxy: { server: process.env.HTTPS_PROXY, bypass: 'localhost,127.0.0.1' } });
const ctx = await browser.newContext({ locale: 'fr-FR', viewport: { width: 1280, height: 800 }, ignoreHTTPSErrors: false });
const page = await ctx.newPage();
let rpcAt = 0;
page.on('request', (r) => { if (r.url().includes('/rpc/analyst_decide')) { rpcAt = Date.now(); log('analyst_decide sent', r.postData()); } });
page.on('console', (m) => { if (m.type() === 'error') log('console', m.text()); });
await page.goto(`http://localhost:4173/alerts/${alertId}`);
await page.getByLabel('E-mail', { exact: true }).fill(cred.ANALYST_EMAIL);
await page.getByLabel('Mot de passe', { exact: true }).fill(cred.ANALYST_PASSWORD);
await page.getByRole('button', { name: /connecter/i }).click();
page.on('response', async (r) => { if (r.status() >= 400) log('HTTP', r.status(), r.url().slice(0, 120), (await r.text().catch(() => '')).slice(0, 200)); });
const otp = page.locator('input[autocomplete="one-time-code"]');
await otp.waitFor();
await page.waitForFunction(() => !document.querySelector('input[autocomplete="one-time-code"]')?.disabled);
log('otp enabled');
const totp = new TOTP({ secret: cred.ANALYST_TOTP_SECRET, digits: 6, period: 30 });
const left = 30 - (Math.floor(Date.now() / 1000) % 30);
if (left < 5) await page.waitForTimeout(left * 1000 + 500);
await otp.focus();
await page.keyboard.type(totp.generate(), { delay: 40 });
await page.getByRole('group', { name: 'Décision' }).waitFor({ timeout: 20000 });
await page.waitForFunction(() => !document.querySelector('.btn-decide')?.hasAttribute('disabled'), null, { timeout: 15000 });
log('detail with decision bar', await page.locator('#d-title').textContent());
await page.screenshot({ path: `${DASH}/../docs/screens/b9/d-decision-bar-light.png` });
await page.keyboard.press('f');
await page.waitForTimeout(300);
await page.screenshot({ path: `${DASH}/../docs/screens/b9/d-decision-fraud-needs-comment.png` });
await page.keyboard.type('Test B9.3 : SIM changée puis retrait de 80 % chez un nouvel agent');
await page.keyboard.press('Enter');
const decidedAt = Date.now();
await page.getByText('Décision enregistrée').waitFor();
await page.waitForTimeout(700);
await page.screenshot({ path: `${DASH}/../docs/screens/b9/d-decision-toast.png` });
const user = await got;
log('user got', user.status, 'ms after RPC sent', user.at - rpcAt, 'ms after key', user.at - decidedAt);
await page.waitForTimeout(1500);
await page.screenshot({ path: `${DASH}/../docs/screens/b9/d-decision-after.png` });
await browser.close();

// 5. checks
const pc = await sql(`select param_key, category_id, before, after, cause, actor is not null actor from ops.param_changes where alert_id = '${alertId}'`);
log('param_changes', JSON.stringify(pc));
const dec = await sql(`select decision, comment, simulated from core.analyst_decisions where alert_id = '${alertId}'`);
log('analyst_decisions', JSON.stringify(dec));
const push = await sql(`select type, status from ops.push_log where alert_id = '${alertId}' order by created_at`);
log('push_log', JSON.stringify(push));
const { data: la } = await app.rpc('list_alerts', { p_status: 'all' }).then((r) => r, () => ({ data: null }));
log('app list_alerts', JSON.stringify(la)?.slice(0, 300));
console.log(JSON.stringify({ uid, alertId, tx }));
process.exit(0);
