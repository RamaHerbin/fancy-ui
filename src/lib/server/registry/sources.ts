/**
 * The package sources the registries are built from, as raw text: the React
 * package (`/r/*.json`), the Svelte one (`/r/svelte/*.json`) and the Vue one
 * (`/r/vue/*.json`).
 *
 * Read through `?raw` globs and never executed: the docs build must not pull
 * React in (same rule as the barrels in `../barrels.ts`), and the Svelte and
 * Vue sources ship as text, not as compiled components. The generator in
 * `./build.ts` is pure; this module is the only place that knows where the
 * files live and how Vite exposes them.
 */

import { registry } from "$lib/fancy-ui/registry.js";
import { SITE_URL } from "$lib/site.js";
import { buildRegistry } from "./build.js";
import type { BuildOutput } from "./build.js";
import type { Provenance } from "./types.js";
import { serverModulesFrom } from "./graph.js";
import { reactStack } from "./stacks/react.js";
import { svelteStack } from "./stacks/svelte.js";
import { vueStack } from "./stacks/vue.js";

import reactPackage from "../../../../react/package.json";
import rootPackage from "../../../../package.json";
import vuePackage from "../../../../vue/package.json";

interface PackageJson {
	name: string;
	version: string;
	license: string;
	dependencies?: Record<string, string>;
	devDependencies?: Record<string, string>;
}

/**
 * The ranges a package is built against, runtime and dev together. Written
 * into every item's dependency list so the consumer's CLI installs what the
 * sources were written for: an unpinned install takes the latest major, whose
 * API may differ.
 */
function versionsOf(pkg: PackageJson): Record<string, string> {
	return { ...pkg.devDependencies, ...pkg.dependencies };
}

/**
 * Licence and provenance for every item of a package's registry: the copy
 * says which package and version it was cut from, under which licence.
 */
function provenanceOf(pkg: PackageJson): Provenance {
	return {
		author: `fancy-ui <${SITE_URL}>`,
		license: pkg.license,
		package: pkg.name,
		version: pkg.version,
	};
}

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

const SVELTE_PREFIX = "/src/lib/fancy-ui/";

// Test files and the scaffolding template never ship, so they stay out of the
// server bundle too. Harnesses, mocks, READMEs and the root barrels are left
// to the stack's own exclusion rules.
const svelteRaw = import.meta.glob(
	["/src/lib/fancy-ui/**/*.{svelte,ts}", "!**/*.test.*", "!**/_template/**"],
	{ query: "?raw", import: "default", eager: true }
) as Record<string, string>;

/** Every candidate Svelte source file, keyed by its path relative to `src/lib/fancy-ui`. */
export function svelteSources(): Record<string, string> {
	const out: Record<string, string> = {};
	for (const [key, src] of Object.entries(svelteRaw)) {
		if (!key.startsWith(SVELTE_PREFIX)) throw new Error(`Unexpected source path: ${key}`);
		if (typeof src !== "string") throw new Error(`Source is not raw text: ${key}`);
		out[key.slice(SVELTE_PREFIX.length)] = src;
	}
	return out;
}

const VUE_PREFIX = "/vue/src/";

// Same split as React: the shipped folders plus the root `utils.ts`; tests stay
// out of the bundle, the rest is left to the stack's exclusion rules.
const vueRaw = import.meta.glob(
	["/vue/src/{components,internals,sound}/**/*.{vue,ts,css}", "!**/*.test.*"],
	{ query: "?raw", import: "default", eager: true }
) as Record<string, string>;

const vueUtils = import.meta.glob("/vue/src/utils.ts", {
	query: "?raw",
	import: "default",
	eager: true,
}) as Record<string, string>;

/** Every candidate Vue source file, keyed by its path relative to `vue/src`. */
export function vueSources(): Record<string, string> {
	const out: Record<string, string> = {};
	for (const [key, src] of Object.entries({ ...vueRaw, ...vueUtils })) {
		if (!key.startsWith(VUE_PREFIX)) throw new Error(`Unexpected source path: ${key}`);
		if (typeof src !== "string") throw new Error(`Source is not raw text: ${key}`);
		out[key.slice(VUE_PREFIX.length)] = src;
	}
	return out;
}

/** Display name, description and category of every component, by slug. */
function componentMeta(): Record<string, { name: string; description: string; category: string }> {
	const meta: Record<string, { name: string; description: string; category: string }> = {};
	for (const [slug, entry] of Object.entries(registry)) {
		meta[slug] = { name: entry.name, description: entry.description, category: entry.category };
	}
	return meta;
}

let memo: BuildOutput | undefined;

/** The whole React registry (index + items), built once per process. */
export function registryOutput(): BuildOutput {
	if (memo) return memo;
	memo = buildRegistry({
		stack: reactStack,
		files: reactSources(),
		meta: componentMeta(),
		siteUrl: SITE_URL,
		versions: versionsOf(reactPackage),
		provenance: provenanceOf(reactPackage),
		serverModules: serverModules(),
		// Decided by the CLI acceptance run (2026-10-19): Next 16 resolves neither
		// "./X.js" → X.tsx under Turbopack nor under webpack; Vite and tsc do.
		// Extensionless relative specifiers work everywhere.
		stripJsExtension: true,
	});
	return memo;
}

let svelteMemo: BuildOutput | undefined;

/** The whole Svelte registry (index + items), built once per process. */
export function svelteRegistryOutput(): BuildOutput {
	if (svelteMemo) return svelteMemo;
	svelteMemo = buildRegistry({
		stack: svelteStack,
		files: svelteSources(),
		meta: componentMeta(),
		siteUrl: SITE_URL,
		versions: versionsOf(rootPackage),
		provenance: provenanceOf(rootPackage),
	});
	return svelteMemo;
}

let vueMemo: BuildOutput | undefined;

/** The whole Vue registry (index + items), built once per process. */
export function vueRegistryOutput(): BuildOutput {
	if (vueMemo) return vueMemo;
	vueMemo = buildRegistry({
		stack: vueStack,
		files: vueSources(),
		meta: componentMeta(),
		siteUrl: SITE_URL,
		versions: versionsOf(vuePackage),
		provenance: provenanceOf(vuePackage),
	});
	return vueMemo;
}
