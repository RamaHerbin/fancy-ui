#!/usr/bin/env bash
# fancy-ui-react in a Next.js App Router app (server render + hydration),
# installed from the packed tarball in a copy outside the repo. See
# examples/consumers/README.md.
source "$(dirname "${BASH_SOURCE[0]}")/_lib.sh"

consumer_init next
consumer_pack fancy-ui-react react pnpm --filter fancy-ui-react run build
consumer_copy
consumer_install fancy-ui-react
(cd "$APP" && npm run build)
consumer_smoke
