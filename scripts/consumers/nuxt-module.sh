#!/usr/bin/env bash
# fancy-ui-nuxt (the module) with fancy-ui-vue in a Nuxt app (server render +
# hydration), both installed from their packed tarballs in a copy outside the
# repo, then type-checked, built and smoke-tested. See
# examples/consumers/README.md.
source "$(dirname "${BASH_SOURCE[0]}")/_lib.sh"

consumer_init nuxt-module
consumer_pack fancy-ui-vue vue pnpm --filter fancy-ui-vue run build
VUE_TARBALL="$TARBALL"
consumer_pack fancy-ui-nuxt nuxt pnpm --filter fancy-ui-nuxt run build
NUXT_TARBALL="$TARBALL"
consumer_copy

# Both dependencies point at their tarballs, then one npm install, so npm
# resolves the module's peer dependency on fancy-ui-vue against the packed copy.
(
	cd "$APP"
	node -e '
const fs = require("fs");
const p = JSON.parse(fs.readFileSync("package.json", "utf8"));
const args = process.argv.slice(1);
for (let i = 0; i < args.length; i += 2) {
	const [pkg, tarball] = [args[i], args[i + 1]];
	if (!p.dependencies || !(pkg in p.dependencies)) throw new Error(pkg + " is not a dependency of the app");
	p.dependencies[pkg] = "file:" + tarball;
}
fs.writeFileSync("package.json", JSON.stringify(p, null, "\t") + "\n");
' fancy-ui-vue "$VUE_TARBALL" fancy-ui-nuxt "$NUXT_TARBALL"
	npm install --no-audit --no-fund
)
for pkg in fancy-ui-vue fancy-ui-nuxt; do
	[ -f "$APP/node_modules/$pkg/package.json" ] || consumer_die "$pkg was not installed into $APP/node_modules"
done
# The workspace devDependency on fancy-ui-vue must have been rewritten by pnpm
# pack: a `workspace:` range left in the published manifest breaks npm.
if grep -q '"workspace:' "$APP/node_modules/fancy-ui-nuxt/package.json"; then
	consumer_die "fancy-ui-nuxt's packed package.json still carries a workspace: range"
fi

(cd "$APP" && npm run typecheck)
(cd "$APP" && npm run build)
consumer_smoke
