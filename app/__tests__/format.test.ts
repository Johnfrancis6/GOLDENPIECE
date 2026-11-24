import { formatAge, formatAmount, formatAmountShort, formatChangePct, formatCountdown, formatShare } from '../src/lib/format';
import tokens from '../src/theme/tokens.json';
import fs from 'fs';
import path from 'path';

const N = ' ', B = ' ', MINUS = '−';

describe('F6 amounts', () => {
  it('matches the token examples', () => {
    expect(formatAmount(1250000, 'XOF', 'fr')).toBe(tokens.format.currency.XOF.exampleFr);
    expect(formatAmount(123456, 'EUR', 'fr')).toBe(tokens.format.currency.EUR.exampleFr);
    expect(formatAmount(123456, 'EUR', 'en')).toBe(tokens.format.currency.EUR.exampleEn);
    expect(formatAmount(123456, 'USD', 'en')).toBe(tokens.format.currency.USD.exampleEn);
  });
  it('rows, signs, zero, hidden', () => {
    expect(formatAmount(-35500, 'XOF', 'fr', { row: true })).toBe(`${MINUS}35${N}500${B}F`);
    expect(formatAmount(150000, 'XOF', 'fr', { row: true, signed: true })).toBe(`+150${N}000${B}F`);
    expect(formatAmount(1234, 'XOF', 'en')).toBe(`1,234${B}F CFA`);
    expect(formatAmount(0, 'XOF', 'fr')).toBe(`0${B}F CFA`);
    expect(formatAmount(5000, 'XOF', 'fr', { hidden: true })).toBe(`•••${B}F CFA`);
  });
  it('abbreviates only from 1 M, unit chosen after rounding', () => {
    expect(formatAmountShort(999_999, 'XOF', 'fr')).toBe(`999${N}999${B}F CFA`);
    expect(formatAmountShort(1_234_567, 'XOF', 'fr')).toBe(`1,2${N}M${B}F CFA`);
    expect(formatAmountShort(2_000_000, 'XOF', 'en')).toBe(`2M${B}F CFA`);
    expect(formatAmountShort(999_960_000, 'XOF', 'fr')).toBe(`1${N}Md${B}F CFA`);
    expect(formatAmountShort(3_400_000_000, 'XOF', 'en')).toBe(`3.4B${B}F CFA`);
  });
});

describe('F6 percents, dates', () => {
  it('changes and shares', () => {
    expect(formatChangePct(2.44, 'fr')).toBe(`+2,4${N}%`);
    expect(formatChangePct(-0.8, 'en')).toBe(`${MINUS}0.8%`);
    expect(formatChangePct(0.04, 'fr')).toBe(`0${N}%`);
    expect(formatChangePct(250.4, 'fr')).toBe(`+250${N}%`);
    expect(formatShare(41.6, 'fr')).toBe(`42${N}%`);
  });
  it('relative ages in the user zone', () => {
    const now = new Date('2026-11-23T14:00:00Z');
    expect(formatAge(new Date('2026-11-23T13:59:30Z'), now, 'Africa/Dakar', 'fr')).toBe("À l'instant");
    expect(formatAge(new Date('2026-11-23T13:55:00Z'), now, 'Africa/Dakar', 'fr')).toBe(`Il y a 5${B}min`);
    expect(formatAge(new Date('2026-11-23T11:00:00Z'), now, 'Africa/Dakar', 'en')).toBe(`3${B}h ago`);
    expect(formatAge(new Date('2026-11-22T11:00:00Z'), now, 'Africa/Dakar', 'fr')).toBe('Hier');
    expect(formatAge(new Date('2026-11-18T11:00:00Z'), now, 'Africa/Dakar', 'fr')).toBe(`18${B}nov.`);
    expect(formatAge(new Date('2025-11-18T11:00:00Z'), now, 'Africa/Dakar', 'en')).toBe('Nov 18, 2025');
    expect(formatCountdown(24)).toBe('0:24');
  });
});

describe('copies of design and shared files are identical', () => {
  const root = path.resolve(__dirname, '../..');
  it.each([
    ['design/tokens.json', 'app/src/theme/tokens.json'],
    ['shared/i18n/fr.json', 'app/src/i18n/shared.fr.json'],
    ['shared/i18n/en.json', 'app/src/i18n/shared.en.json'],
    ['supabase/functions/_shared/money.ts', 'app/src/lib/money.ts'],
    ['design/fonts/PoppinsGP-Regular.ttf', 'app/assets/fonts/PoppinsGP-Regular.ttf'],
    ['design/fonts/PoppinsGP-Medium.ttf', 'app/assets/fonts/PoppinsGP-Medium.ttf'],
    ['design/fonts/PoppinsGP-SemiBold.ttf', 'app/assets/fonts/PoppinsGP-SemiBold.ttf'],
  ])('%s', (a, b) => {
    expect(fs.readFileSync(path.join(root, b)).equals(fs.readFileSync(path.join(root, a)))).toBe(true);
  });
});
