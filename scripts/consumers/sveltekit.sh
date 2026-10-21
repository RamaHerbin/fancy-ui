#!/usr/bin/env bash
# Build fancy-ui-svelte, pack it, copy the consumer app OUTSIDE the repo tree,
# install the tarball there and run its smoke. Outside the repo, module
# resolution cannot fall back to the monorepo's node_modules.
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
src="$root/examples/consumers/sveltekit"

cd "$root"
pnpm package

scratch="$(mktemp -d)"
trap 'rm -rf "$scratch"' EXIT
pnpm pack --pack-destination "$scratch" >/dev/null

app="$scratch/app"
mkdir -p "$app/.tarball"
tar -C "$src" --exclude=node_modules --exclude=.svelte-kit --exclude=build --exclude=.tarball --exclude=tests -cf - . | tar -C "$app" -xf -
cp "$scratch"/fancy-ui-svelte-*.tgz "$app/.tarball/fancy-ui-svelte.tgz"

# Point the dependency at the tarball (path computed here, relative to the copy).
cd "$app"
node -e '
const fs = require("fs");
const p = JSON.parse(fs.readFileSync("package.json", "utf8"));
p.dependencies["fancy-ui-svelte"] = "file:.tarball/fancy-ui-svelte.tgz";
fs.writeFileSync("package.json", JSON.stringify(p, null, "\t") + "\n");
'

npm install --no-package-lock --no-audit --no-fund
npm run build

cd "$root"
CONSUMER_DIR="$app" pnpm exec playwright test --config examples/consumers/sveltekit/playwright.config.ts
