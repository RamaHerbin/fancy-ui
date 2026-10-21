#!/usr/bin/env bash
# fancy-ui-react in a React + Vite app (strict tsc, skipLibCheck off),
# installed from the packed tarball in a copy outside the repo. See
# examples/consumers/README.md.
source "$(dirname "${BASH_SOURCE[0]}")/_lib.sh"

consumer_init react-vite
consumer_pack fancy-ui-react react pnpm --filter fancy-ui-react run build
consumer_copy
consumer_install fancy-ui-react
(cd "$APP" && npm run build)
consumer_smoke
