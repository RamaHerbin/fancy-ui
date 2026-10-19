/**
 * The React package sources the registry is built from, as raw text.
 *
 * Read through `?raw` globs and never executed: the docs build must not pull
 * React in (same rule as the barrels in `../barrels.ts`). The generator in
 * `./build.ts` is pure; this module is the only place that knows where the
 * files live and how Vite exposes them.
 */

import { registry } from "$lib/fancy-ui/registry.js";
import { SITE_URL } from "$lib/site.js";
import { buildRegistry } from "./build.js";
import type { BuildOutput } from "./build.js";
import { serverModulesFrom } from "./graph.js";

const PREFIX = "/react/src/";

// Test files never ship, so they stay out of the server bundle too (they are
// most of its bytes). A kept file that imports one still fails the build: the
// import has nothing to resolve to.
const raw = import.meta.glob(
	["/react/src/{components,internals,sound}/**/*.{ts,tsx,css}", "!**/*.test.{ts,tsx}"],
	{ query: "?raw", import: "default", eager: true }
) as Record<string, string>;

const utils = import.meta.glob("/react/src/utils.ts", {
	query: "?raw",
	import: "default",
	eager: true,
}) as Record<string, string>;

/**
 * The client-boundary module the React build uses, as text. Importing it as
 * code would drag an untyped `.mjs` into the type check, so its
 * `SERVER_MODULES` keys are read out of the source instead.
 */
const boundary = import.meta.glob("/react/scripts/client-boundary.mjs", {
	query: "?raw",
	import: "default",
	eager: true,
}) as Record<string, string>;

/** Keys of `SERVER_MODULES` (".js" paths relative to `react/src`). */
export function serverModules(): Set<string> {
	return serverModulesFrom(Object.values(boundary)[0] ?? "");
}

/** Every candidate source file, keyed by its path relative to `react/src`. */
export function reactSources(): Record<string, string> {
	const out: Record<string, string> = {};
	for (const [key, src] of Object.entries({ ...raw, ...utils })) {
		if (!key.startsWith(PREFIX)) throw new Error(`Unexpected source path: ${key}`);
		out[key.slice(PREFIX.length)] = src;
	}
	return out;
}

let memo: BuildOutput | undefined;

/** The whole registry (index + items), built once per process. */
export function registryOutput(): BuildOutput {
	if (memo) return memo;
	const meta: Record<string, { name: string; description: string; category: string }> = {};
	for (const [slug, entry] of Object.entries(registry)) {
		meta[slug] = { name: entry.name, description: entry.description, category: entry.category };
	}
	memo = buildRegistry({
		files: reactSources(),
		meta,
		siteUrl: SITE_URL,
		serverModules: serverModules(),
		// Decided by the CLI acceptance run (2026-10-19): Next 16 resolves neither
		// "./X.js" → X.tsx under Turbopack nor under webpack; Vite and tsc do.
		// Extensionless relative specifiers work everywhere.
		stripJsExtension: true,
	});
	return memo;
}
