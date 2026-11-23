#!/usr/bin/env node
// Prints an inline Lucide SVG for a preview, with the F4 stroke rule (2 dp at 24, 1.75 dp at 20/16/14).
// Usage: node design/tools/icon.js <name> [size=24]   e.g.  node design/tools/icon.js receipt-text 20
// The package is fetched once with `npm pack lucide-static@<version from tokens>` into ~/.cache/gp-lucide.
// Check design/RULES.md "Icons" before choosing a glyph (e.g. receipt shows a "$": use receipt-text).
const fs = require('fs'), path = require('path'), os = require('os'), {execSync} = require('child_process');
const [name, sizeArg] = process.argv.slice(2);
if (!name) { console.error('usage: icon.js <lucide-name> [size]'); process.exit(2); }
const size = +(sizeArg || 24);
const tokens = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', 'tokens.json'), 'utf8'));
const ver = tokens.icon.setVersion || '1.77.0';
const dir = path.join(os.homedir(), '.cache', 'gp-lucide', ver);
if (!fs.existsSync(path.join(dir, 'package'))) {
  fs.mkdirSync(dir, {recursive: true});
  execSync(`npm pack lucide-static@${ver} --silent`, {cwd: dir, stdio: ['ignore', 'pipe', 'inherit']});
  execSync(`tar xzf lucide-static-${ver}.tgz`, {cwd: dir});
}
const f = path.join(dir, 'package', 'icons', name + '.svg');
if (!fs.existsSync(f)) { console.error(`no Lucide icon "${name}" in v${ver}`); process.exit(1); }
const stroke = size >= 24 ? 2 : 1.75;
const sw = (stroke * 24 / size).toFixed(3); // keep the absolute stroke constant when the 24-unit viewBox is scaled
let svg = fs.readFileSync(f, 'utf8').replace(/<!--[\s\S]*?-->/g, '').replace(/\s+/g, ' ').trim();
svg = svg.replace(/<svg[^>]*>/, `<svg class="ic" xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">`);
process.stdout.write(svg + '\n');
