#!/usr/bin/env bash
# fancy-ui-svelte in a plain Svelte + Vite app (no SvelteKit), installed from
# the packed tarball in a copy outside the repo. See examples/consumers/README.md.
source "$(dirname "${BASH_SOURCE[0]}")/_lib.sh"

consumer_init svelte-vite
consumer_pack fancy-ui-svelte . pnpm package
consumer_copy
consumer_install fancy-ui-svelte

# First try the build WITH the Cameleon subpath. While FancyProvider imports
# `$app/environment` this fails outside SvelteKit: assert that it fails for
# exactly that reason, then build the rest of the page without it. The smoke
# marks the Cameleon test fixme unless this build succeeded.
log="$WORK/cameleon-build.log"
if (cd "$APP" && CONSUMER_CAMELEON=1 npm run build) >"$log" 2>&1; then
	cat "$log"
	cameleon=ok
else
	cat "$log"
	grep -q '\$app/environment' "$log" ||
		consumer_die "the Cameleon build failed for a reason other than the known \$app/environment import (log above)"
	echo "consumer: Cameleon build fails outside SvelteKit (\$app/environment), as expected until fix/cameleon-without-sveltekit lands"
	cameleon=needs-sveltekit
	(cd "$APP" && npm run build)
fi

consumer_smoke CONSUMER_CAMELEON_BUILD="$cameleon"
