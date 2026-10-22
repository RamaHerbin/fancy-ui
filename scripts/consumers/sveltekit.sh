#!/usr/bin/env bash
# fancy-ui-svelte in a SvelteKit app, installed from the packed tarball in a
# copy outside the repo. See examples/consumers/README.md.
source "$(dirname "${BASH_SOURCE[0]}")/_lib.sh"

consumer_init sveltekit
consumer_pack fancy-ui-svelte . pnpm package
consumer_copy
consumer_install fancy-ui-svelte
# Strict svelte-check: the copied types snippet must resolve and type-check
# against the packed package (the bundler alone would drop a type import).
(cd "$APP" && npm run check)
(cd "$APP" && npm run build)
consumer_smoke
