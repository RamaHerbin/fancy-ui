#!/usr/bin/env node
/**
 * Gate for the SHAPE of the published artifact: which modules carry the
 * `"use client"` boundary, and which files are in dist at all.
 *
 * Four assertions, each pinning a defect the build has actually shipped:
 *
 *  1. The `"use client"` split is exactly "imports React". vite.config.ts's
 *     banner function decides per emitted module; this re-derives the same
 *     answer from dist and fails on any disagreement in either direction. A
 *     component that lost its banner breaks an RSC consumer loudly; a
 *     re-export barrel that gained one breaks them quietly, by turning every
 *     value it forwards — `cn`, `toast`, the constant tables — into a client
 *     reference no Server Component can call.
 *  2. No `"use client"` is written in source (convention C-9). The directive is
 *     the build's job; Rollup strips module-level directives when it bundles,
 *     so one written in a source file is at best inert and at worst a second,
 *     contradicting record of where the boundary sits.
 *  3. Nothing in dist declares a runtime export it does not ship. Test rigs are
 *     the recurring case: the React port renamed the Svelte harnesses from
 *     `<Name>Harness.test.svelte` to `<Name>Harness.tsx`, dropping the `.test.`
 *     infix that both the tsconfig exclude and the CI pack filter keyed on, and
 *     14 declaration files with no runtime counterpart shipped for it.
 *  4. No declaration references a file dist does not contain. `tsc` copies each
 *     component's `import "./button.css";` into its `.d.ts`, where the file it
 *     names does not exist — a TS2307 per component for any consumer who has
 *     not set `skipLibCheck`. `scripts/strip-dts-css-imports.mjs` removes them
 *     during the build; this is what stops them coming back.
 *
 * Runs after the build, from the `build` script, because it reads dist.
 */
import { readFile, readdir, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import {
	SERVER_MODULES,
	USE_CLIENT,
	boundaryProblems,
	clientModules,
	withoutComments,
} from "./client-boundary.mjs";

const root = new URL("../", import.meta.url);
const dist = new URL("dist/", root);
const src = new URL("src/", root);

/** A relative specifier in a declaration file, whatever the statement shape. */
const RELATIVE_SPECIFIER = /(?:from\s*|import\s*)["'](\.[^"']*)["']/g;
/** A declaration that promises a runtime value, as opposed to a type. */
const RUNTIME_DECLARATION = /export\s+declare\s+(?:const|function|class|let|var)\s/;

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

/** `dist/components/button/Button.js` — how every message below names a file. */
const label = (url) => fileURLToPath(url).slice(fileURLToPath(root).length);

const failures = [];

// ---------------------------------------------------------------- 1. boundary
const emitted = await walk(dist, [".js"]);
const distRoot = fileURLToPath(dist);

/** `{ fileName, code }` with the directive removed, which is what the rule reads. */
const modules = await Promise.all(
	emitted.map(async (file) => {
		const source = await readFile(file, "utf8");
		return {
			fileName: fileURLToPath(file).slice(distRoot.length),
			declared: source.startsWith(USE_CLIENT),
			code: source.startsWith(USE_CLIENT) ? source.slice(USE_CLIENT.length) : source,
			file,
		};
	})
);

const expected = clientModules(modules);
failures.push(...boundaryProblems(modules));

for (const module of modules) {
	const needed = expected.has(module.fileName);
	if (needed && !module.declared) {
		failures.push(
			`${label(module.file)} needs "use client" and ships without it — an RSC app ` +
				`would run its React code on the server.`
		);
	}
	if (!needed && module.declared) {
		failures.push(
			`${label(module.file)} carries "use client" and needs none — every value it ` +
				`exports becomes a client reference a Server Component cannot read.`
		);
	}
}

// ------------------------------------------------------------------ 2. source
for (const file of await walk(src, [".ts", ".tsx"])) {
	const source = withoutComments(await readFile(file, "utf8"));
	if (source.includes(USE_CLIENT)) {
		failures.push(
			`${label(file)} writes "use client" in source, which convention C-9 forbids: ` +
				`the directive comes from vite.config.ts's banner, per emitted module.`
		);
	}
}

// ----------------------------------------------------------------- 3. orphans
const declarations = await walk(dist, [".d.ts"]);

for (const file of declarations) {
	const name = fileURLToPath(file).split("/").pop();
	if (/Harness\.d\.ts$/.test(name) || name === "web-audio-mock.d.ts") {
		failures.push(
			`${label(file)} is a test rig — add its pattern to tsconfig.build.json's exclude.`
		);
		continue;
	}
	const source = withoutComments(await readFile(file, "utf8"));
	if (!RUNTIME_DECLARATION.test(source)) continue; // types only: no .js is expected
	const runtime = new URL(name.replace(/\.d\.ts$/, ".js"), file);
	if (!(await exists(runtime))) {
		failures.push(
			`${label(file)} declares a runtime export but ships no ${label(runtime)} — ` +
				`the module is not in the bundle's graph, so the declaration types an ` +
				`import that cannot load.`
		);
	}
}

// -------------------------------------------------------------- 4. references
for (const file of declarations) {
	const source = withoutComments(await readFile(file, "utf8"));
	for (const [, specifier] of source.matchAll(RELATIVE_SPECIFIER)) {
		const target = new URL(specifier, file);
		// TypeScript resolves `./Button.js` through `./Button.d.ts`, so a
		// declaration counterpart satisfies a `.js` specifier.
		const candidates = specifier.endsWith(".js")
			? [new URL(specifier.replace(/\.js$/, ".d.ts"), file), target]
			: [target];
		let found = false;
		for (const candidate of candidates) if (await exists(candidate)) found = true;
		if (!found) {
			failures.push(
				`${label(file)} references "${specifier}", which dist does not contain.`
			);
		}
	}
}

// ------------------------------------------------------------------- verdict
if (failures.length) {
	console.error(`❌ dist shape: ${failures.length} problem(s).`);
	for (const line of failures) console.error(`   ${line}`);
	process.exit(1);
}

console.log(
	`✅ dist shape: ${expected.size} client module(s) carry "use client", ` +
		`${Object.keys(SERVER_MODULES).length} server module(s) correctly do not; ` +
		`${declarations.length} declaration(s) resolve and none is a test rig.`
);
