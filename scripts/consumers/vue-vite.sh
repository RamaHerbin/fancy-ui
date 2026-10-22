#!/usr/bin/env bash
# fancy-ui-vue in a plain Vue + Vite app, installed from the packed tarball in
# a copy outside the repo. See examples/consumers/README.md.
source "$(dirname "${BASH_SOURCE[0]}")/_lib.sh"

consumer_init vue-vite
consumer_pack fancy-ui-vue vue pnpm --filter fancy-ui-vue run build
consumer_copy
consumer_install fancy-ui-vue
(cd "$APP" && npm run build)
consumer_smoke

# The docs snippets, type-checked and mounted against the same tarball.
node "$ROOT/scripts/consumers/docs-examples-vue.mjs" --tarball "$TARBALL"
