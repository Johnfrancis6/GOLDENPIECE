// Brand mark export (design/foundations/icons.md §11, direction A "Cœur doré").
// One geometry → SVG sources in assets/brand/ → PNG layers for Expo (rendered by Chromium/Playwright).
//   node scripts/export-brand.mjs        (from app/)
// Never redraw by hand: change the geometry here and re-run.
import { mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const assets = join(here, '..', 'assets');
const brand = join(assets, 'brand');
mkdirSync(brand, { recursive: true });

// 108 dp adaptive canvas, centre 54; coins on R 23, r 10; sparkle half-side 11 (icons.md §11).
const C = 54, R = 23, r = 10, h = 11;
const coins = Array.from({ length: 8 }, (_, i) => {
  const a = (i * Math.PI) / 4;
  return [C + R * Math.sin(a), C - R * Math.cos(a)];
});
const coinEls = (fill, op) => coins.map(([x, y]) =>
  `<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="${r}" fill="${fill}"${op != null ? ` fill-opacity="${op}"` : ''}/>`).join('');
const spark = `M${C} ${C - h} A${h} ${h} 0 0 0 ${C + h} ${C} A${h} ${h} 0 0 0 ${C} ${C + h} A${h} ${h} 0 0 0 ${C - h} ${C} A${h} ${h} 0 0 0 ${C} ${C - h}Z`;
const gold = (id, stops) => `<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1">${stops
  .map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join('')}</linearGradient>`;
const GOLD_DARK = [[0, '#FFE3A3'], [0.45, '#FFC97A'], [1, '#FF9A45']];
const GOLD_LIGHT = [[0, '#FFB45C'], [0.45, '#F2602B'], [1, '#E8452A']];
const svg = (body, defs = '') =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 108 108" width="108" height="108"><defs>${defs}</defs>${body}</svg>\n`;
const bgDefs = `<linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#262626"/><stop offset="1" stop-color="#0B0B0B"/></linearGradient>`;

const files = {
  // Mark on transparent, dark variant (launcher foreground, dark splash, M14 end frame).
  'mark.svg': svg(coinEls('#FFFFFF', 0.62) + `<path d="${spark}" fill="url(#g)"/>`, gold('g', GOLD_DARK)),
  // Light splash variant.
  'mark-light.svg': svg(coinEls('#0A0A0A', 0.42) + `<path d="${spark}" fill="url(#g)"/>`, gold('g', GOLD_LIGHT)),
  // Launcher background layer.
  'icon-background.svg': svg('<rect width="108" height="108" fill="url(#bg)"/>', bgDefs),
  // Full legacy icon (background + mark).
  'icon.svg': svg('<rect width="108" height="108" fill="url(#bg)"/>' + coinEls('#FFFFFF', 0.62) + `<path d="${spark}" fill="url(#g)"/>`,
    bgDefs + gold('g', GOLD_DARK)),
  // Silhouette: Android 13 themed icon + notification small icon ic_stat_gp (white, no translucency).
  'mark-mono.svg': svg(coinEls('#FFFFFF') + `<path d="${spark}" fill="#FFFFFF"/>`),
};
for (const [name, s] of Object.entries(files)) writeFileSync(join(brand, name), s);

// PNG targets: [svg, out, size px, viewBox crop]
const FULL = '0 0 108 108', SAFE = '21 21 66 66';
const targets = [
  ['icon.svg', 'icon.png', 1024, FULL],
  ['icon-background.svg', 'android-icon-background.png', 1024, FULL],
  ['mark.svg', 'android-icon-foreground.png', 1024, FULL],
  ['mark-mono.svg', 'android-icon-monochrome.png', 1024, FULL],
  ['mark.svg', 'splash-icon.png', 1024, FULL],
  ['mark-light.svg', 'splash-icon-light.png', 1024, FULL],
  ['mark-mono.svg', 'notification-icon.png', 96, SAFE], // ic_stat_gp (96 px = 24 dp @ xxxhdpi)
  ['icon.svg', 'favicon.png', 48, FULL],
];
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 1 });
for (const [src, out, px, vb] of targets) {
  const s = files[src].replace('viewBox="0 0 108 108" width="108" height="108"', `viewBox="${vb}" width="${px}" height="${px}"`);
  await page.setViewportSize({ width: px, height: px });
  await page.setContent(`<html><body style="margin:0;background:transparent">${s}</body></html>`);
  await page.locator('svg').screenshot({ path: join(assets, out), omitBackground: true });
  console.log(out, px);
}
await browser.close();
