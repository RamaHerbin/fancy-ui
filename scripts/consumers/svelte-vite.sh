#!/usr/bin/env bash
# fancy-ui-svelte in a plain Svelte + Vite app (no SvelteKit), installed from
# the packed tarball in a copy outside the repo. See examples/consumers/README.md.
source "$(dirname "${BASH_SOURCE[0]}")/_lib.sh"

consumer_init svelte-vite
consumer_pack fancy-ui-svelte . pnpm package
consumer_copy
consumer_install fancy-ui-svelte

# The app mounts the Cameleon subpath too: a build failure here is a defect.
(cd "$APP" && npm run build)

consumer_smoke
