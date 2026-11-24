import { INITIAL, afterSecurity, compareVersion, phaseOf, prevStep, restore, securityDowngraded, shouldRelock, type AppState } from '../src/lib/flow';
import { planFor, planWhenLater } from '../src/lib/security';
import { fold, searchCountries, suggestions } from '../src/lib/countries';

const V = { appVersion: '0.1.0', minVersion: '0.0.0', locked: false };
const account = (o: Partial<AppState> = {}): AppState => ({
  ...INITIAL, done: true, mode: 'account', security: { level: 'strong', plan: planFor('strong') }, ...o,
});

describe('phase machine (S1 §1)', () => {
  it('loading until the persisted state is read', () => expect(phaseOf(null, V).kind).toBe('loading'));
  it('update (O17) blocks everything when the version is below min_version', () => {
    expect(phaseOf(account(), { ...V, minVersion: '0.2.0' })).toEqual({ kind: 'update', current: '0.1.0', min: '0.2.0' });
    expect(phaseOf({ ...INITIAL }, { ...V, minVersion: '0.1.0' }).kind).toBe('onboarding');
  });
  it('resumes at the persisted step', () => {
    expect(phaseOf({ ...INITIAL, step: 'consents' }, V)).toEqual({ kind: 'onboarding', step: 'consents' });
  });
  it('locks account users only, never the demo', () => {
    expect(phaseOf(account(), { ...V, locked: true }).kind).toBe('locked');
    expect(phaseOf({ ...INITIAL, done: true, mode: 'demo' }, { ...V, locked: true }).kind).toBe('ready');
    expect(phaseOf(account(), V).kind).toBe('ready');
  });
  it('re-locks after lock_delay_s in background', () => {
    const st = account({ lockDelayS: 60 });
    expect(shouldRelock(st, 1000, 1000 + 59_999)).toBe(false);
    expect(shouldRelock(st, 1000, 1000 + 60_000)).toBe(true);
    expect(shouldRelock(account({ lockDelayS: 0 }), 5, 5)).toBe(true);
    expect(shouldRelock(st, null, 1e12)).toBe(false);
  });
  it('back targets when the stack was rebuilt on resume', () => {
    expect(prevStep('language', INITIAL)).toBeNull();
    expect(prevStep('choice', INITIAL)).toBe('country');
    expect(prevStep('code', INITIAL)).toBe('signup');
    expect(prevStep('security', INITIAL)).toBeNull();
    expect(prevStep('consents', account({ security: { level: 'none', plan: planFor('none') } }))).toBe('pin');
    expect(prevStep('consents', account())).toBe('security');
  });
  it('O11 runs when the plan needs an app PIN', () => {
    expect(afterSecurity(planFor('none'))).toBe('pin');
    expect(afterSecurity(planFor('weak'))).toBe('pin');
    expect(afterSecurity(planFor('strong'))).toBe('consents');
    expect(afterSecurity(planWhenLater('weak'))).toBe('consents');
  });
  it('device security downgrade is detected against the unlock method', () => {
    expect(securityDowngraded(planFor('strong'), 'secret')).toBe(true);
    expect(securityDowngraded(planFor('strong'), 'strong')).toBe(false);
    expect(securityDowngraded(planFor('secret'), 'none')).toBe(true);
    expect(securityDowngraded(planFor('none'), 'none')).toBe(false); // app PIN does not depend on the phone
  });
  it('restore tolerates garbage and fills new fields', () => {
    expect(restore('{bad')).toEqual(INITIAL);
    expect(restore(null)).toEqual(INITIAL);
    expect(restore(JSON.stringify({ v: 1, step: 'pin', pinState: { failures: 3 } }))).toMatchObject({ step: 'pin', pinState: { failures: 3, lockedUntil: 0 }, done: false });
  });
  it('compareVersion', () => {
    expect(compareVersion('0.1.0', '0.1')).toBe(0);
    expect(compareVersion('0.9.9', '0.10.0')).toBe(-1);
    expect(compareVersion('1.0.0', '0.99.0')).toBe(1);
  });
});

describe('O3 countries', () => {
  it('accent-insensitive search on names, ISO and dial codes', () => {
    expect(fold('Côte d’Ivoire')).toBe('cote d ivoire');
    expect(searchCountries('senegal', 'fr')[0].iso2).toBe('SN');
    expect(searchCountries('cote', 'fr')[0].iso2).toBe('CI');
    expect(searchCountries('ivoire', 'fr').map((c) => c.iso2)).toContain('CI');
    expect(searchCountries('+221', 'fr')[0].iso2).toBe('SN');
    expect(searchCountries('germany', 'fr')[0].iso2).toBe('DE');
    expect(searchCountries('zzzz', 'fr')).toHaveLength(0);
    expect(searchCountries('', 'fr')).toHaveLength(249);
  });
  it('suggestions: phone country first, then the F CFA zone, 5 items, no duplicate', () => {
    expect(suggestions('FR').map((c) => c.iso2)).toEqual(['FR', 'SN', 'CI', 'ML', 'BF']);
    expect(suggestions('CI').map((c) => c.iso2)).toEqual(['CI', 'SN', 'ML', 'BF', 'CM']);
    expect(suggestions(null)).toHaveLength(5);
  });
});
