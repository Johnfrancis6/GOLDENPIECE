#!/usr/bin/env node
// Automated review of a design preview (HTML) before it is shown to Franco.
// Usage: node design/tools/lint-preview.js <preview.html> [--phone .ph] [--font2x] [--json out.json] [--max 12]
// Checks every phone frame (default selector ".ph", else <body>) for:
//   type   off-scale font size / line height (tokens.typography.scale), size < minSize
//   grid   padding / margin / gap not on the 4 dp grid (values <= 2 are hairlines, allowed)
//   contr  text contrast (WCAG 2.2: 4.5:1, 3:1 for large text) and graphic marks (3:1)
//   overlap  two text runs whose boxes intersect (D12)
//   clip   SVG/IMG rendered smaller than its declared size (flex shrink), text cut by an
//          overflow:hidden ancestor or the phone edge, active ellipsis
//   colour colour not present in tokens.json
//   d11    first-screen blocks > 3, header actions > 1, row side > 2 lines (needs data-block,
//          data-action, data-row/data-side marks from the preview kit; skipped otherwise)
//   tap    interactive element smaller than 48 dp (button, a, [role=button], [data-tap])
//   annot  annotation outside the phone overlapping a phone (D12)
// Exit code 1 when errors exist. Output is short on purpose (token budget): at most --max lines per check.
const {chromium} = require('playwright');
const fs = require('fs'), path = require('path');

const args = process.argv.slice(2);
const opt = {phone: '.ph', max: 12, font2x: false, json: null};
const files = [];
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === '--phone') opt.phone = args[++i];
  else if (a === '--max') opt.max = +args[++i];
  else if (a === '--font2x') opt.font2x = true;
  else if (a === '--json') opt.json = args[++i];
  else files.push(a);
}
if (!files.length) { console.error('usage: lint-preview.js <file.html> [--font2x] [--phone sel] [--json out]'); process.exit(2); }

const root = path.resolve(__dirname, '..');
const tokens = JSON.parse(fs.readFileSync(path.join(root, 'tokens.json'), 'utf8'));
const scale = [];
(function walk(o, k) { if (!o || typeof o !== 'object') return; if (typeof o.size === 'number' && typeof o.lineHeight === 'number') scale.push({k, size: o.size, lh: o.lineHeight, w: o.weight}); for (const [kk, v] of Object.entries(o)) walk(v, k ? k + '.' + kk : kk); })(tokens, '');
const minSize = tokens.typography.minSize || 12;
const tokenColours = [...new Set((JSON.stringify(tokens).match(/#[0-9A-Fa-f]{6}\b/g) || []).map(s => s.toUpperCase()))];
// Extra allowed colours (pure white/black, transparent) and preview-frame colours outside phones are ignored.
for (const m of JSON.stringify(tokens).matchAll(/rgba?\((\d+),\s*(\d+),\s*(\d+)/g)) tokenColours.push('#' + [m[1], m[2], m[3]].map(v => (+v).toString(16).padStart(2, '0')).join('').toUpperCase());
tokenColours.push('#FFFFFF', '#000000');

async function lintFile(browser, file) {
  const page = await browser.newPage({viewport: {width: 1600, height: 1000}, deviceScaleFactor: 1});
  await page.goto('file://' + path.resolve(file));
  await page.evaluate(() => document.fonts.ready);
  // Make the viewport cover the whole page so elementFromPoint works on every phone.
  const dim = await page.evaluate(() => ({w: document.documentElement.scrollWidth, h: document.documentElement.scrollHeight}));
  await page.setViewportSize({width: Math.min(Math.max(dim.w, 400), 12000), height: Math.min(Math.max(dim.h, 400), 12000)});
  // Freeze animations at their end state so geometry is final.
  await page.evaluate(() => document.getAnimations().forEach(a => { try { a.finish(); } catch (e) { a.pause(); } }));
  if (opt.font2x) {
    await page.evaluate(() => {
      const els = [...document.querySelectorAll('body *')];
      const cs = els.map(e => getComputedStyle(e));
      els.forEach((e, i) => {
        const fs = parseFloat(cs[i].fontSize), lh = parseFloat(cs[i].lineHeight);
        e.style.fontSize = fs * 2 + 'px';
        if (!isNaN(lh)) e.style.lineHeight = lh * 2 + 'px';
      });
    });
  }
  const res = await page.evaluate(({sel, scale, minSize, tokenColours, font2x}) => {
    const out = {contrEst: [], strip: [], type: [], grid: [], contr: [], overlap: [], clip: [], colour: [], d11: [], tap: [], annot: [], info: []};
    const phones = [...document.querySelectorAll(sel)];
    const frames = phones.length ? phones : [document.body];
    if (!phones.length) out.info.push(`no "${sel}" frame: whole page checked`);
    const parse = c => { const m = c && c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return {r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1}; };
    const hex = c => '#' + [c.r, c.g, c.b].map(v => Math.round(v).toString(16).padStart(2, '0')).join('').toUpperCase();
    const lum = c => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
    const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
    const blend = (fg, bg) => ({r: fg.r * fg.a + bg.r * (1 - fg.a), g: fg.g * fg.a + bg.g * (1 - fg.a), b: fg.b * fg.a + bg.b * (1 - fg.a), a: 1});
    // Effective background: walk up, blending translucent layers; gradient/image => unknown (skip contrast).
    function bgOf(el) {
      const layers = [];
      for (let e = el; e; e = e.parentElement) {
        const s = getComputedStyle(e);
        if (s.backgroundImage && s.backgroundImage !== 'none') {
          // A gradient: use its colour stops' average as an estimate, flagged as such.
          const stops = (s.backgroundImage.match(/rgba?\([^)]+\)/g) || []).map(parse).filter(Boolean);
          if (!stops.length) return null;
          const avg = stops.reduce((a, c) => ({r: a.r + c.r / stops.length, g: a.g + c.g / stops.length, b: a.b + c.b / stops.length, a: 1}), {r: 0, g: 0, b: 0, a: 1});
          let c = avg; for (let i = layers.length - 1; i >= 0; i--) c = blend(layers[i], c);
          return {c, est: true};
        }
        let c = parse(s.backgroundColor);
        if (!c || c.a === 0) for (const ps of ['::before', '::after']) { const q = getComputedStyle(e, ps); if (q.content !== 'none' && q.position === 'absolute') { const pc = parse(q.backgroundColor); if (pc && pc.a > 0) { c = pc; break; } } }
        if (c && c.a > 0) { if (c.a >= 1) { let r = c; for (let i = layers.length - 1; i >= 0; i--) r = blend(layers[i], r); return {c: r, est: false}; } layers.push(c); }
      }
      let r = {r: 255, g: 255, b: 255, a: 1}; for (let i = layers.length - 1; i >= 0; i--) r = blend(layers[i], r); return {c: r, est: false};
    }
    // Background actually painted under a point: walk the paint stack below the element, blending translucent layers.
    function bgAt(el, x, y) {
      const full = document.elementsFromPoint(x, y);
      const at = full.indexOf(el);
      if (at < 0) return null; // not hit-testable here (pointer-events, clipped): skip
      // Anything painted above the text with an opaque fill hides it: not visible, skip.
      for (const e of full.slice(0, at)) { if (el.contains(e)) continue; const c = parse(getComputedStyle(e).backgroundColor); if (c && c.a >= 0.9 && effOpacity(e) >= 0.9) return null; }
      const stack = full.slice(at);
      const layers = [];
      for (const e of stack) {
        const s = getComputedStyle(e);
        if (s.backgroundImage && s.backgroundImage !== 'none' && !s.backgroundImage.startsWith('url')) return bgOf(e) && {c: (function(){ let c = bgOf(e).c; for (let i = layers.length - 1; i >= 0; i--) c = blend(layers[i], c); return c; })(), est: true};
        let c = parse(s.backgroundColor);
        if (!c || c.a === 0) for (const ps of ['::before', '::after']) { const q = getComputedStyle(e, ps); if (q.content !== 'none' && q.position === 'absolute') { const pc = parse(q.backgroundColor); if (pc && pc.a > 0) { c = pc; break; } } }
        if (c && c.a > 0) { const op = +s.opacity; c = {...c, a: c.a * (isNaN(op) ? 1 : op)}; if (c.a >= 0.999) { let r = c; for (let i = layers.length - 1; i >= 0; i--) r = blend(layers[i], r); return {c: r, est: false}; } layers.push(c); }
      }
      let r = {r: 255, g: 255, b: 255, a: 1}; for (let i = layers.length - 1; i >= 0; i--) r = blend(layers[i], r); return {c: r, est: false};
    }
    const label = el => { const t = (el.textContent || '').trim().replace(/\s+/g, ' '); return (el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.split(' ')[0] : '') + (t ? ` "${t.slice(0, 28)}"` : '')); };
    const effOpacity = el => { let o = 1; for (let e = el; e && e.nodeType === 1; e = e.parentElement) o *= +getComputedStyle(e).opacity; return o; };
    const visible = el => { const s = getComputedStyle(el); if (s.visibility === 'hidden' || s.display === 'none' || effOpacity(el) < 0.05) return false; const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
    const inter = (a, b, pad = 1) => !(a.right <= b.left + pad || b.right <= a.left + pad || a.bottom <= b.top + pad || b.bottom <= a.top + pad);
    const seen = {};
    const push = (k, msg) => { const key = k + msg; if (seen[key]) { seen[key].n++; return; } seen[key] = {k, msg, n: 1}; out[k].push(seen[key]); };

    frames.forEach((ph, pi) => {
      const pr = ph.getBoundingClientRect();
      const theme = ph.closest('.light') || ph.classList.contains('light') ? 'light' : 'dark';
      const tag = `[${pi + 1}:${theme}]`;
      const all = [...ph.querySelectorAll('*')].filter(visible);
      // Text runs: elements with a direct non-empty text node.
      const textEls = all.filter(e => [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()));
      const runs = [];
      for (const el of textEls) {
        const s = getComputedStyle(el);
        { const b = el.getBoundingClientRect(), cx = b.left + b.width / 2, cy = b.top + b.height / 2;
          if (cx < pr.left || cx > pr.right || cy < pr.top || cy > pr.bottom) continue; } // scrolled out of the phone: not visible
        const size = parseFloat(s.fontSize), lh = parseFloat(s.lineHeight), w = +s.fontWeight;
        const base = font2x ? 2 : 1;
        if (!font2x) {
          const m = scale.find(t => t.size === size && (isNaN(lh) || t.lh === lh));
          const ign = el.closest('[data-lint-ignore]')?.dataset.lintIgnore || '';
          if (ign.includes('type')) continue;
          if (!m && !el.closest('svg')) push('type', `${tag} ${size}/${isNaN(lh) ? 'normal' : lh} w${w} not in scale — ${label(el)}`);
          if (size < minSize && !el.closest('svg')) push('type', `${tag} ${size} px < minSize ${minSize} — ${label(el)}`);
        }
        // Contrast
        const fg = parse(s.color); const br = el.getBoundingClientRect(); const bg = bgAt(el, br.left + Math.min(br.width / 2, 6), br.top + br.height / 2);
        const disabled = el.closest('[disabled],[aria-disabled="true"],.dis,[data-disabled]');
        if (fg && bg && !disabled) {
          const f = fg.a < 1 ? blend(fg, bg.c) : fg; const r = ratio(f, bg.c);
          const large = size / base >= 24 || (size / base >= 18.66 && w >= 700);
          const need = large ? 3 : 4.5;
          if (r < need) push(bg.est ? 'contrEst' : 'contr', `${tag} ${r.toFixed(2)}:1 < ${need} ${hex(f)} on ${hex(bg.c)}${bg.est ? ' (gradient average: check by eye)' : ''} — ${label(el)}`);
        }
        // Text run boxes (per line) for overlap
        for (const n of el.childNodes) if (n.nodeType === 3 && n.textContent.trim()) {
          const rg = document.createRange(); rg.selectNodeContents(n);
          const fsz = parseFloat(s.fontSize);
          // Glyph box: the inline box includes ascent/descent padding (≈ 1.5 × size for Poppins); keep the central 0.75 × size.
          for (const r of rg.getClientRects()) if (r.width > 1 && r.height > 1) { const cy = r.top + r.height / 2, h = 0.375 * fsz; runs.push({el, r: {left: r.left, right: r.right, top: cy - h, bottom: cy + h}}); }
        }
        // Clipped by an overflow ancestor or the phone
        const er = el.getBoundingClientRect();
        let peek = false; for (let a = el.parentElement; a && a !== ph; a = a.parentElement) { const ar = a.getBoundingClientRect(); if (ar.right > pr.right + 8 || ar.left < pr.left - 8) { peek = true; break; } }
        if (!peek && !(el.closest('[data-lint-ignore]')?.dataset.lintIgnore || '').includes('clip')) for (let a = el.parentElement; a && a !== ph.parentElement; a = a.parentElement) {
          const as = getComputedStyle(a);
          if (as.overflow !== 'visible' || a === ph) {
            const ar = a.getBoundingClientRect();
            if (a === ph && (er.right > ar.right + 1 || er.left < ar.left - 1)) { push('clip', `${tag} text runs past the phone edge — ${label(el)}`); break; }
            if (a !== ph && as.overflowX !== 'visible' && as.overflowX !== 'auto' && as.overflowX !== 'scroll' && (er.right > ar.right + 1 || er.left < ar.left - 1)) { if (a.scrollWidth > a.clientWidth + 1 && getComputedStyle(a).flexWrap === 'nowrap' && a.children.length >= 3) push('strip', `${tag} last item cut in a scroll strip (ok if it scrolls) — ${label(el)}`); else push('clip', `${tag} text cut horizontally by ${label(a)} — ${label(el)}`); break; }
            if (a !== ph && as.overflowY === 'hidden' && (er.bottom > ar.bottom + 1 || er.top < ar.top - 1) && ar.bottom < pr.bottom - 1) { push('clip', `${tag} text cut vertically by ${label(a)} — ${label(el)}`); break; }
            if (a === ph) break;
          }
        }
        if (s.textOverflow === 'ellipsis' && el.scrollWidth > el.clientWidth + 1) push('strip', `${tag} ellipsis active — ${label(el)}`);
      }
      // Overlap between text runs of different elements (not ancestor/descendant)
      for (let i = 0; i < runs.length; i++) for (let j = i + 1; j < runs.length; j++) {
        const A = runs[i], B = runs[j];
        if (A.el === B.el || A.el.contains(B.el) || B.el.contains(A.el)) continue;
        if (!inter(A.r, B.r, 2)) continue;
        const cx = (Math.max(A.r.left, B.r.left) + Math.min(A.r.right, B.r.right)) / 2, cy = (Math.max(A.r.top, B.r.top) + Math.min(A.r.bottom, B.r.bottom)) / 2;
        const hit = document.elementFromPoint(cx, cy);
        if (hit) { let covered = false; const top = A.el.contains(hit) || hit.contains(A.el) ? A.el : B.el.contains(hit) || hit.contains(B.el) ? B.el : null; const low = top === A.el ? B.el : A.el;
          // Covered if an opaque background sits between the lower run and the hit point, or the hit is neither run (an overlay).
          if (!top) covered = true; else for (let e = top; e && !e.contains(low); e = e.parentElement) { const c = parse(getComputedStyle(e).backgroundColor); if ((c && c.a >= 0.9) || getComputedStyle(e).backgroundImage !== 'none') { covered = true; break; } }
          if (covered) continue; }
        if ((A.el.closest('[data-lint-ignore]')?.dataset.lintIgnore || '').includes('overlap')) continue;
        push('overlap', `${tag} ${label(A.el)} overlaps ${label(B.el)}`);
      }
      // Graphics squeezed by flex shrink (the Home ring bug): re-measure with flex-shrink 0.
      for (const g of all) {
        const ps = g.parentElement && getComputedStyle(g.parentElement);
        if (!ps || !ps.display.includes('flex')) continue;
        const isGraphic = /^(svg|IMG|CANVAS)$/i.test(g.tagName) || (!g.textContent.trim() && g.querySelector('svg,img,canvas'));
        if (!isGraphic || getComputedStyle(g).flexShrink === '0') continue;
        const r = g.getBoundingClientRect(); const old = g.style.flexShrink; g.style.flexShrink = '0';
        const r2 = g.getBoundingClientRect(); g.style.flexShrink = old;
        if (r2.width > r.width + 1 || r2.height > r.height + 1) push('clip', `${tag} graphic squeezed by flex shrink: ${Math.round(r.width)}×${Math.round(r.height)} instead of ${Math.round(r2.width)}×${Math.round(r2.height)} (set flex:none) — ${label(g.parentElement)}`);
      }
      for (const m of all.filter(e => e instanceof SVGGeometryElement)) {
        const s = getComputedStyle(m); const bg = bgOf(m.ownerSVGElement || m); if (!bg) continue;
        for (const prop of ['stroke', 'fill']) {
          const c = parse(s[prop]); if (!c || c.a === 0 || s[prop] === 'none') continue;
          const op = +s.opacity * (+s[prop + 'Opacity'] || 1);
          const f = blend({...c, a: c.a * op}, bg.c); const r = ratio(f, bg.c);
          if (r < 3 && op > 0.05) push('contr', `${tag} mark ${prop} ${r.toFixed(2)}:1 < 3 ${hex(f)} on ${hex(bg.c)} (warning: decorative marks may pass) — ${label(m.ownerSVGElement.parentElement)}`);
        }
      }
      // Grid + colours
      for (const e of all) {
        const s = getComputedStyle(e);
        for (const p of ['paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 'marginTop', 'marginBottom', 'rowGap', 'columnGap']) {
          const v = parseFloat(s[p]); if (!isNaN(v) && v > 2 && Math.abs(v % 4) > 0.01 && !font2x) push('grid', `${tag} ${v} dp off the 4 dp grid (padding/margin/gap)`);
        }
        const cols = [s.color, s.backgroundColor, s.borderTopColor, e instanceof SVGElement ? s.fill : null, e instanceof SVGElement ? s.stroke : null, ...((s.backgroundImage || '').match(/rgba?\([^)]+\)/g) || [])];
        for (const c of cols) { const p = parse(c); if (!p || p.a === 0) continue; const h = hex(p); if (!tokenColours.includes(h)) push('colour', `${tag} ${h}${p.a < 1 ? ' @' + p.a : ''} not in tokens.json`); }
        // Tap targets
        if (e.matches('button, a, [role=button], [data-tap]')) { const r = e.getBoundingClientRect(); if (r.width < 47.5 || r.height < 47.5) push('tap', `${tag} target ${Math.round(r.width)}×${Math.round(r.height)} < 48 dp — ${label(e)} (ok if the hit area is padded in build)`); }
      }
      // D11 (only when the preview kit marks exist)
      const blocks = all.filter(e => e.hasAttribute('data-block'));
      if (blocks.length) {
        const first = blocks.filter(b => b.getBoundingClientRect().top - pr.top < 800 && !b.closest('[data-block]:not(:scope)'));
        const n = first.filter(b => b.dataset.block !== 'hero').length;
        if (n > 3) push('d11', `${tag} ${n} blocks on the first screen (D11: hero + 3)`);
      } else out.info.push(`${tag} no data-block marks: D11 block count skipped`);
      const acts = all.filter(e => e.hasAttribute('data-action'));
      if (acts.length > 1 && !ph.hasAttribute('data-d11-exception')) push('d11', `${tag} ${acts.length} header actions (D11: 1)`);
      for (const side of all.filter(e => e.hasAttribute('data-side'))) {
        const max = +(side.closest('[data-row]')?.dataset.row || 2);
        const lines = [...side.querySelectorAll('*'), side].filter(x => [...x.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()))
          .reduce((a, x) => a + Math.round(x.getBoundingClientRect().height / (parseFloat(getComputedStyle(x).lineHeight) || 1)), 0);
        if (lines > max * (font2x ? 2 : 1)) push('d11', `${tag} row side has ${lines} lines (max ${max}) — ${label(side)}`);
      }
    });
    // Annotations outside phones overlapping a phone (D12)
    if (phones.length) {
      const pr = phones.map(p => p.getBoundingClientRect());
      for (const e of [...document.querySelectorAll('body *')].filter(x => !x.closest(sel) && !x.querySelector(sel) && visible(x) && [...x.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())))
        if (pr.some(r => inter(e.getBoundingClientRect(), r, 0))) push('annot', `annotation over a phone — ${label(e)}`);
    }
    return out;
  }, {sel: opt.phone, scale, minSize, tokenColours, font2x: opt.font2x});
  await page.close();
  return res;
}

const SEV = {contrEst: 'warn', strip: 'warn', overlap: 'error', clip: 'error', contr: 'error', annot: 'error', d11: 'error', type: 'warn', grid: 'warn', colour: 'warn', tap: 'warn'};
(async () => {
  const browser = await chromium.launch();
  let errors = 0; const report = {};
  for (const f of files) {
    const r = await lintFile(browser, f); report[f] = r;
    const lines = [];
    for (const k of Object.keys(SEV)) {
      const items = r[k]; if (!items.length) continue;
      // Graphic-mark contrast is a warning, not an error.
      const errs = items.filter(i => !(k === 'contr' && i.msg.includes(' mark ')));
      if (SEV[k] === 'error') errors += errs.length;
      lines.push(`${SEV[k] === 'error' && errs.length ? 'ERROR' : 'warn '} ${k} (${items.length})`);
      items.slice(0, opt.max).forEach(i => lines.push(`   ${i.msg}${i.n > 1 ? ` ×${i.n}` : ''}`));
      if (items.length > opt.max) lines.push(`   … ${items.length - opt.max} more (use --json)`);
    }
    console.log(`== ${path.relative(process.cwd(), f)}${opt.font2x ? ' @200 %' : ''}: ${lines.length ? '' : 'clean'}`);
    lines.forEach(l => console.log(l));
    r.info.slice(0, 3).forEach(i => console.log('info  ' + i));
  }
  await browser.close();
  if (opt.json) fs.writeFileSync(opt.json, JSON.stringify(report, null, 1));
  console.log(`errors: ${errors}`);
  process.exit(errors ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
