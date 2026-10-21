#!/usr/bin/env bash
# Builds fancy-ui-react, packs it, installs the tarball into the outsider
# consumer at examples/consumers/react-vite (outside the pnpm workspace), then
# builds the app and runs its Playwright smoke. Idempotent: CI can rerun it.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SCRATCH="$ROOT/.consumers"
APP="$ROOT/examples/consumers/react-vite"

mkdir -p "$SCRATCH"
rm -f "$SCRATCH"/fancy-ui-react*.tgz

pnpm --dir "$ROOT" --filter fancy-ui-react run build
(cd "$ROOT/react" && pnpm pack --pack-destination "$SCRATCH")
mv "$SCRATCH"/fancy-ui-react-*.tgz "$SCRATCH/fancy-ui-react.tgz"

cd "$APP"
# Rewrite the file: dependency from the computed path so it never goes stale.
node -e '
const fs = require("fs"), path = require("path");
const p = JSON.parse(fs.readFileSync("package.json", "utf8"));
p.dependencies["fancy-ui-react"] = "file:" + path.relative(process.cwd(), process.argv[1]);
fs.writeFileSync("package.json", JSON.stringify(p, null, "\t") + "\n");
' "$SCRATCH/fancy-ui-react.tgz"

rm -rf node_modules package-lock.json dist
npm install --no-audit --no-fund
npm run build
# The repo's installed Playwright; the config and tests live in the consumer.
"$ROOT/node_modules/.bin/playwright" test --config "$APP/playwright.config.ts"
