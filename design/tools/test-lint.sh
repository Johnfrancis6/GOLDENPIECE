#!/usr/bin/env bash
# Regression test: the Home v2 preview before commit 8afcf9f had its C17 ring squeezed 56 -> 41 px by flex shrink.
cd "$(dirname "$0")/../.." || exit 1
out=$(node design/tools/lint-preview.js design/tools/fixtures/home-ring-clipped.html --max 2)
echo "$out" | grep -q "squeezed by flex shrink: 41×56 instead of 56×56" && echo "PASS ring clipping caught" || { echo "FAIL"; echo "$out"; exit 1; }
out=$(node design/tools/lint-preview.js design/previews/s2-home-v2.html --max 2)
echo "$out" | grep -q "errors: 0" && echo "PASS fixed Home v2 is clean" || { echo "FAIL"; echo "$out"; exit 1; }
