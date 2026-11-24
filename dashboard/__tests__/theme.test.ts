import { readFileSync } from 'node:fs';
import { resolve as path } from 'node:path';
import { cssVars, layout, resolve, T } from '../src/theme';

describe('tokens', () => {
  it('is an identical copy of design/tokens.json', () => {
    const design = readFileSync(path(__dirname, '../../design/tokens.json'), 'utf8');
    const copy = readFileSync(path(__dirname, '../src/theme/tokens.json'), 'utf8');
    expect(copy).toBe(design);
  });

  it('resolves scheme references', () => {
    expect(resolve('{colour.*.brand.fill}', 'light')).toBe(T.colour.light.brand.fill);
    expect(resolve('{colour.*.focus}', 'dark')).toBe(T.colour.dark.focus);
  });

  it.each(['light', 'dark'] as const)('gives every CSS variable a concrete value (%s)', (scheme) => {
    for (const [k, v] of Object.entries(cssVars(scheme))) {
      expect(v, k).toBeTruthy();
      expect(v, k).not.toMatch(/[{}]|undefined|object/);
    }
  });

  it('uses the D screen values', () => {
    expect(layout.topBar).toBe(56);
    expect(layout.queueWidth).toBe(420);
    expect(cssVars('light')['--selected']).toBe('#FFF3EC');
    expect(cssVars('light')['--focus']).toBe('#B4410F');
    expect(cssVars('light')['--btn-danger']).toBe('#C8283C');
    expect(cssVars('light')['--btn-danger-label']).toBe('#FFFFFF');
  });

  it('ships the Poppins GP fonts and the brand mark unchanged', () => {
    for (const f of ['PoppinsGP-Regular.ttf', 'PoppinsGP-Medium.ttf', 'PoppinsGP-SemiBold.ttf']) {
      expect(readFileSync(path(__dirname, '../public/fonts', f)).equals(readFileSync(path(__dirname, '../../design/fonts', f)))).toBe(true);
    }
    for (const f of ['icon.svg', 'mark.svg']) {
      expect(readFileSync(path(__dirname, '../public/brand', f), 'utf8')).toBe(readFileSync(path(__dirname, '../../app/assets/brand', f), 'utf8'));
    }
  });
});
