#!/usr/bin/env bash
# The Svelte CLI add-on (sv-addon/, published as fancy-ui-sv) applied by the real `sv`
# CLI to apps it has just created, outside the repo. See examples/consumers/README.md.
#
# Unlike the other consumers there is no app to copy: each app is made by `sv create`
# and set up only by `sv add file:<add-on>`. Two SvelteKit apps:
#   notw  no Tailwind: the add-on pulls in the official tailwindcss add-on first;
#   tw    Tailwind and prettier from `sv create`, the stylesheet rewritten by hand (double
#         quotes, a comment, a dark variant); `sv add` installs and formats.
# For each: the add-on runs, the result is committed, the add-on runs again and the
# tree must stay clean (idempotency), then fancy-ui-svelte is switched to the packed
# tarball, installed, type-checked, built and the demo route smoke-tested.
source "$(dirname "${BASH_SOURCE[0]}")/_lib.sh"

# Same sv as the add-on is developed and tested against.
SV_VERSION="$(node -p "require('$ROOT/sv-addon/package.json').devDependencies.sv")"

consumer_init sv-addon
consumer_pack fancy-ui-svelte . pnpm package

# Build and pack the add-on, then unpack it: `sv add file:` takes a folder, not a tarball.
# sv links a file: add-on into its OWN node_modules and the add-on imports `sv`, so the
# folder sits next to a private sv install (never the repo's: sv would write into the
# pnpm store), and `sv` resolves from the folder's real path.
CLI="$WORK/cli"
mkdir -p "$CLI/addon" "$WORK/addon-pack"
# On a release bump the root version is not on the registry yet, and the tw app installs
# what the add-on declares before switching to the tarball: build against the latest
# published version then.
ROOT_VERSION="$(node -p "require('$ROOT/package.json').version")"
if ! npm view "fancy-ui-svelte@$ROOT_VERSION" version 2>/dev/null | grep -q .; then
	export FANCY_UI_SV_VERSION="$(npm view fancy-ui-svelte version)"
	echo "consumer: fancy-ui-svelte@$ROOT_VERSION is not published, the add-on declares ^$FANCY_UI_SV_VERSION"
fi
(cd "$ROOT" && pnpm --filter fancy-ui-sv run build)
(cd "$ROOT/sv-addon" && pnpm pack --pack-destination "$WORK/addon-pack" >/dev/null)
ADDON_TGZ=("$WORK/addon-pack"/fancy-ui-sv-*.tgz)
[ "${#ADDON_TGZ[@]}" -eq 1 ] && [ -f "${ADDON_TGZ[0]}" ] || consumer_die "expected one fancy-ui-sv tarball"
tar xzf "${ADDON_TGZ[0]}" -C "$CLI/addon" --strip-components 1
echo '{ "private": true }' >"$CLI/package.json"
(cd "$CLI" && npm install --no-audit --no-fund "sv@$SV_VERSION")
SV="$CLI/node_modules/.bin/sv"
ADDON="file:$CLI/addon"

# Non-interactive everywhere: stdin closed, every option given, no git/download prompt.
# Always with an explicit --cwd inside the scratch folder: sv defaults to the current
# directory, which is the repo when run from `pnpm consumers`.
sv_add() {
	case "$APP/" in
		"$WORK"/*) ;;
		*) consumer_die "refusing to run sv add outside the scratch folder ($APP)" ;;
	esac
	"$SV" add "$@" --cwd "$APP" --no-git-check --no-download-check "${SV_INSTALL[@]}" </dev/null
}
SV_INSTALL=(--no-install)

commit_all() {
	git -C "$APP" add -A
	git -C "$APP" -c user.name=consumer -c user.email=consumer@example.invalid commit -qm "$1"
}

# tree_hash: one hash over every tracked and untracked file (content + path).
tree_hash() {
	(cd "$APP" && git ls-files -co --exclude-standard -z | xargs -0 shasum -a 256 | shasum -a 256)
}

run_app() {
	local name="$1"
	shift
	APP="$WORK/$name"
	echo "consumer: sv-addon/$name -> $APP"
	(cd "$WORK" && "$SV" create "$name" --template minimal --types ts --no-install "$@" </dev/null)
	git -C "$APP" init -q
}

check_app() {
	local before after
	commit_all "sv add"
	before="$(tree_hash)"

	# Idempotency: the same command again changes nothing (sv's own formatting included).
	sv_add "$ADDON=demo:yes"
	if [ -n "$(git -C "$APP" status --porcelain)" ]; then
		git -C "$APP" status --porcelain
		git -C "$APP" --no-pager diff
		consumer_die "second sv add changed the project"
	fi
	after="$(tree_hash)"
	[ "$before" = "$after" ] || consumer_die "second sv add changed file contents"
	echo "consumer: second sv add left the tree identical"

	# What the add-on wrote: the dependency and exactly one fancy-ui import.
	node -e '
const p = require(process.argv[1] + "/package.json");
if (!/^\^\d/.test(p.dependencies?.["fancy-ui-svelte"] ?? "")) throw new Error("fancy-ui-svelte not declared: " + JSON.stringify(p.dependencies));
' "$APP"
	local imports
	imports="$(grep -c "fancy-ui-svelte/tailwind.css" "$APP/src/routes/layout.css")"
	[ "$imports" = "1" ] || consumer_die "expected one fancy-ui import in layout.css, found $imports"

	# Then the local package instead of the registry range the add-on declared.
	consumer_install fancy-ui-svelte
	(cd "$APP" && npm run check)
	(cd "$APP" && npm run build)
	consumer_smoke
}

# notw: no Tailwind. The tailwindcss add-on is required by fancy-ui (setup dependsOn) and
# sv adds it on its own; its option is passed only so that no prompt opens.
run_app notw --no-add-ons
commit_all "sv create"
sv_add "$ADDON=demo:yes" tailwindcss="plugins:none"
grep -q "@import 'tailwindcss';" "$APP/src/routes/layout.css" || consumer_die "tailwindcss add-on did not run"
check_app

# tw: Tailwind and prettier already there, stylesheet edited by hand. The first `sv add`
# installs with npm, as a user's would: sv then formats what the add-on wrote with the
# project's prettier (and its Tailwind plugin, which resolves the new CSS import from
# node_modules, so it needs the install), and the second run proves that pass is a no-op.
run_app tw --add prettier tailwindcss="plugins:none"
cat >"$APP/src/routes/layout.css" <<'CSS'
/* Project styles */
@import "tailwindcss";

@custom-variant dark (&:where(.dark, .dark *));
CSS
commit_all "sv create"
SV_INSTALL=(--install npm)
sv_add "$ADDON=demo:yes" | tee "$WORK/tw-add.log"
SV_INSTALL=(--no-install)
grep -q "\[error\]" "$WORK/tw-add.log" && consumer_die "tw: the formatting pass reported errors"
grep -q "Successfully formatted files" "$WORK/tw-add.log" || consumer_die "tw: sv did not run its formatter"
expected="$(printf '%s\n' '/* Project styles */' '@import "tailwindcss";' '@import "fancy-ui-svelte/tailwind.css";' '' '@custom-variant dark (&:where(.dark, .dark *));')"
# Compared with quotes normalised: the project's prettier (singleQuote) reformats it.
[ "$(tr "'" '"' <"$APP/src/routes/layout.css")" = "$expected" ] || {
	cat "$APP/src/routes/layout.css"
	consumer_die "tw: layout.css is not the hand-written file plus one line"
}
check_app
