/**
 * Guarantees that `dist/styles.css` exists after a build.
 *
 * `package.json` promises the `./styles.css` subpath, the README tells
 * consumers to `@import "fancy-ui-vue/styles.css"`, and the example app does
 * exactly that. Vite only emits that file when some module in the graph
 * actually contributes CSS — which, for this package, means the first SFC
 * carrying a `<style>` block. Until that component lands (and, in principle,
 * for any build where every component happens to be class-only), the promise
 * in the exports map points at a file that was never written: `publint`
 * fails, `npm pack` ships a dangling subpath, and a consumer following the
 * README gets a module-not-found from their bundler.
 *
 * So: if the build produced no stylesheet, write an empty one. An empty
 * stylesheet is the honest artefact — the package genuinely has no CSS to
 * hand over — and it keeps every declared entry point resolvable from the
 * very first publish.
 *
 * ORDERING — this runs LAST in the build chain, after `smoke-dist.mjs`, and
 * that is load-bearing. `smoke-dist.mjs` fails the build when server-rendered
 * markup carries `data-v-` attributes but no `dist/styles.css` was emitted:
 * the signature of scoped styles silently ceasing to aggregate. If this
 * script ran first it would plant the file and make that check permanently
 * inert. Running last, it only ever fills a gap that the real gates have
 * already declared harmless.
 *
 * Vite empties `dist/` on every build, so the placeholder cannot survive into
 * a later build as a stale file: each build re-decides whether it is needed.
 */

import { existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const pkgDir = fileURLToPath(new URL("..", import.meta.url));
const stylesheet = join(pkgDir, "dist/styles.css");

if (existsSync(stylesheet)) {
	console.log("✅ dist/styles.css: emitted by the build.");
	process.exit(0);
}

writeFileSync(
	stylesheet,
	"/* fancy-ui-vue — no component in this build contributed CSS.\n" +
		"   This file exists so the `fancy-ui-vue/styles.css` entry point stays\n" +
		"   resolvable; it is replaced by the real bundle as soon as a component\n" +
		"   ships a style block. */\n",
	"utf8"
);

console.log("✅ dist/styles.css: no component contributed CSS — wrote an empty stylesheet so the declared entry point resolves.");
