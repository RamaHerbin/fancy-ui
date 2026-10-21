#!/usr/bin/env bash
# Builds fancy-ui-vue, packs it, installs the tarball into an outsider Nuxt app
# (npm, outside the pnpm workspace), builds it and runs the Playwright smoke.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
APP="$ROOT/examples/consumers/nuxt"
SCRATCH="${CONSUMER_SCRATCH:-$(mktemp -d "${TMPDIR:-/tmp}/fancy-ui-consumer-XXXXXX")}"

cp "$APP/package.json" "$SCRATCH/package.json.orig"
trap 'cp "$SCRATCH/package.json.orig" "$APP/package.json"' EXIT

cd "$ROOT"
pnpm --filter fancy-ui-vue run build
(cd vue && pnpm pack --pack-destination "$SCRATCH")
TARBALL="$(ls "$SCRATCH"/fancy-ui-vue-*.tgz | head -1)"
echo "tarball: $TARBALL"

cd "$APP"
rm -rf node_modules package-lock.json .nuxt .output
npm pkg set "dependencies.fancy-ui-vue=file:$TARBALL"
npm install --no-audit --no-fund
npm run build
cd "$ROOT"
pnpm exec playwright test -c "$APP/playwright.config.ts"
