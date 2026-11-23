#!/usr/bin/env node
// Builds design/tools/kit/tokens.css from design/tokens.json, so previews never hand-copy values.
// Usage: node design/tools/make-kit-css.js   (re-run after any tokens.json change; validate-item.py does it)
// Gives: @font-face Poppins GP (family "P"), theme classes .dark / .light with --c-* colour variables,
// typography classes .t-<scale name> (size/line height/weight), --s-* spacing, --r-* radii, phone frame .ph.
const fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '..');
const t = JSON.parse(fs.readFileSync(path.join(root, 'tokens.json'), 'utf8'));

const get = p => p.split('.').reduce((o, k) => o && o[k], t);
const resolve = v => { let n = 0; while (typeof v === 'string' && /^\{.+\}$/.test(v) && n++ < 5) v = get(v.slice(1, -1)); return v; };
function vars(obj, prefix, out = []) {
  for (const [k, v] of Object.entries(obj)) {
    if (k.startsWith('$')) continue;
    const name = `${prefix}-${k.replace(/[A-Z]/g, m => '-' + m.toLowerCase())}`;
    if (v && typeof v === 'object') vars(v, name, out); else out.push(`${name}:${resolve(v)}`);
  }
  return out;
}
const kebab = s => s.replace(/[A-Z]/g, m => '-' + m.toLowerCase());
const fam = t.typography.family.files;
let css = `/* Generated from tokens.json v${t.version} by make-kit-css.js — do not edit by hand. */\n`;
for (const [w, f] of Object.entries(fam)) css += `@font-face{font-family:P;font-weight:${w};src:url(../../fonts/${f}.ttf)}\n`;
css += `*{box-sizing:border-box}body{margin:0;background:#2a2a2a;font:400 15px/22px P;-webkit-font-smoothing:antialiased}\n`;
css += `.dark{${vars(t.colour.dark, '--c').join(';')}}\n.light{${vars(t.colour.light, '--c').join(';')}}\n`;
css += `:root{${Object.entries(t.spacing).filter(([k]) => k !== 'unit').map(([k, v]) => `--${k}:${v}px`).join(';')};${Object.entries(t.radius).map(([k, v]) => `--r-${kebab(k)}:${v}px`).join(';')};--margin:${t.layout.screenMargin}px}\n`;
for (const [k, v] of Object.entries(t.typography.scale))
  css += `.t-${kebab(k)}{font:${v.weight} ${v.size}px/${v.lineHeight}px P${v.letterSpacing ? `;letter-spacing:${v.letterSpacing}px` : ''}${v.tabular ? ';font-variant-numeric:tabular-nums' : ''}}\n`;
css += `/* Preview frame: one phone at the reference size. Annotations go in .cap under the phone (D12). */
.row{display:flex;gap:16px;padding:16px;width:max-content;align-items:flex-start}
.col{display:flex;flex-direction:column;gap:8px}
.ph{width:${t.layout.referenceScreen?.width || 360}px;height:${t.layout.referenceScreen?.height || 800}px;background:var(--c-bg);color:var(--c-text-primary);position:relative;overflow:hidden}
.ph.tall{height:auto;min-height:800px}
.cap{font:500 13px/18px P;color:#ddd;max-width:360px}
.ic{flex:none;display:inline-block}  /* icons and rings never shrink (the Home ring bug) */\n`;
fs.mkdirSync(path.join(__dirname, 'kit'), {recursive: true});
fs.writeFileSync(path.join(__dirname, 'kit', 'tokens.css'), css);
console.log(`kit/tokens.css written (${css.length} bytes, tokens v${t.version})`);
