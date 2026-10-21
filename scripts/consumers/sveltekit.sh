#!/usr/bin/env bash
# Build fancy-ui-svelte, pack it, install the tarball into an outsider app
# (examples/consumers/sveltekit, not a workspace member) and run its smoke.
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
app="$root/examples/consumers/sveltekit"

cd "$root"
pnpm package

rm -rf "$app/.tarball" && mkdir -p "$app/.tarball"
scratch="$(mktemp -d)"
trap 'rm -rf "$scratch"' EXIT
pnpm pack --pack-destination "$scratch" >/dev/null
cp "$scratch"/fancy-ui-svelte-*.tgz "$app/.tarball/fancy-ui-svelte.tgz"

# Point the dependency at the tarball (path computed here, relative to the app).
cd "$app"
node -e '
const fs = require("fs");
const p = JSON.parse(fs.readFileSync("package.json", "utf8"));
p.dependencies["fancy-ui-svelte"] = "file:.tarball/fancy-ui-svelte.tgz";
fs.writeFileSync("package.json", JSON.stringify(p, null, "\t") + "\n");
'

rm -rf node_modules .svelte-kit build
npm install --no-package-lock --no-audit --no-fund
npm run build

cd "$root"
pnpm exec playwright test --config examples/consumers/sveltekit/playwright.config.ts
