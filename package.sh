#!/bin/sh
# Builds the .zip for Chrome Web Store / Edge Add-ons submission.
# Only ships runtime files — manifest.json must sit at the zip root.
set -e

cd "$(dirname "$0")"

VERSION=$(sed -n 's/.*"version": *"\([^"]*\)".*/\1/p' manifest.json)
OUT="linkedin-focus-${VERSION}.zip"

rm -f "$OUT"
zip -r "$OUT" manifest.json content.js style.css icons -x '*.DS_Store'

echo "Built $OUT"
