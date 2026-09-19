#!/usr/bin/env node
/**
 * Executes the published artifact once, in a bare Node process.
 *
 * `vitest` runs against `src`, so until this script nothing behavioural ever
 * touched the files a consumer installs: the `preserveModules` layout, the
 * inlined SFC render functions and the aggregated `dist/styles.css` were all
 * checked structurally and never run. Four things happen here, in the order a
 * consumer would hit them:
 *
 *  1. EVERY emitted module is imported. This package has no server/client
 *     split to narrow the list down — a Nitro server pulls the whole module
 *     graph in during `nuxt build`, so every module has to survive evaluation
 *     in a runtime with no `window` and no `document`. A module-scope DOM read,
 *     a listener registered at import time or a media query evaluated eagerly
 *     throws here, which is the same failure the SSR gate would hit later and
 *     far cheaper to read.
 *  2. Both public entry points are imported and their export counts recorded,
 *     so a barrel that stopped reaching the component graph reads as a failure
 *     rather than as a smaller number nobody looks at.
 *  3. Every capitalised component-shaped export is server rendered with no
 *     props and `"x"` in its default slot. Exports needing real props throw and
 *     are counted, exactly as the package-wide sweeps in `src` treat them; the
 *     floor is what proves the artifact still renders.
 *  4. A gzip budget: the aggregated stylesheet, and the whole emitted JS tree
 *     rather than the entry alone, because `preserveModules` means a dependency
 *     that lost its `external` entry lands in whichever component imported it
 *     and leaves `dist/index.js` unchanged. Ceilings, not targets: they exist
 *     to catch `three` or `gsap` being bundled in, not to police growth.
 */
import { readFile, readdir, stat } from "node:fs/promises";
import { gzipSync } from "node:zlib";
import { fileURLToPath } from "node:url";
import { createSSRApp, h } from "vue";
import { renderToString } from "vue/server-renderer";

const root = new URL("../", import.meta.url);
const dist = new URL("dist/", root);

/**
 * Carried over from the sibling package's numbers, which sit at 412 kB of JS
 * and 66 kB of CSS for the same 145 components. Revisit both once this package
 * has built its full component set for the first time: the scoped-style model
 * aggregates differently from colocated stylesheets, and the real figures are
 * printed on every successful run below.
 */
const BUDGET_GZIP_JS = 600 * 1024;
const BUDGET_GZIP_CSS = 100 * 1024;

/**
 * Raised by every porting wave. It starts at zero so the gate is green on the
 * empty barrel this package bootstraps from; the moment a wave lands its
 * components, it is set to the number that wave rendered, and from then on a
 * barrel that stops reaching them is a failure rather than a smaller number.
 */
const RENDERED_FLOOR = 0;

/** `dist/components/button/Button.vue.js` — how every message below names a file. */
const label = (url) => fileURLToPath(url).slice(fileURLToPath(root).length);

/** Every file under `dir` whose name ends in `suffix`, depth-first. */
async function walk(dir, suffix) {
	const out = [];
	for (const entry of await readdir(dir, { withFileTypes: true })) {
		const child = new URL(entry.name + (entry.isDirectory() ? "/" : ""), dir);
		if (entry.isDirectory()) out.push(...(await walk(child, suffix)));
		else if (entry.name.endsWith(suffix)) out.push(child);
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

/**
 * Component-shaped, as the runtime judges it: a function (functional component)
 * or an options object carrying one of the members that make it renderable. The
 * capitalised exports that are not components — constant tables, skin objects,
 * option presets — are plain data and fall out here, the way a context object
 * has to be excluded from the sweeps in `src`.
 */
function isComponent(value) {
	if (typeof value === "function") return true;
	if (typeof value !== "object" || value === null) return false;
	return "setup" in value || "render" in value || "template" in value || "__vccOpts" in value;
}

const failures = [];

// -------------------------------------------------- 1. every module, no DOM
const emitted = (await walk(dist, ".js")).sort((a, b) => a.href.localeCompare(b.href));
for (const file of emitted) {
	try {
		await import(file.href);
	} catch (error) {
		failures.push(
			`${label(file)} throws on import in a DOM-less runtime: ${error?.message ?? error} — ` +
				`every emitted module is evaluated server-side, so nothing may touch the DOM at ` +
				`module scope.`
		);
	}
}

// ------------------------------------------------------- 2. the entry points
let pkg = {};
let cam = {};
try {
	pkg = await import(new URL("index.js", dist).href);
} catch (error) {
	failures.push(`dist/index.js does not import: ${error?.message ?? error}`);
}
try {
	cam = await import(new URL("cameleon/index.js", dist).href);
} catch (error) {
	failures.push(`dist/cameleon/index.js does not import: ${error?.message ?? error}`);
}
const exportCounts = `${Object.keys(pkg).length} + ${Object.keys(cam).length} export(s)`;

// ----------------------------------------------------------- 3. server render
let rendered = 0;
let needsProps = 0;
let scopedMarkup = false;

/**
 * The sweep renders components without the props several of them require, and
 * the runtime says so on `console.warn` / `console.error` before the render
 * either recovers or throws. Those messages are the expected shape of this
 * sweep rather than signal, so they are collected instead of printed — and one
 * of them IS signal: an export that reaches the renderer with neither template
 * nor render function produces a warning and an empty comment node rather than
 * a throw, which would otherwise count as a rendered component and lift the
 * floor on nothing.
 */
const said = [];
const speak = { warn: console.warn, error: console.error };
console.warn = (...args) => said.push(args.join(" "));
console.error = (...args) => said.push(args.join(" "));

try {
	for (const [name, value] of Object.entries({ ...pkg, ...cam })) {
		if (!/^[A-Z]/.test(name)) continue;
		if (!isComponent(value)) continue;
		const before = said.length;
		try {
			const html = await renderToString(
				createSSRApp({ render: () => h(value, {}, { default: () => "x" }) })
			);
			const hollow = said
				.slice(before)
				.some((line) => /missing template or render function/i.test(line));
			if (hollow) {
				needsProps += 1;
			} else {
				rendered += 1;
				if (html.includes("data-v-")) scopedMarkup = true;
			}
		} catch {
			needsProps += 1;
		}
	}
} finally {
	Object.assign(console, speak);
}

if (rendered < RENDERED_FLOOR) {
	failures.push(
		`only ${rendered} export(s) rendered from the built package (floor ${RENDERED_FLOOR}) — ` +
			`the artifact is not reaching its components.`
	);
}

// ------------------------------------------------------------- 4. size budget
let javascript = 0;
for (const file of emitted) javascript += gzipSync(await readFile(file)).length;

const stylesheet = new URL("styles.css", dist);
const hasStylesheet = await exists(stylesheet);
const css = hasStylesheet ? gzipSync(await readFile(stylesheet)).length : 0;

/**
 * Before any component ships a `<style>` block there is no aggregate
 * stylesheet to emit, so its absence is legal — but only then. Scoped styles
 * stamp their `data-v-` attribute into the server markup, so markup carrying
 * one and a `dist/` carrying no stylesheet is the aggregation having silently
 * stopped, which is what this pairs the two facts to catch.
 */
if (!hasStylesheet && scopedMarkup) {
	failures.push(
		`dist/styles.css is missing while the rendered markup carries scoped \`data-v-\` ` +
			`attributes — the SFC styles are no longer aggregating into the stylesheet.`
	);
}

const kb = (bytes) => `${(bytes / 1024).toFixed(1)} kB gz`;
const sizes = [
	`${emitted.length} js files ${kb(javascript)}`,
	hasStylesheet ? `styles.css ${kb(css)}` : "no styles.css emitted yet",
];

for (const [what, bytes, ceiling] of [
	["the emitted JavaScript", javascript, BUDGET_GZIP_JS],
	["dist/styles.css", css, BUDGET_GZIP_CSS],
]) {
	if (bytes > ceiling) {
		failures.push(
			`${what} is ${kb(bytes)}, over its ${(ceiling / 1024).toFixed(0)} kB budget — ` +
				`check that nothing lost its entry in vite.config.ts's \`external\` list.`
		);
	}
}

if (failures.length) {
	console.error(`❌ dist smoke: ${failures.length} problem(s).`);
	for (const line of failures) console.error(`   ${line}`);
	process.exit(1);
}

console.log(
	`✅ dist smoke: ${emitted.length} module(s) import cleanly with no DOM; ` +
		`the barrels expose ${exportCounts}; ${rendered} export(s) server render ` +
		`(${needsProps} need real props); ${sizes.join(", ")}.`
);
