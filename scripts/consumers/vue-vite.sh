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

# Install, build and test in a scratch copy OUTSIDE the repo: inside it, a
# dependency missing from the app's own node_modules would silently resolve
# from <repo>/node_modules and the tarball's dependency manifest would go
# untested. Pass CONSUMER_KEEP=1 to keep the scratch dir for debugging.
WORK="$(mktemp -d "${TMPDIR:-/tmp}/consumer-vue-vite.XXXXXX")"
[ -n "${CONSUMER_KEEP:-}" ] || trap 'rm -rf "$WORK"' EXIT
rsync -a --exclude node_modules --exclude dist --exclude .tarball --exclude package-lock.json "$APP/" "$WORK/"
cp "$TARBALL_DIR/fancy-ui-vue.tgz" "$WORK/fancy-ui-vue.tgz"

cd "$WORK"
# Point the dependency at the tarball (absolute path computed here so CI regenerates it).
node -e '
const fs = require("fs");
const p = JSON.parse(fs.readFileSync("package.json", "utf8"));
p.dependencies["fancy-ui-vue"] = "file:" + process.argv[1];
fs.writeFileSync("package.json", JSON.stringify(p, null, "\t") + "\n");
' "$WORK/fancy-ui-vue.tgz"

npm install --no-audit --no-fund
npm run build

# Runner, config and spec stay in the repo (they need @playwright/test); the
# preview server runs from the scratch app via CONSUMER_APP_DIR.
CONSUMER_APP_DIR="$WORK" "$ROOT/node_modules/.bin/playwright" test -c "$APP/playwright.config.ts"
