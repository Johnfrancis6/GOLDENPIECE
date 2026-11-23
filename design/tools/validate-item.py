#!/usr/bin/env python3
"""Validation bookkeeping in one command (replaces hand edits of README / tokens / NEXT_SESSION).

Usage:
  python3 design/tools/validate-item.py --id B25 --name "Consent screen" \
      --summary "A, A, A; preview validated 'je valide'" \
      --files design/blocks/b25-consent.md --preview design/previews/b25-consent.png \
      [--bump minor|patch|none] [--date 2026-11-24]

Does, in order:
  1. tokens.json: bumps "version" (minor by default) — only if --bump is not none.
  2. README.md "Validated items" table: adds (or replaces) the row for --id.
  3. design/STATE.md: rewrites the "Last validated" line and appends the item to the log table.
  4. Regenerates tools/kit/tokens.css and design/INDEX.md.
Prints a 3-line summary. Commit and push stay with the caller (one commit per validated item).
"""
import argparse, datetime, json, re, subprocess, pathlib

D = pathlib.Path(__file__).resolve().parent.parent  # design/
ap = argparse.ArgumentParser()
ap.add_argument('--id', required=True); ap.add_argument('--name', required=True)
ap.add_argument('--summary', default=''); ap.add_argument('--files', default='')
ap.add_argument('--preview', default=''); ap.add_argument('--bump', default='minor', choices=['minor', 'patch', 'none'])
ap.add_argument('--date', default=datetime.date.today().isoformat())
a = ap.parse_args()

# 1. tokens version
tok_path = D / 'tokens.json'
raw = tok_path.read_text()
ver = json.loads(raw)['version']
if a.bump != 'none':
    M, m, p = map(int, ver.split('.'))
    new = f'{M}.{m + 1}.0' if a.bump == 'minor' else f'{M}.{m}.{p + 1}'
    raw = re.sub(r'"version":\s*"' + re.escape(ver) + '"', f'"version": "{new}"', raw, count=1)
    tok_path.write_text(raw); ver = new

# 2. README row
rel = lambda f: str(pathlib.Path(f).resolve().relative_to(D)) if f else ''
links = [f'[{pathlib.Path(f).name}]({rel(f)})' for f in a.files.split(',') if f]
if a.preview: links.append(f'[preview]({rel(a.preview)})')
label = f'**{a.id} {a.name}**' + (f' ({a.summary})' if a.summary else '')
row = f'| {label} | {" · ".join(links)} | {a.date} |'
readme = (D / 'README.md').read_text().split('\n')
start = next(i for i, l in enumerate(readme) if l.startswith('| Item | File | Validated |'))
end = start + 2
while end < len(readme) and readme[end].startswith('|'): end += 1
existing = [i for i in range(start + 2, end) if re.match(r'\|\s*\**' + re.escape(a.id) + r'[\s*]', readme[i])]
if existing: readme[existing[0]] = row
else: readme.insert(end, row)
(D / 'README.md').write_text('\n'.join(readme))

# 3. STATE.md (short, machine-kept; replaces the narrative header of HANDOFF)
st = D / 'STATE.md'
if not st.exists():
    st.write_text('# Design state (kept by tools/validate-item.py)\n\nLast validated: —\n\n| Date | Item | Summary | Tokens |\n|---|---|---|---|\n')
s = st.read_text()
s = re.sub(r'Last validated: .*', f'Last validated: {a.id} {a.name} ({a.date}), tokens v{ver}', s, count=1)
s = s.rstrip('\n') + f'\n| {a.date} | {a.id} {a.name} | {a.summary} | v{ver} |\n'
st.write_text(s)

# 4. derived files
subprocess.run(['node', str(D / 'tools' / 'make-kit-css.js')], check=True, capture_output=True)
subprocess.run(['python3', str(D / 'tools' / 'make-index.py')], check=True, capture_output=True)
print(f'validated {a.id} {a.name}: README row {"replaced" if existing else "added"}, tokens v{ver}, STATE.md + INDEX.md + kit/tokens.css updated')
print('next: git add -A design && git commit -m "<item> validated" && git push')
