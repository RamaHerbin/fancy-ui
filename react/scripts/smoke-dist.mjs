#!/usr/bin/env node
/**
 * Executes the published artifact once, in a bare Node process.
 *
 * `vitest` runs against `src`, so until this script nothing behavioural ever
 * touched the files a consumer installs: the `preserveModules` layout, the
 * per-module `"use client"` split and the aggregated `dist/styles.css` were all
 * checked structurally and never run. Three things happen here, in the order
 * a consumer would hit them:
 *
 *  1. Every module the build left WITHOUT `"use client"` is imported. Those are
 *     the package's server modules — the list lives in `client-boundary.mjs` —
 *     and the promise the README makes about them, that a Server Component may
 *     call `cn()` and read the constant tables directly, only holds if importing
 *     them in a DOM-less runtime does nothing. A module-scope `window` read, a
 *     listener registered at import time or a `document` query throws here.
 *  2. Both public entry points are imported and their export counts recorded,
 *     so a barrel that stopped reaching the component graph reads as a failure
 *     rather than as a smaller number nobody looks at.
 *  3. Every capitalised export is server rendered from `{ children: "x" }`.
 *     Exports needing real props throw and are counted, exactly as the vitest
 *     sweeps treat them; the floor is what proves the artifact still renders.
 *
 * Then a gzip budget: the aggregated stylesheet, and the whole emitted JS tree
 * rather than the entry alone, because `preserveModules` means a dependency
 * that lost its `external` entry lands in whichever component imported it and
 * leaves `dist/index.js` unchanged. Ceilings with headroom over today's output;
 * they exist to catch `three` or `gsap` being bundled in, not to police growth.
 */
import { readFile, readdir } from "node:fs/promises";
import { gzipSync } from "node:zlib";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { SERVER_MODULES } from "./client-boundary.mjs";

const root = new URL("../", import.meta.url);
const dist = new URL("dist/", root);

/** Ceilings, not targets. Today: 412 kB of JS, 66 kB of CSS (both printed below). */
const BUDGET_GZIP_JS = 600 * 1024;
const BUDGET_GZIP_CSS = 100 * 1024;

const RENDERED_FLOOR = 150;

const label = (url) => fileURLToPath(url).slice(fileURLToPath(root).length);

async function walk(dir, suffix) {
	const out = [];
	for (const entry of await readdir(dir, { withFileTypes: true })) {
		const child = new URL(entry.name + (entry.isDirectory() ? "/" : ""), dir);
		if (entry.isDirectory()) out.push(...(await walk(child, suffix)));
		else if (entry.name.endsWith(suffix)) out.push(child);
	}
	return out;
}

const failures = [];

// ------------------------------------------------- 1. server modules import
const serverModules = Object.keys(SERVER_MODULES);
for (const fileName of serverModules) {
	try {
		await import(new URL(fileName, dist).href);
	} catch (error) {
		failures.push(
			`dist/${fileName} ships without "use client" but throws on import in a ` +
				`DOM-less runtime: ${error?.message ?? error}`
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

// ----------------------------------------------------------- 3. server render
let rendered = 0;
let needsProps = 0;
for (const [name, value] of Object.entries({ ...pkg, ...cam })) {
	if (typeof value !== "function" && typeof value !== "object") continue;
	if (typeof value === "object" && !(value && "$$typeof" in value)) continue;
	if (!/^[A-Z]/.test(name)) continue;
	try {
		renderToStaticMarkup(createElement(value, { children: "x" }));
		rendered += 1;
	} catch {
		needsProps += 1;
	}
}
if (rendered < RENDERED_FLOOR) {
	failures.push(
		`only ${rendered} exports rendered from the built package (floor ${RENDERED_FLOOR}) — ` +
			`the artifact is not reaching its components.`
	);
}

// ------------------------------------------------------------- 4. size budget
const emitted = await walk(dist, ".js");
let javascript = 0;
for (const file of emitted) javascript += gzipSync(await readFile(file)).length;
const stylesheet = gzipSync(await readFile(new URL("styles.css", dist))).length;

const kb = (bytes) => `${(bytes / 1024).toFixed(1)} kB gz`;
const sizes = [`${emitted.length} js files ${kb(javascript)}`, `styles.css ${kb(stylesheet)}`];

for (const [what, bytes, ceiling] of [
	["the emitted JavaScript", javascript, BUDGET_GZIP_JS],
	["dist/styles.css", stylesheet, BUDGET_GZIP_CSS],
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
	`✅ dist smoke: ${serverModules.length} server module(s) import cleanly with no DOM; ` +
		`${rendered} export(s) server render (${needsProps} need real props); ${sizes.join(", ")}.`
);
