#!/usr/bin/env node
/**
 * B9.4 browser run against goldenpiece-dev: Réglages du modèle, Ops, /legal in light and dark at 1280 × 800
 * (scale 1, docs/screens/b9/), load timings, and — with --reset — a real "Rétablir les valeurs par défaut"
 * (C10 dialog → api.reset_params('all')), then checks the log kept its rows and gained the reset lines.
 *
 * Needs `npx vite preview --port 4173`, the session proxy, the global Playwright and .env.analyst.local
 * (npm run dev-analyst). Run: NODE_USE_ENV_PROXY=1 node scripts/b94-screens.mjs [--reset]
 */
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const DASH = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = `${DASH}/../docs/screens/b9`;
const req = createRequire(`${DASH}/package.json`);
const { TOTP } = req('otpauth');
const { chromium } = createRequire(`${execSync('npm root -g').toString().trim()}/`)('playwright');
const REF = 'ynabfjwcdmaxfnppjtla';
const cred = Object.fromEntries(readFileSync(`${DASH}/.env.analyst.local`, 'utf8').split('\n').filter((l) => l.includes('=') && !l.startsWith('#')).map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]));
const sql = async (q) => {
  const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, { method: 'POST', headers: { Authorization: `Bearer sbp_${'0'.repeat(40)}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ query: q }) });
  const b = await r.text(); if (!r.ok) throw new Error(`${r.status} ${b.slice(0, 400)}`); return JSON.parse(b);
};
const log = (...a) => console.log(new Date().toISOString().slice(11, 23), ...a);
const RESET = process.argv.includes('--reset');

const browser = await chromium.launch({ proxy: { server: process.env.HTTPS_PROXY, bypass: 'localhost,127.0.0.1' } });
const ctx = await browser.newContext({ locale: 'fr-FR', viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('response', async (r) => { if (r.status() >= 400) log('HTTP', r.status(), r.url().slice(0, 110)); });

// Login + TOTP
await page.goto('http://localhost:4173/settings');
await page.getByLabel('E-mail', { exact: true }).fill(cred.ANALYST_EMAIL);
await page.getByLabel('Mot de passe', { exact: true }).fill(cred.ANALYST_PASSWORD);
await page.getByRole('button', { name: /connecter/i }).click();
const otp = page.locator('input[autocomplete="one-time-code"]');
await otp.waitFor();
await page.waitForFunction(() => !document.querySelector('input[autocomplete="one-time-code"]')?.disabled);
const left = 30 - (Math.floor(Date.now() / 1000) % 30);
if (left < 5) await page.waitForTimeout(left * 1000 + 500);
await otp.focus();
let t = Date.now();
await page.keyboard.type(new TOTP({ secret: cred.ANALYST_TOTP_SECRET }).generate(), { delay: 40 });
await page.locator('table.ptable tbody tr').first().waitFor({ timeout: 20000 });
log('code → settings table', Date.now() - t, 'ms');

const shot = async (name) => { await page.waitForTimeout(1300); await page.screenshot({ path: `${OUT}/${name}.png` }); log('shot', name); };
const theme = async (s) => page.evaluate((v) => { localStorage.setItem('gp.theme', v); }, s);

await shot('d-settings-light');
await page.locator('.page').evaluate((el) => el.scrollTo(0, el.scrollHeight));
await shot('d-settings-light-scrolled');
await page.locator('.page').evaluate((el) => el.scrollTo(0, 0));
await page.getByRole('button', { name: 'Rétablir les valeurs par défaut' }).click();
await page.getByRole('alertdialog').waitFor();
await shot('d-settings-reset-dialog');

if (RESET) {
  const before = (await sql(`select count(*)::int n, max(id) last from ops.param_changes`))[0];
  const overrides = (await sql(`select count(*)::int n from ops.scoring_params where scope = 'user_category'`))[0].n;
  t = Date.now();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Rétablir', exact: true }).click();
  await page.locator('.page-banner').getByText(/Valeurs par défaut rétablies/).waitFor({ timeout: 15000 });
  log('reset → banner', Date.now() - t, 'ms; banner:', await page.locator('.page-banner').textContent());
  const after = (await sql(`select count(*)::int n from ops.param_changes`))[0].n;
  const resets = await sql(`select count(*)::int n from ops.param_changes where cause = 'reset' and id > ${before.last}`);
  const left2 = (await sql(`select count(*)::int n from ops.scoring_params where scope = 'user_category'`))[0].n;
  log(JSON.stringify({ log_before: before.n, log_after: after, reset_rows: resets[0].n, user_overrides_before: overrides, user_overrides_after: left2}));
  await shot('d-settings-after-reset');
} else {
  await page.keyboard.press('Escape');
}

await theme('dark');
await page.reload();
await page.locator('table.ptable tbody tr').first().waitFor({ timeout: 20000 });
await shot('d-settings-dark');

await theme('light');
t = Date.now();
await page.goto('http://localhost:4173/ops');
await page.locator('.tile').first().waitFor({ timeout: 20000 });
await page.locator('.chart-card').first().waitFor();
log('ops tiles', Date.now() - t, 'ms');
await shot('d-ops-light');
await page.locator('.page').evaluate((el) => el.scrollTo(0, el.scrollHeight));
await page.locator('svg.g1').hover({ position: { x: 300, y: 100 } }).catch(() => {});
await shot('d-ops-light-scrolled');
await theme('dark');
await page.reload();
await page.locator('.tile').first().waitFor({ timeout: 20000 });
await shot('d-ops-dark');

t = Date.now();
await page.goto('http://localhost:4173/legal');
await page.locator('.legal-doc').first().waitFor({ timeout: 15000 });
log('legal', Date.now() - t, 'ms');
await shot('d-legal-dark');
await theme('light');
await page.reload();
await page.locator('.legal-doc').first().waitFor({ timeout: 15000 });
await shot('d-legal-light');

// Anonymous visitor: /legal must work without a session.
const anon = await (await browser.newContext({ locale: 'en-US', viewport: { width: 1280, height: 800 } })).newPage();
await anon.goto('http://localhost:4173/legal');
await anon.evaluate(() => localStorage.setItem('gp.lang', 'en'));
await anon.reload();
await anon.locator('.legal-doc').first().waitFor({ timeout: 15000 });
log('anon legal (en):', (await anon.locator('h1').textContent()), '|', (await anon.locator('.legal-doc h2').allTextContents()).join(' / '));

log('console errors:', errors.length ? errors : 'none');
await browser.close();
