# dashboard/ — bank analyst SPA (Vite + React, Cloudflare Pages)

Built in B9 (plan by block and step in `docs/CHAIN_LOG.md`). Analyst role
(`app_metadata.role = 'analyst'`) + TOTP (aal2) required; reads the
`api.analyst_*` RPCs. Design: `design/screens/d-bank-dashboard.md`.

| Command | What |
|---|---|
| `npm ci` | install |
| `npm run dev` | dev server on :5173 (goldenpiece-dev; override with `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`) |
| `npm test` · `npm run typecheck` · `npm run lint` · `npm run build` | CI job `dashboard` |
| `npm run dev-analyst` | create/reset the dev analyst on goldenpiece-dev, enrol TOTP, check `analyst_queue` at aal2; writes `.env.analyst.local` (gitignored: e-mail, password, TOTP secret). `-- --no-totp` leaves no factor to test the first-login enrolment |

Layout: `src/theme` (tokens.json = copy of `design/tokens.json`, checked by a
test; CSS variables per scheme), `src/i18n` (FR/EN, D §7 copy), `src/auth`
(guard decision, provider), `src/screens` (login + TOTP), `src/shell` (top
bar, live state), `src/ui` (C1 button, C2 field, C3 code boxes, C8 banner).
