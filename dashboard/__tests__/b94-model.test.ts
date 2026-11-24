import { areaStops, monotonePath, ms, timeTicks } from '../src/ops/model';
import { changeTitle, paramValue, sortParams } from '../src/settings/params';
import type { ParamChange, ParamRow } from '../src/lib/types';

describe('settings model', () => {
  it('formats weights, bonuses and real values', () => {
    expect(paramValue('w:R4', 47, 'fr')).toBe('47');
    expect(paramValue('bump:new_device', 0.1, 'fr')).toBe('+0,10');
    expect(paramValue('bump:integrity_fail', 0, 'fr')).toBe('0,00');
    expect(paramValue('z0', 3, 'fr')).toBe('3,0');
    expect(paramValue('z0', 2.25, 'fr')).toBe('2,25');
    expect(paramValue('hour_r0', 0.95, 'en')).toBe('0.95');
  });
  it('sorts by group then catalogue order, unknown keys last', () => {
    const r = (key: string) => ({ key } as ParamRow);
    expect(sortParams([r('zz_new'), r('bump:no_lock'), r('w:R1'), r('if_weight'), r('z1'), r('z0')]).map((p) => p.key))
      .toEqual(['z0', 'z1', 'if_weight', 'w:R1', 'bump:no_lock', 'zz_new']);
  });
  it('writes log titles as in the D preview', () => {
    const c = { key: 'w:R4', user_ref: null, category: null, before: 50, after: 47 } as ParamChange;
    expect(changeTitle(c, 'fr')).toBe('Poids R4 : 50 → 47');
    expect(changeTitle(c, 'en')).toBe('R4 weight: 50 → 47');
    expect(changeTitle({ ...c, key: 'z0', user_ref: '1930', category: 'food.restaurant', before: 3, after: 3.25 } as ParamChange, 'fr'))
      .toMatch(/^U-1930 · z0 .+ : 3,0 → 3,25$/);
  });
});

describe('ops model', () => {
  it('formats latencies', () => {
    expect(ms(279.8, 'fr')).toBe('280 ms');
    expect(ms(3951.6, 'fr')).toBe('3,95 s');
    expect(ms(12_340, 'en')).toBe('12.3 s');
    expect(ms(null, 'fr')).toBe('—');
  });
  it('draws a monotone path that never overshoots the data', () => {
    const pts = [{ x: 0, y: 10 }, { x: 10, y: 0 }, { x: 20, y: 0 }, { x: 30, y: 10 }];
    const nums = monotonePath(pts).match(/-?\d+(\.\d+)?/g)!.map(Number);
    const ys = nums.filter((_, i) => i % 2 === 1);
    expect(Math.min(...ys)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...ys)).toBeLessThanOrEqual(10);
  });
  it('builds the G1 gradient and ≤ 4 time labels', () => {
    const s = areaStops(0.16);
    expect(s).toHaveLength(13);
    expect(s[0].opacity).toBeCloseTo(0.16);
    expect(s[12].opacity).toBe(0);
    expect(timeTicks(14)).toEqual([0, 4, 9, 13]);
    expect(timeTicks(3)).toEqual([0, 1, 2]);
  });
});
