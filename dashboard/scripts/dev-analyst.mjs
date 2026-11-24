#!/usr/bin/env node
/**
 * Create (or reset) the dev analyst account on goldenpiece-dev and enrol its
 * TOTP factor, then prove the aal2 session can call api.analyst_queue.
 *
 *   npm run dev-analyst                 # e-mail/password from env, or generated
 *   npm run dev-analyst -- --no-totp    # leave no factor (tests the first-login enrolment)
 *
 * In build sessions Node needs the session proxy: the npm script sets
 * NODE_USE_ENV_PROXY=1 (and NODE_EXTRA_CA_CERTS when /root/.ccr exists).
 *
 * Env: ANALYST_EMAIL (default analyst.dev@goldenpiece.test, a non-routable
 * test address), ANALYST_PASSWORD (default: random, 24 chars).
 * Output: dashboard/.env.analyst.local (gitignored) with the e-mail, password
 * and TOTP secret — never commit it, never paste it in a chat. Each run
 * replaces the TOTP factor, so any session can get working credentials.
 * The service key is read through the Supabase Management API (the session
 * proxy injects its token); only project goldenpiece-dev is allowed.
 */
import { randomBytes } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';
import { TOTP } from 'otpauth';

const REF = 'ynabfjwcdmaxfnppjtla'; // goldenpiece-dev only (AUTORUN_BACKEND.md)
const URL_ = `https://${REF}.supabase.co`;
const MGMT = process.env.SUPABASE_ACCESS_TOKEN || `sbp_${'0'.repeat(40)}`; // proxy replaces the dummy
const EMAIL = process.env.ANALYST_EMAIL || 'analyst.dev@goldenpiece.test';
const PASSWORD = process.env.ANALYST_PASSWORD || randomBytes(18).toString('base64url');
const OUT = resolve(dirname(fileURLToPath(import.meta.url)), '../.env.analyst.local');

async function json(res) {
  const body = await res.text();
  if (!res.ok) throw new Error(`${res.status} ${body.slice(0, 300)}`);
  return body ? JSON.parse(body) : null;
}

const keys = await json(await fetch(`https://api.supabase.com/v1/projects/${REF}/api-keys?reveal=true`, { headers: { Authorization: `Bearer ${MGMT}` } }));
const secret = keys.find((k) => k.type === 'secret')?.api_key;
const publishable = keys.find((k) => k.type === 'publishable')?.api_key;
if (!secret || !publishable) throw new Error('keys not found');

const admin = createClient(URL_, secret, { auth: { persistSession: false, autoRefreshToken: false } });

// 1. User with the analyst role (app_metadata is server-only: users cannot set it).
let user = null;
for (let page = 1; !user; page++) {
  const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
  if (error) throw error;
  user = data.users.find((u) => u.email === EMAIL) ?? null;
  if (data.users.length < 200) break;
}
const attrs = { password: PASSWORD, email_confirm: true, app_metadata: { role: 'analyst' }, user_metadata: { name: 'Analyste Dev' } };
if (user) {
  const { data, error } = await admin.auth.admin.updateUserById(user.id, attrs);
  if (error) throw error;
  user = data.user;
} else {
  const { data, error } = await admin.auth.admin.createUser({ email: EMAIL, ...attrs });
  if (error) throw error;
  user = data.user;
}

// 2. Replace any TOTP factor.
const { data: f, error: fe } = await admin.auth.admin.mfa.listFactors({ userId: user.id });
if (fe) throw fe;
for (const factor of f.factors) {
  const { error } = await admin.auth.admin.mfa.deleteFactor({ userId: user.id, id: factor.id });
  if (error) throw error;
}

if (process.argv.includes('--no-totp')) {
  writeFileSync(OUT, `# dev analyst (goldenpiece-dev) — local only, never commit\nANALYST_EMAIL=${EMAIL}\nANALYST_PASSWORD=${PASSWORD}\n`, { mode: 0o600 });
  console.log(JSON.stringify({ user: user.id, totp: 'none', wrote: OUT }));
  process.exit(0);
}

// 3. Sign in as the analyst, enrol and verify TOTP → aal2.
const c = createClient(URL_, publishable, { auth: { persistSession: false, autoRefreshToken: false }, db: { schema: 'api' } });
const si = await c.auth.signInWithPassword({ email: EMAIL, password: PASSWORD });
if (si.error) throw si.error;
const en = await c.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'GOLDENPIECE dev' });
if (en.error) throw en.error;
const totp = new TOTP({ secret: en.data.totp.secret, digits: 6, period: 30 });
const ver = await c.auth.mfa.challengeAndVerify({ factorId: en.data.id, code: totp.generate() });
if (ver.error) throw ver.error;
const aal = await c.auth.mfa.getAuthenticatorAssuranceLevel();

// 4. Prove access: the analyst RPC answers at aal2.
const t0 = performance.now();
const q = await c.rpc('analyst_queue', { p_status: 'all', p_cursor: null });
const ms = Math.round(performance.now() - t0);
if (q.error) throw q.error;

writeFileSync(OUT, `# dev analyst (goldenpiece-dev) — local only, never commit\nANALYST_EMAIL=${EMAIL}\nANALYST_PASSWORD=${PASSWORD}\nANALYST_TOTP_SECRET=${en.data.totp.secret}\n`, { mode: 0o600 });
console.log(JSON.stringify({ user: user.id, aal: aal.data?.currentLevel, queue_items: q.data?.items?.length ?? null, queue_ms: ms, wrote: OUT }));
