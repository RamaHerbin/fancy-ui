#!/usr/bin/env node
/**
 * Gate for the shape of the published artifact's component names.
 *
 * Vite's lib mode defaults to `minify: "esbuild"`, which renames every
 * top-level identifier. Under that default this package shipped `AnimatedBeam`
 * as `function ut(...)` and `Breadcrumb` as `forwardRef(function (...))` with
 * no inner name at all — so every consumer's React DevTools tree and every
 * production stack trace read as single-letter noise. `build.minify: false` in
 * `vite.config.ts` is the fix; this script is what stops it regressing, since
 * nothing else in CI reads the built artifact's names and the symptom is
 * invisible from the source tree.
 *
 * It runs after the build (wired into the `build` script) rather than as a
 * vitest suite, because CI runs `test` before `build` — a test importing
 * `dist/` would be asserting on a stale or missing directory.
 */
import { fileURLToPath } from "node:url";

const root = new URL("../", import.meta.url);
const ENTRIES = ["dist/index.js", "dist/cameleon/index.js"];

/**
 * How React itself resolves a component's display name: a plain function's
 * own name, and for a `forwardRef`/`memo` object the wrapper's `displayName`,
 * then the wrapped render function's.
 */
function runtimeName(value) {
	if (typeof value === "function") return value.name;
	if (value && typeof value === "object" && "$$typeof" in value) {
		return value.displayName ?? value.render?.displayName ?? value.render?.name;
	}
	return undefined;
}

/**
 * A minified name is one or two characters (`ut`, `s`, `w`, `N`). Real names
 * are longer, so this separates "the build mangled it" from the benign cases
 * where a runtime name legitimately differs from its export name — a
 * deliberate alias (`FluidCursorAdvanced` is exported from `FluidCursor`) or a
 * context object exported under a `*_CONTEXT_KEY` name.
 */
const MANGLED = /^.{0,2}$/;

/** Named sentinel: a plain function export whose name must survive verbatim. */
const SENTINEL = "Marquee";

let total = 0;
let exact = 0;
const mangled = [];
let sentinelSeen = false;

for (const entry of ENTRIES) {
	const href = new URL(entry, root).href;
	const mod = await import(href);
	for (const [name, value] of Object.entries(mod)) {
		if (!/^[A-Z]/.test(name)) continue;
		const actual = runtimeName(value);
		if (actual === undefined) continue; // not a component-shaped export
		total += 1;
		if (actual === name) exact += 1;
		if (actual === "" || MANGLED.test(actual)) mangled.push(`${name} -> ${actual || "(empty)"}`);
		if (name === SENTINEL) {
			sentinelSeen = true;
			if (actual !== SENTINEL) {
				console.error(`❌ sentinel: ${SENTINEL} ships as "${actual}" — the build is mangling names.`);
				process.exit(1);
			}
		}
	}
}

if (!sentinelSeen) {
	console.error(
		`❌ sentinel export "${SENTINEL}" not found in ${ENTRIES.join(", ")} — ` +
			`rename the sentinel in ${fileURLToPath(import.meta.url)} to an export that exists.`
	);
	process.exit(1);
}

if (mangled.length) {
	console.error(
		`❌ ${mangled.length} of ${total} component exports ship under a minified name.\n` +
			`   Check that \`build.minify\` is still \`false\` in react/vite.config.ts.\n` +
			mangled.map((line) => `   ${line}`).join("\n")
	);
	process.exit(1);
}

console.log(`✅ dist names: ${total} component exports, none minified (${exact} match exactly).`);
