import { hashPin, isTrivialPin, levelFrom, passwordStrength, pinAttempt, planFor, planWhenLater, isEmail } from '../src/lib/security';

describe('device security matrix (TECH_ANALYSIS §1.2b)', () => {
  it.each([
    [3, 'strong', 'biometric_strong', 'biometric_strong', false],
    [2, 'weak', 'biometric_weak', 'app_pin', true],
    [1, 'secret', 'device_secret', 'device_secret', false],
    [0, 'none', 'app_pin', 'app_pin', true],
  ])('level %i → %s', (lvl, level, unlock, sensitive, pin) => {
    const p = planFor(levelFrom(lvl));
    expect([p.level, p.unlock, p.sensitive, p.needsAppPin]).toEqual([level, unlock, sensitive, pin]);
  });
  it('"Plus tard" never goes below the device secret, and a phone without lock still gets the app PIN', () => {
    expect(planWhenLater('strong').unlock).toBe('device_secret');
    expect(planWhenLater('weak').sensitive).toBe('device_secret');
    expect(planWhenLater('none')).toMatchObject({ unlock: 'app_pin', needsAppPin: true });
  });
});

describe('app PIN', () => {
  it.each(['000000', '123456', '654321', '890123', '121212', '123123', '198705', '051990', '12345', 'abcdef'])('refuses %s', (p) =>
    expect(isTrivialPin(p)).toBe(true));
  it.each(['482915', '730264', '305718'])('accepts %s', (p) => expect(isTrivialPin(p)).toBe(false));
  it('hash is salted and deterministic', () => {
    const a = hashPin('482915', 'aa', 1000);
    expect(a).toBe(hashPin('482915', 'aa', 1000));
    expect(a).not.toBe(hashPin('482915', 'bb', 1000));
    expect(a).toHaveLength(64);
  });
  it('5 failures → 1 min wait, 10 → re-login, success resets', () => {
    let s = { failures: 0, lockedUntil: 0 };
    let t = 0;
    for (let i = 1; i <= 4; i++) { const v = pinAttempt(s, false, t); s = v.state; expect(v.left).toBe(5 - i); }
    let v = pinAttempt(s, false, t); s = v.state;
    expect(v.waitS).toBe(60);
    expect(pinAttempt(s, true, t + 30_000).ok).toBe(false); // still locked, even with the right code
    t += 61_000;
    for (let i = 6; i <= 9; i++) { v = pinAttempt(s, false, t); s = v.state; expect(v.relogin).toBe(false); }
    v = pinAttempt(s, false, t);
    expect(v.relogin).toBe(true);
    expect(pinAttempt({ failures: 3, lockedUntil: 0 }, true, 0).state.failures).toBe(0);
  });
});

describe('sign-up rules', () => {
  it('password strength', () => {
    expect(passwordStrength('short')).toBe('weak');
    expect(passwordStrength('motdepasse')).toBe('weak');
    expect(passwordStrength('baobabfleuve')).toBe('medium');
    expect(passwordStrength('Baobab-fleuve7')).toBe('strong');
  });
  it('email', () => {
    expect(isEmail('awa@exemple.sn')).toBe(true);
    expect(isEmail('awa@exemple')).toBe(false);
  });
});
