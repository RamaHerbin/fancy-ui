#!/usr/bin/env bash
# Builds fancy-ui-vue, packs it, installs the tarball into
# examples/consumers/vue-vite like an outsider (npm, outside the workspace),
# builds the app and runs its Playwright smoke. Run from anywhere.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
APP="$ROOT/examples/consumers/vue-vite"
TARBALL_DIR="$APP/.tarball"

pnpm --dir "$ROOT" --filter fancy-ui-vue run build

rm -rf "$TARBALL_DIR"
mkdir -p "$TARBALL_DIR"
(cd "$ROOT/vue" && pnpm pack --pack-destination "$TARBALL_DIR")
PACKED="$(ls "$TARBALL_DIR"/fancy-ui-vue-*.tgz)"
mv "$PACKED" "$TARBALL_DIR/fancy-ui-vue.tgz"

cd "$APP"
# Point the dependency at the tarball (path computed here so CI regenerates it).
node -e '
const fs = require("fs");
const path = require("path");
const p = JSON.parse(fs.readFileSync("package.json", "utf8"));
p.dependencies["fancy-ui-vue"] = "file:" + path.relative(process.cwd(), process.argv[1]);
fs.writeFileSync("package.json", JSON.stringify(p, null, "\t") + "\n");
' "$TARBALL_DIR/fancy-ui-vue.tgz"

# Fresh install every run: npm would otherwise keep a stale copy of the tarball.
rm -rf node_modules package-lock.json
npm install --no-audit --no-fund
npm run build

# Runner from the repo root; the app itself has no test dependency.
"$ROOT/node_modules/.bin/playwright" test -c playwright.config.ts
