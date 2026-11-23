/** UI kit pure helpers + token references used by the kit resolve to colours. */
import { T, resolve, pick } from '../src/theme';
import { initials, institutionColour, ringState } from '../src/ui/Data';

const isColour = (v: unknown) => typeof v === 'string' && /^(#[0-9A-Fa-f]{6}|rgba\()/.test(v);

describe('C21 badges', () => {
  test('initials skip small words, two letters', () => {
    expect(initials('Banque Baobab')).toBe('BB');
    expect(initials('Caisse de Sahel')).toBe('CS');
    expect(initials('Kola')).toBe('KO');
    expect(initials('Awa Diop')).toBe('AD');
  });
  test('institution colour is stable and from the series palette', () => {
    const a = institutionColour('bank-baobab');
    expect(institutionColour('bank-baobab')).toBe(a);
    expect(T.colour.chart.dark.series).toContain(a);
  });
});

describe('C17 ring states', () => {
  test('ok < 80 ≤ near ≤ 100 < over', () => {
    expect(ringState(79)).toBe('ok');
    expect(ringState(80)).toBe('near');
    expect(ringState(100)).toBe('near');
    expect(ringState(100.5)).toBe('over');
  });
});

describe('token references used by the kit', () => {
  test.each(['dark', 'light'] as const)('%s: sheet scrim, input fill, toast, banner resolve to colours', (s) => {
    expect(isColour(resolve(T.component.bottomSheet[s].scrim, s))).toBe(true);
    expect(isColour(pick(T.component.input.fill, s))).toBe(true);
    expect(isColour(T.component.toast[s].fill)).toBe(true);
    for (const k of ['warning', 'error', 'info'] as const) expect(isColour(T.component.banner.kinds[k][s].fill)).toBe(true);
    for (const st of ['ok', 'near', 'over', 'learning'] as const) expect(isColour(T.component.progress.ring.states[st][s])).toBe(true);
    expect(isColour(T.block.stepScreen.icon.neutral[s].circle)).toBe(true);
  });
});
