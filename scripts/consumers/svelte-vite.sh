#!/usr/bin/env bash
# fancy-ui-svelte in a plain Svelte + Vite app (no SvelteKit), installed from
# the packed tarball in a copy outside the repo. See examples/consumers/README.md.
source "$(dirname "${BASH_SOURCE[0]}")/_lib.sh"

consumer_init svelte-vite
consumer_pack fancy-ui-svelte . pnpm package
consumer_copy
consumer_install fancy-ui-svelte

# Built WITH the Cameleon subpath: FancyProvider must keep building outside
# SvelteKit, so a failure here fails the run (the smoke then checks it mounts).
(cd "$APP" && CONSUMER_CAMELEON=1 npm run build)

consumer_smoke
