import { access, claims, displayName, initials } from '../src/auth/access';

const base = { loading: false, role: 'analyst', aal: 'aal1' as const, verifiedTotp: 0 };

describe('access (route guard)', () => {
  it('waits while loading', () => expect(access({ ...base, loading: true })).toBe('loading'));
  it('sends a visitor to the password step', () => expect(access({ ...base, aal: null, role: null })).toBe('signedOut'));
  it('refuses a non-analyst, even at aal2', () => {
    expect(access({ ...base, role: undefined })).toBe('notAnalyst');
    expect(access({ ...base, role: 'user', aal: 'aal2', verifiedTotp: 1 })).toBe('notAnalyst');
  });
  it('enrols TOTP on first login', () => expect(access(base)).toBe('enroll'));
  it('asks the code when a factor exists and the session is aal1', () => expect(access({ ...base, verifiedTotp: 1 })).toBe('challenge'));
  it('lets an analyst at aal2 in', () => expect(access({ ...base, aal: 'aal2', verifiedTotp: 1 })).toBe('ok'));
});

describe('helpers', () => {
  it('reads JWT claims (base64url, UTF-8)', () => {
    const payload = { aal: 'aal2', app_metadata: { role: 'analyst' }, name: 'Koné' };
    const b64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
    expect(claims(`h.${b64}.s`)).toEqual(payload);
    expect(claims('garbage')).toEqual({});
    expect(claims(undefined)).toEqual({});
  });
  it('builds a name and initials', () => {
    expect(displayName({ name: 'Awa Koné' }, 'x@y.test')).toBe('Awa Koné');
    expect(displayName({}, 'a.kone@bank.test')).toBe('A. Kone');
    expect(displayName(undefined, 'analyst@goldenpiece.test')).toBe('Analyst');
    expect(initials('Awa Koné')).toBe('AK');
    expect(initials('A. Kone')).toBe('AK');
  });
});
