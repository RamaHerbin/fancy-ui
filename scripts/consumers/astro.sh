#!/usr/bin/env bash
# fancy-ui-svelte in an Astro app (@astrojs/svelte islands), installed from the
# packed tarball in a copy outside the repo. Built with `astro build` and
# served by `astro preview`. See examples/consumers/README.md.
source "$(dirname "${BASH_SOURCE[0]}")/_lib.sh"

# Astro refuses to start below its own engines floor (it checks at launch), so
# an older Node is reported as a skip, not a failure. Exit 77 is how run-all.mjs
# tells a skip from a pass.
ASTRO_NODE_FLOOR="22.23.4"
if ! node -e '
const want = process.argv[1].split(".").map(Number);
const have = process.versions.node.split(".").map(Number);
for (let i = 0; i < 3; i++) { if (have[i] !== want[i]) process.exit(have[i] > want[i] ? 0 : 1); }
' "$ASTRO_NODE_FLOOR"; then
	echo "consumer: astro skipped: Astro 7 needs Node >= $ASTRO_NODE_FLOOR, this is $(node -v)"
	exit 77
fi

consumer_init astro
consumer_pack fancy-ui-svelte . pnpm package
consumer_copy
consumer_install fancy-ui-svelte

(cd "$APP" && npm run build)

consumer_smoke
