#!/usr/bin/env bash
# Builds fancy-ui-react, packs it, installs the tarball into examples/consumers/next
# the way an outsider would (no workspace, no alias), builds the app and runs the smoke.
# Usage: scripts/consumers/next.sh [--skip-build]   (--skip-build reuses react/dist)
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
APP="$ROOT/examples/consumers/next"
TARBALL_DIR="$APP/.tarball"
TARBALL="$TARBALL_DIR/fancy-ui-react.tgz"

if [ "${1:-}" != "--skip-build" ]; then
	(cd "$ROOT" && pnpm --filter fancy-ui-react run build)
fi

SCRATCH="$(mktemp -d)"
trap 'rm -rf "$SCRATCH"' EXIT
(cd "$ROOT/react" && pnpm pack --pack-destination "$SCRATCH" >/dev/null)
mkdir -p "$TARBALL_DIR"
cp "$SCRATCH"/fancy-ui-react-*.tgz "$TARBALL"

# Point the dependency at the tarball (idempotent; keeps the committed value stable).
node -e '
const fs = require("fs");
const file = process.argv[1];
const pkg = JSON.parse(fs.readFileSync(file, "utf8"));
pkg.dependencies["fancy-ui-react"] = "file:./.tarball/fancy-ui-react.tgz";
fs.writeFileSync(file, JSON.stringify(pkg, null, "\t") + "\n");
' "$APP/package.json"

cd "$APP"
rm -rf node_modules .next package-lock.json
npm install --no-audit --no-fund --no-package-lock
npx next build

cd "$ROOT"
pnpm exec playwright test -c "$APP/playwright.config.ts"
