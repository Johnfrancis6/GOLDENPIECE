import { readFileSync } from 'node:fs';
import { resolve as path } from 'node:path';
import { STRINGS, translate } from '../src/i18n';

describe('i18n', () => {
  it('has the same keys in FR and EN, none empty', () => {
    expect(Object.keys(STRINGS.en).sort()).toEqual(Object.keys(STRINGS.fr).sort());
    for (const l of ['fr', 'en'] as const) for (const [k, v] of Object.entries(STRINGS[l])) expect(v, `${l}.${k}`).not.toBe('');
  });

  it('uses the D §7 copy verbatim', () => {
    const d = readFileSync(path(__dirname, '../../design/screens/d-bank-dashboard.md'), 'utf8');
    for (const k of ['live', 'offline', 'simulated', 'empty.title', 'empty.body', 'settings.title', 'settings.intro', 'settings.reset', 'decide.comment', 'toast.saved'] as const) {
      expect(d, k).toContain(STRINGS.fr[k]);
      expect(d, k).toContain(STRINGS.en[k]);
    }
    expect(d).toContain(`${STRINGS.fr['tabs.queue']} · ${STRINGS.fr['tabs.settings']} · ${STRINGS.fr['tabs.ops']}`);
    expect(d).toContain(`${STRINGS.fr['decide.legit']} · ${STRINGS.fr['decide.fraud']}`);
    expect(d).toContain(`${STRINGS.en['decide.legit']} · ${STRINGS.en['decide.fraud']}`);
    expect(d).toContain(`${STRINGS.en['tabs.queue']} · ${STRINGS.en['tabs.settings']} · ${STRINGS.en['tabs.ops']}`);
  });

  it('fills arguments', () => {
    expect(translate('fr', 'groups.review', { n: 3 })).toBe('En analyse · 3');
    expect(translate('en', 'groups.review', { n: 3 })).toBe('Under review · 3');
  });
});
