/**
 * Route-guard decision (D §5 "Session aal1 → login + TOTP"). Pure so it can be
 * tested: the server checks the same thing in core.is_analyst() (role claim
 * `app_metadata.role = 'analyst'` and `aal = 'aal2'`).
 */
export type Access =
  | 'loading'
  | 'signedOut'      // no session → password step
  | 'notAnalyst'     // signed in without the analyst role → refused, signed out
  | 'enroll'         // analyst, no verified TOTP factor → enrol (QR) on first login
  | 'challenge'      // analyst, verified factor, session aal1 → code
  | 'ok';            // analyst + aal2

export type AccessInput = {
  loading: boolean;
  role: string | null | undefined;
  aal: 'aal1' | 'aal2' | null | undefined;
  verifiedTotp: number;
};

export function access(i: AccessInput): Access {
  if (i.loading) return 'loading';
  if (i.aal == null) return 'signedOut';
  if (i.role !== 'analyst') return 'notAnalyst';
  if (i.aal === 'aal2') return 'ok';
  return i.verifiedTotp > 0 ? 'challenge' : 'enroll';
}

/** Claims of an access token, without checking it (the server does). */
export function claims(token: string | undefined): Record<string, unknown> {
  if (!token) return {};
  try {
    const b = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const bin = atob(b + '='.repeat((4 - (b.length % 4)) % 4));
    return JSON.parse(new TextDecoder().decode(Uint8Array.from(bin, (ch) => ch.charCodeAt(0))));
  } catch {
    return {};
  }
}

/** "Awa Koné" → "AK"; "a.kone@bank.test" → "AK". */
export function initials(name: string): string {
  const parts = name.split(/[\s.@_-]+/).filter(Boolean).slice(0, 2);
  return parts.map((p) => p[0]!.toUpperCase()).join('') || '?';
}

/** Display name: user_metadata.name, else the e-mail's local part ("a.kone" → "A. Kone"). */
export function displayName(meta: Record<string, unknown> | undefined, email: string | undefined): string {
  const n = typeof meta?.name === 'string' ? meta.name.trim() : '';
  if (n) return n;
  const local = (email ?? '').split('@')[0];
  return local.split(/[._-]+/).filter(Boolean)
    .map((p, i, a) => (i < a.length - 1 && a.length > 1 ? `${p[0]!.toUpperCase()}.` : p[0]!.toUpperCase() + p.slice(1)))
    .join(' ');
}
