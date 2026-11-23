#!/usr/bin/env bash
# PostToolUse hook (Write|Edit): runs the design lint on any preview HTML just written.
# Errors are sent back to Claude (exit 2 + stderr) so they get fixed before Franco sees the preview.
input=$(cat)
file=$(printf '%s' "$input" | python3 -c 'import json,sys; d=json.load(sys.stdin); print((d.get("tool_input") or {}).get("file_path",""))' 2>/dev/null)
case "$file" in
  */design/previews/*.html) ;;
  *) exit 0 ;;
esac
root=$(cd "$(dirname "$0")/../.." && pwd)
out=$(cd "$root" && node design/tools/lint-preview.js "$file" --max 6 2>&1)
status=$?
if [ $status -eq 1 ]; then
  printf 'design-auto-review (hook) found errors in %s — fix them before showing the preview:\n%s\n' "$file" "$out" >&2
  exit 2
fi
exit 0
