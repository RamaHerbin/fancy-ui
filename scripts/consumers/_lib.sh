# Shared plumbing for scripts/consumers/<name>.sh. Sourced, never run:
# run-all.mjs skips files whose name starts with "_".
#
# Every consumer follows the same contract:
#   1. build the package and `pnpm pack` it into an empty folder (exactly one
#      tarball, so a stale one can never be picked up);
#   2. copy the app to a `mktemp -d` folder OUTSIDE the repo, so module
#      resolution cannot fall back to the monorepo's node_modules;
#   3. point the app's dependency at the tarball, `npm install`, build;
#   4. run the Playwright smoke with the repo's runner, the config and specs
#      staying in the repo, the server running from the scratch copy on a free
#      port (CONSUMER_APP_DIR, CONSUMER_PORT).
#
# KEEP_CONSUMER=1 keeps the scratch folder for debugging (its path is printed).
# CONSUMER_PACKS_DIR, set by run-all.mjs, lets several consumers of the same
# package share one build + pack per run.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

consumer_die() {
	echo "consumer: $*" >&2
	exit 1
}

# consumer_init <app-name>: sets SRC, WORK, APP and the cleanup trap.
consumer_init() {
	SRC="$ROOT/examples/consumers/$1"
	[ -d "$SRC" ] || consumer_die "no app at $SRC"
	WORK="$(cd "$(mktemp -d "${TMPDIR:-/tmp}/fancy-ui-consumer-$1.XXXXXX")" && pwd -P)"
	case "$WORK/" in
		"$ROOT"/* | "$(cd "$ROOT" && pwd -P)"/*) consumer_die "scratch dir $WORK is inside the repo" ;;
	esac
	APP="$WORK/app"
	if [ "${KEEP_CONSUMER:-}" = "1" ]; then
		echo "consumer: KEEP_CONSUMER=1, scratch kept at $WORK"
	else
		trap 'rm -rf "$WORK"' EXIT
	fi
	echo "consumer: $1 -> $APP"
}

# consumer_pack <package-name> <package-dir relative to ROOT> <build command...>
# Builds and packs the package; sets TARBALL.
consumer_pack() {
	local pkg="$1" dir="$2"
	shift 2
	local cache="${CONSUMER_PACKS_DIR:-}"
	if [ -n "$cache" ] && [ -f "$cache/$pkg.tgz" ]; then
		TARBALL="$WORK/$pkg.tgz"
		cp "$cache/$pkg.tgz" "$TARBALL"
		echo "consumer: reusing $pkg packed earlier in this run"
		return
	fi
	(cd "$ROOT" && "$@")
	local out="$WORK/pack"
	rm -rf "$out"
	mkdir -p "$out"
	(cd "$ROOT/$dir" && pnpm pack --pack-destination "$out" >/dev/null)
	local found=()
	local f
	for f in "$out/$pkg"-*.tgz; do
		[ -e "$f" ] && found+=("$f")
	done
	[ "${#found[@]}" -eq 1 ] || consumer_die "expected one $pkg tarball in $out, found ${#found[@]}"
	TARBALL="$WORK/$pkg.tgz"
	mv "${found[0]}" "$TARBALL"
	rm -rf "$out"
	if [ -n "$cache" ]; then
		cp "$TARBALL" "$cache/$pkg.tgz"
	fi
}

# consumer_copy: copies the app source (no build output, no tests, no runner
# config) into APP.
consumer_copy() {
	mkdir -p "$APP"
	rsync -a \
		--exclude node_modules --exclude package-lock.json --exclude .tarball \
		--exclude dist --exclude build --exclude .svelte-kit --exclude .next \
		--exclude .nuxt --exclude .output --exclude .data \
		--exclude tests --exclude test-results --exclude playwright-report \
		--exclude playwright.config.ts --exclude next-env.d.ts \
		"$SRC/" "$APP/"
}

# consumer_install <package-name>: points the dependency at TARBALL and runs
# npm install in APP, then checks the package really landed in APP.
consumer_install() {
	local pkg="$1"
	(
		cd "$APP"
		node -e '
const fs = require("fs");
const [pkg, tarball] = process.argv.slice(1);
const p = JSON.parse(fs.readFileSync("package.json", "utf8"));
if (!p.dependencies || !(pkg in p.dependencies)) throw new Error(pkg + " is not a dependency of the app");
p.dependencies[pkg] = "file:" + tarball;
fs.writeFileSync("package.json", JSON.stringify(p, null, "\t") + "\n");
' "$pkg" "$TARBALL"
		npm install --no-audit --no-fund
	)
	[ -f "$APP/node_modules/$pkg/package.json" ] || consumer_die "$pkg was not installed into $APP/node_modules"
}

# consumer_free_port: prints a TCP port nothing listens on right now.
consumer_free_port() {
	node -e 'const s = require("net").createServer(); s.listen(0, "127.0.0.1", () => { console.log(s.address().port); s.close(); });'
}

# consumer_smoke [extra env assignments...]: runs the app's Playwright smoke
# against the scratch build.
consumer_smoke() {
	local port
	port="$(consumer_free_port)"
	(cd "$ROOT" && env CONSUMER_APP_DIR="$APP" CONSUMER_PORT="$port" "$@" \
		"$ROOT/node_modules/.bin/playwright" test -c "$SRC/playwright.config.ts")
}
