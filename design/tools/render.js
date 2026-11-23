#!/usr/bin/env node
// Renders a preview HTML to PNG.
// Usage:
//   node design/tools/render.js <preview.html> [--out file.png] [--scale 2] [--repo]
//        [--times 0,600,1200 --labels "Départ,Pièce,Mot"]  (key frames of an animated preview, one strip)
// Default: PNG for Franco at scale 2 next to the HTML in the scratchpad dir given by --out.
// --repo: also writes design/previews/<name>.png at scale 1, quantized to 256 colours (~100 KB) via PIL.
// Key frames: every Web Animation (CSS animations/transitions included) is paused and seeked to each time,
// so labels always match the sampled times (session 4 rendered a strip twice because they did not).
const {chromium} = require('playwright');
const fs = require('fs'), path = require('path'), {execFileSync} = require('child_process');

const a = process.argv.slice(2);
const file = a.find(x => x.endsWith('.html'));
const arg = (k, d) => { const i = a.indexOf(k); return i >= 0 ? a[i + 1] : d; };
const scale = +arg('--scale', 2);
const out = arg('--out', file.replace(/\.html$/, `@${scale}x.png`));
const times = arg('--times', null), labels = (arg('--labels', '') || '').split(',');
const sel = arg('--phone', '.ph');

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({viewport: {width: 1400, height: 900}, deviceScaleFactor: scale});
  await p.goto('file://' + path.resolve(file));
  await p.evaluate(() => document.fonts.ready);
  const dim = await p.evaluate(() => ({w: document.documentElement.scrollWidth, h: document.documentElement.scrollHeight}));
  await p.setViewportSize({width: dim.w, height: dim.h});
  if (!times) {
    await p.evaluate(() => document.getAnimations().forEach(x => { try { x.finish(); } catch (e) {} }));
    await p.screenshot({path: out, fullPage: true});
  } else {
    // One frame per time, cropped to the first phone, then stitched side by side with labels.
    const ts = times.split(',').map(Number), shots = [];
    for (const [i, t] of ts.entries()) {
      await p.evaluate(t => document.getAnimations().forEach(x => { x.pause(); x.currentTime = t; }), t);
      const ph = await p.$(sel);
      shots.push({t, label: labels[i] || `${t} ms`, buf: (await (ph || p).screenshot()).toString('base64')});
    }
    const html = `<body style="margin:0;background:#2a2a2a;font:500 13px/18px sans-serif;color:#ddd"><div style="display:flex;gap:12px;padding:12px">${shots.map(s => `<div><img style="display:block;width:${360}px" src="data:image/png;base64,${s.buf}"><div style="padding-top:6px">${s.label} · ${s.t} ms</div></div>`).join('')}</div>`;
    const q = await b.newPage({deviceScaleFactor: 1});
    await q.setContent(html); await q.waitForTimeout(50);
    const w = await q.evaluate(() => document.body.scrollWidth); await q.setViewportSize({width: w, height: 900});
    await q.screenshot({path: out, fullPage: true});
  }
  console.log('png:', out);
  if (a.includes('--repo')) {
    const repoPng = path.join(path.dirname(path.resolve(file)), path.basename(file, '.html') + (times ? '-keyframes' : '') + '.png');
    const p1 = await b.newPage({viewport: {width: dim.w, height: dim.h}, deviceScaleFactor: 1});
    if (times) fs.copyFileSync(out, repoPng); else {
      await p1.goto('file://' + path.resolve(file)); await p1.evaluate(() => document.fonts.ready);
      await p1.evaluate(() => document.getAnimations().forEach(x => { try { x.finish(); } catch (e) {} }));
      await p1.screenshot({path: repoPng, fullPage: true});
    }
    execFileSync('python3', ['-c', 'import sys;from PIL import Image;im=Image.open(sys.argv[1]).convert("RGB");im.quantize(colors=256).save(sys.argv[1],optimize=True)', repoPng]);
    console.log('repo png:', repoPng, Math.round(fs.statSync(repoPng).size / 1024) + ' KB');
  }
  await b.close();
})().catch(e => { console.error(e); process.exit(2); });
