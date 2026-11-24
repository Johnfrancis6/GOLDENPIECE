/**
 * Dashboard theme built from design/tokens.json (copied as is to
 * ./tokens.json; a test checks the copy is identical). Never invent a value
 * here: read it from the tokens. Values the D screen file gives as literals
 * (screens/d-bank-dashboard.md) are read from `screen.bankDashboard` or are
 * the measured pairs of D §6, named once below.
 */
import tokens from './tokens.json';

export type Scheme = 'light' | 'dark';
export const T = tokens;

/** Resolve "{a.b.c}" / "{colour.*.x}" references for one scheme. */
export function resolve(value: unknown, scheme: Scheme): unknown {
  if (typeof value !== 'string') return value;
  const m = /^\{([^}]+)\}(.*)$/.exec(value);
  if (!m) return value;
  const path = m[1].replace('*', scheme).split('.');
  let cur: unknown = tokens;
  for (const p of path) cur = (cur as Record<string, unknown>)?.[p];
  if (m[2]) return `${String(resolve(cur, scheme))}${m[2]}`;
  return resolve(cur, scheme);
}

/** A {dark, light} pair or a single value → the scheme's value. */
export function pick(v: unknown, scheme: Scheme): string {
  if (v && typeof v === 'object' && 'dark' in v && 'light' in v) {
    return String(resolve((v as Record<Scheme, unknown>)[scheme], scheme));
  }
  return String(resolve(v, scheme));
}

const D = tokens.screen.bankDashboard;
const btn = tokens.component.button;
const input = tokens.component.input;
const banner = tokens.component.banner;
const badge = tokens.component.scoreBadge;
const tag = tokens.component.tag;

/** 90-day bars: D gives #BDBDBD (light); dark (delegated) uses the dark control border grey. */
/** C19 ground line (components/loading-empty.md). */
const EMPTY_GROUND = { dark: '#3A3A3A', light: '#D6D6D6' };
const BARS = { light: D.history.bar, dark: tokens.colour.dark.border.control };

/** D §6 measured pairs (light); dark uses the app dark tokens (delegated). */
const LIVE = { light: { text: '#0B6B3A', dot: '#16894F' }, dark: { text: tokens.colour.dark.gain, dot: tokens.colour.dark.gain } };
const SELECTED = { light: D.queue.selected.fill, dark: tokens.colour.dark.tint.brand };

/** CSS custom properties for one scheme. */
export function cssVars(scheme: Scheme): Record<string, string> {
  const c = tokens.colour[scheme];
  return {
    '--bg': c.bg,
    '--s1': c.surface1,
    '--s2': c.surface2,
    '--s3': c.surface3,
    '--hl': c.border.hairline,
    '--control': c.border.control,
    '--tp': c.text.primary,
    '--ts': c.text.secondary,
    '--td': c.text.disabled,
    '--brand': c.brand.fill,
    '--brand-pressed': c.brand.fillPressed,
    '--brand-on': c.brand.onFill,
    '--brt': c.brand.text,
    '--focus': c.focus,
    '--gain': c.gain,
    '--loss': c.loss,
    '--warning': c.warning,
    '--info': c.info,
    '--tint-gain': c.tint.gain,
    '--tint-loss': c.tint.loss,
    '--tint-warning': c.tint.warning,
    '--tint-info': c.tint.info,
    '--tint-brand': c.tint.brand,
    '--scrim': c.scrim,
    '--inverse': c.inverse.fill,
    '--inverse-on': c.inverse.onFill,
    '--live-text': LIVE[scheme].text,
    '--live-dot': LIVE[scheme].dot,
    '--selected': SELECTED[scheme],
    '--btn-secondary': btn.secondary[scheme].fill,
    '--btn-secondary-label': pick(btn.secondary[scheme].label, scheme),
    '--btn-secondary-pressed': btn.secondary[scheme].pressed,
    '--btn-primary-label': btn.primary.label,
    '--destructive-text': pick(btn.destructiveText, scheme),
    '--btn-danger': pick(btn.destructiveConfirm[scheme].fill, scheme),
    '--btn-danger-label': btn.destructiveConfirm[scheme].label,
    '--btn-disabled': pick(btn.disabled.fill, scheme),
    '--btn-disabled-label': pick(btn.disabled.label, scheme),
    '--input-fill': pick(input.fill, scheme),
    '--input-placeholder': pick(input.placeholder, scheme),
    '--input-border': scheme === 'light' ? 'rgba(0,0,0,0.10)' : 'transparent',
    '--banner-warning': banner.kinds.warning[scheme].fill,
    '--banner-warning-icon': banner.kinds.warning[scheme].icon,
    '--banner-error': banner.kinds.error[scheme].fill,
    '--banner-error-icon': banner.kinds.error[scheme].icon,
    '--banner-info': banner.kinds.info[scheme].fill,
    '--banner-info-icon': banner.kinds.info[scheme].icon,
    '--badge-normal': badge[scheme].normal.fill,
    '--badge-normal-text': badge[scheme].normal.text,
    '--badge-ask': badge[scheme].confirm.fill,
    '--badge-ask-text': badge[scheme].confirm.text,
    '--badge-bank': badge[scheme].notified.fill,
    '--badge-bank-text': badge[scheme].notified.text,
    '--tag-neutral': tag[scheme].neutral.fill,
    '--tag-neutral-text': tag[scheme].neutral.text,
    '--tag-brand': tag[scheme].brand.fill,
    '--tag-brand-text': tag[scheme].brand.text,
    '--tag-loss': tag[scheme].loss.fill,
    '--tag-loss-text': tag[scheme].loss.text,
    '--bar': BARS[scheme],
    '--empty-ground': EMPTY_GROUND[scheme],
    '--bar-current': c.brand.fill,
    '--quick': `${tokens.motion.duration.quick}ms`,
    '--rise': `${tokens.motion.distance.enterTranslateDp}px`,
  };
}

export function cssText(scheme: Scheme): string {
  return Object.entries(cssVars(scheme)).map(([k, v]) => `${k}:${v}`).join(';');
}

export function applyTheme(scheme: Scheme, root: HTMLElement = document.documentElement): void {
  root.style.cssText = cssText(scheme);
  root.dataset.theme = scheme;
  root.style.colorScheme = scheme;
}

export const layout = {
  topBar: D.topBar,
  queueWidth: D.queue.width,
  minWidth: D.minWidth,
  loginCard: 400, // D §8: centred card 400 wide
};
