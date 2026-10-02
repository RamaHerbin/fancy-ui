#!/usr/bin/env node
/**
 * Gate for the SHAPE of the published artifact: which files are in dist at
 * all, what they declare, what they compile to, and what they import.
 *
 * Four assertions, each pinning a defect this kind of build has actually
 * shipped (the first two are inherited from the React package's gate of the
 * same name; the last two are Vue-specific):
 *
 *  1. Nothing in dist declares a runtime export it does not ship. Test rigs are
 *     the recurring case: the React port renamed the Svelte harnesses from
 *     `<Name>Harness.test.svelte` to `<Name>Harness.tsx`, dropping the `.test.`
 *     infix that both the tsconfig exclude and the CI pack filter keyed on, and
 *     14 declaration files with no runtime counterpart shipped for it. Here the
 *     rigs are `<Name>Harness.vue`, so the pattern has to match the doubled
 *     extension `<Name>Harness.vue.d.ts` as well.
 *  2. No declaration references a file dist does not contain. `vue-tsc` copies
 *     each shared stylesheet's `import "./x.css";` into the `.d.ts`, where the
 *     file it names does not exist — a TS2307 per module for any consumer who
 *     has not set `skipLibCheck`. `scripts/strip-dts-css-imports.mjs` removes
 *     them during the build; this is what stops them coming back. A `.vue`
 *     specifier is resolved the way TypeScript resolves it, through the
 *     sibling `<file>.vue.d.ts` that `vue-tsc` emits next to it.
 *  3. Every SFC under `src/` has a `<script setup>` block. Checked in the
 *     SOURCE, not in dist — see the note below on what the first real build
 *     taught us about reading this off the emitted filenames.
 *  4. Every bare import specifier in dist resolves to a package listed in
 *     `dependencies` or `peerDependencies`. This is the zero-dep rule made
 *     mechanical: the package may import only the six shared runtime deps plus
 *     its peers, and the failure mode it guards is a module that reaches for a
 *     transitive internal — `@vue/shared` is the one to expect, since it is
 *     installed, typed, and importable, yet is nobody's declared dependency —
 *     which then resolves for whoever hoisted it and fails for everyone else.
 *     Subpaths collapse to their package (`vue/server-renderer` → `vue`,
 *     `three/examples/jsm/…` → `three`), so a legal deep import stays legal.
 *
 * TWO ASSERTIONS THE FIRST REAL BUILD RETIRED. Both were written before any
 * SFC existed, from the design notes rather than from output, and a throwaway
 * probe component built against this config disproved both. Recorded here so
 * they are not reinstated from the same reasoning:
 *
 *  - "No emitted file is named `<Something>.vue<N>.js`", on the premise that
 *    plugin-vue only splits an SFC's template into a second chunk when the
 *    file lacks `<script setup>`. FALSE under `preserveModules`. The probe had
 *    `<script setup>` in both components and both emitted a `.vue2.js`
 *    sibling: plugin-vue hands Rollup the script and the scoped-style wrapper
 *    as separate modules, and `preserveModules` — by design — writes every
 *    module to its own file. For an SFC with `<style scoped>` the `.vue.js`
 *    file is the wrapper that attaches `__scopeId` and `.vue2.js` holds the
 *    compiled component; without one, the split is a bare re-export. The
 *    assertion would therefore have failed on essentially every component
 *    this package will ever ship, while telling the porter to add a
 *    `<script setup>` that was already there. The rule it was trying to
 *    enforce is real, so it moved to the source, as assertion 3.
 *
 *  - "No emitted module calls `createStaticVNode(`", on the premise that the
 *    compiler's `stringifyStatic` transform hides Tailwind class names inside
 *    a string literal the consumer's `@source` scan cannot read. The trigger
 *    is real and easy to hit — a 12-item static list tripped it — but the
 *    consequence is not. Measured end to end: the probe's stringified subtree
 *    used `bg-neutral-100`, `text-xs` and `gap-2`, which appear NOWHERE in
 *    the example app's own source, and `nuxt generate` compiled all three
 *    into its stylesheet. Tailwind v4's extractor scans raw bytes and finds
 *    utility candidates inside string literals perfectly well. Dropping the
 *    assertion also means `template.compilerOptions.hoistStatic` stays at its
 *    default, so components keep the faster static path. Re-measure before
 *    reinstating: build a component whose classes appear only inside a
 *    `createStaticVNode(` blob and check the consumer's compiled CSS.
 *
 * Runs after the build, from the `build` script, because it reads dist.
 */
import { readFile, readdir, stat } from "node:fs/promises";
import { builtinModules } from "node:module";
import { fileURLToPath } from "node:url";

const root = new URL("../", import.meta.url);
const dist = new URL("dist/", root);

/** A relative specifier in a declaration file, whatever the statement shape. */
const RELATIVE_SPECIFIER = /(?:from\s*|import\s*)["'](\.[^"']*)["']/g;
/**
 * A declaration that promises a runtime value, as opposed to a type.
 *
 * Two shapes, because two emitters write these files. `vue-tsc` compiling a
 * `.ts` module writes the exported form (`export declare function cn(…)`);
 * compiling an SFC it writes the component as an unexported local that the
 * default export then names — `declare const _default: DefineComponent<…>;`
 * followed by `export default _default;`. Matching only the first shape would
 * classify every `<Name>.vue.d.ts` as types-only and skip the sibling check
 * for exactly the files this package is made of.
 */
const RUNTIME_DECLARATION =
	/export\s+declare\s+(?:const|function|class|let|var)\s|\bdeclare\s+const\s+_default\s*[:=]/;
/** A rig that must never reach dist, under either the `.ts` or the `.vue` name. */
const TEST_RIG = /(?:Harness(?:\.vue)?\.d\.ts|web-audio-mock\.d\.ts)$/;

/** `import … "spec";` and `export … from "spec";` — no binding lists, just specifiers. */
const IMPORT_STATEMENT = /\bimport\s*(?:[^;]*?\bfrom\s*)?["']([^"']+)["']\s*;/g;
const REEXPORT_STATEMENT =
	/\bexport\s*(?:\*(?:\s+as\s+[^\s]+)?|\{[^}]*\})\s*from\s*["']([^"']+)["']\s*;/g;
/** `import("spec")` — a lazy chunk's dependency counts exactly as much as an eager one. */
const DYNAMIC_IMPORT = /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g;

/**
 * Source with its comments removed and its string literals left intact.
 *
 * Every rule below matches statement shapes, and this package documents its
 * own conventions in prose that quotes them — a doc comment naming an import
 * would otherwise read as one.
 */
function withoutComments(source) {
	let out = "";
	let quote = null;
	for (let i = 0; i < source.length; ) {
		const char = source[i];
		if (quote) {
			out += char;
			if (char === "\\") {
				out += source[i + 1] ?? "";
				i += 2;
				continue;
			}
			if (char === quote) quote = null;
			i += 1;
		} else if (char === '"' || char === "'" || char === "`") {
			quote = char;
			out += char;
			i += 1;
		} else if (char === "/" && source[i + 1] === "/") {
			while (i < source.length && source[i] !== "\n") i += 1;
		} else if (char === "/" && source[i + 1] === "*") {
			i += 2;
			while (i < source.length && !(source[i] === "*" && source[i + 1] === "/")) i += 1;
			i += 2;
		} else {
			out += char;
			i += 1;
		}
	}
	return out;
}

/** Every module specifier the code names — static, re-exported, or dynamic. */
function specifiersOf(code) {
	const out = [];
	for (const pattern of [IMPORT_STATEMENT, REEXPORT_STATEMENT, DYNAMIC_IMPORT]) {
		for (const [, specifier] of code.matchAll(pattern)) out.push(specifier);
	}
	return out;
}

/** `three/examples/jsm/x.js` → `three`; `@chenglou/pretext/y` → `@chenglou/pretext`. */
function packageOf(specifier) {
	const segments = specifier.split("/");
	return specifier.startsWith("@") ? segments.slice(0, 2).join("/") : segments[0];
}

/** `node:fs`, `fs`, `path` — a bare specifier Node answers without any package. */
const BUILTINS = new Set(builtinModules);
function isBuiltin(pkg) {
	return pkg.startsWith("node:") || BUILTINS.has(pkg);
}

/** Every file under `dir` whose name ends in one of `suffixes`, depth-first. */
async function walk(dir, suffixes) {
	const out = [];
	for (const entry of await readdir(dir, { withFileTypes: true })) {
		const child = new URL(entry.name + (entry.isDirectory() ? "/" : ""), dir);
		if (entry.isDirectory()) out.push(...(await walk(child, suffixes)));
		else if (suffixes.some((suffix) => entry.name.endsWith(suffix))) out.push(child);
	}
	return out;
}

async function exists(url) {
	try {
		await stat(url);
		return true;
	} catch {
		return false;
	}
}

/** `dist/components/button/Button.vue.js` — how every message below names a file. */
const label = (url) => fileURLToPath(url).slice(fileURLToPath(root).length);

const failures = [];

const emitted = await walk(dist, [".js"]);
const declarations = await walk(dist, [".d.ts"]);

// ----------------------------------------------------------------- 1. orphans
for (const file of declarations) {
	const name = fileURLToPath(file).split("/").pop();
	if (TEST_RIG.test(name)) {
		failures.push(
			`${label(file)} is a test rig — add its pattern to tsconfig.build.json's exclude.`
		);
		continue;
	}
	const source = withoutComments(await readFile(file, "utf8"));
	if (!RUNTIME_DECLARATION.test(source)) continue; // types only: no .js is expected
	// Internal modules are not a consumer import path. Mid-campaign, Rollup
	// tree-shakes the ones no ported component uses yet; prune-orphan-dts.mjs
	// drops their declarations, and the survivors are exactly the ones a public
	// type aggregate references (a type re-export pulls no runtime module into
	// the graph). Their consistency is covered by the reference check below.
	if (label(file).startsWith("dist/internals/")) continue;
	const runtime = new URL(name.replace(/\.d\.ts$/, ".js"), file);
	if (!(await exists(runtime))) {
		failures.push(
			`${label(file)} declares a runtime export but ships no ${label(runtime)} — ` +
				`the module is not in the bundle's graph, so the declaration types an ` +
				`import that cannot load.`
		);
	}
}

// -------------------------------------------------------------- 2. references
for (const file of declarations) {
	const source = withoutComments(await readFile(file, "utf8"));
	for (const [, specifier] of source.matchAll(RELATIVE_SPECIFIER)) {
		const target = new URL(specifier, file);
		// TypeScript resolves `./Button.js` through `./Button.d.ts`, and
		// `./Button.vue` through the `./Button.vue.d.ts` that sits beside it, so
		// a declaration counterpart satisfies either specifier.
		let candidates = [target];
		if (specifier.endsWith(".js")) {
			candidates = [new URL(specifier.replace(/\.js$/, ".d.ts"), file), target];
		} else if (specifier.endsWith(".vue")) {
			candidates = [new URL(`${specifier}.d.ts`, file), target];
		}
		let found = false;
		for (const candidate of candidates) if (await exists(candidate)) found = true;
		if (!found) {
			failures.push(
				`${label(file)} references "${specifier}", which dist does not contain.`
			);
		}
	}
}

/** Every emitted module read once, since the assertions below scan the same text. */
const bundles = await Promise.all(
	emitted.map(async (file) => ({
		file,
		name: fileURLToPath(file).split("/").pop(),
		code: withoutComments(await readFile(file, "utf8")),
	}))
);

// ------------------------------------------------------------ 3. `<script setup>`
for (const file of await walk(new URL("src/", root), [".vue"])) {
	const source = await readFile(file, "utf8");
	if (!/<script[^>]*\bsetup\b/.test(source)) {
		failures.push(
			`${label(file)} has no <script setup> block — plugin-vue only inlines an SFC's ` +
				`render function into the component module for setup SFCs, and every other ` +
				`convention in this package (props from defineProps, the Props interface in a ` +
				`sibling plain <script> block) assumes it. Add it.`
		);
	}
}

// --------------------------------------------------------- 4. bare specifiers
const manifest = JSON.parse(await readFile(new URL("package.json", root), "utf8"));
const allowed = new Set([
	...Object.keys(manifest.dependencies ?? {}),
	...Object.keys(manifest.peerDependencies ?? {}),
]);

const strays = new Map(); // package name → the emitted files that import it
for (const { file, code } of bundles) {
	for (const specifier of specifiersOf(code)) {
		if (specifier.startsWith(".") || specifier.startsWith("/")) continue;
		const pkg = packageOf(specifier);
		if (allowed.has(pkg)) continue;
		if (!strays.has(pkg)) strays.set(pkg, []);
		strays.get(pkg).push(label(file));
	}
}

for (const [pkg, files] of strays) {
	const where = `${files[0]}${files.length > 1 ? ` (+${files.length - 1} more)` : ""}`;
	failures.push(
		isBuiltin(pkg)
			? `${where} imports the Node builtin "${pkg}" — this package runs in the ` +
					`browser as well as under SSR, and a bundler resolving it there either ` +
					`fails the build or ships a polyfill nobody asked for.`
			: `${where} imports "${pkg}", which is neither a dependency nor a ` +
					`peerDependency of this package — it resolves here only because ` +
					`something else installed it, and breaks for any consumer whose ` +
					`package manager did not hoist it.`
	);
}

// ------------------------------------------------------------------- verdict
if (failures.length) {
	console.error(`❌ dist shape: ${failures.length} problem(s).`);
	for (const line of failures) console.error(`   ${line}`);
	process.exit(1);
}

console.log(
	`✅ dist shape: ${declarations.length} declaration(s) resolve and none is a test rig; ` +
		`every SFC under src/ uses <script setup>; ${emitted.length} module(s) import only ` +
		`this package's ${allowed.size} declared package(s).`
);
