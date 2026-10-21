// node --test scripts/check-dist-env.test.mjs
//
// Runs check-dist-env.mjs against throwaway packages, so every rule is proven
// to fire on the shipped files and to stay quiet on files `files` leaves out.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const script = join(dirname(fileURLToPath(import.meta.url)), "check-dist-env.mjs");

const EXPORTS = {
	".": { types: "./dist/index.d.ts", default: "./dist/index.js" },
	"./cameleon": { types: "./dist/cameleon/index.d.ts", default: "./dist/cameleon/index.js" },
	"./cameleon/*": "./dist/cameleon/*",
	"./tailwind.css": "./tailwind.css",
	"./package.json": "./package.json",
};

const CLEAN = {
	"dist/index.js": 'export const answer = 42;\nexport { Button } from "./button.js";\n',
	"dist/index.d.ts": "export declare const answer: number;\n",
	"dist/button.js": "export function Button() {}\n",
	"dist/cameleon/index.js": "export const skin = {};\n",
	"dist/cameleon/index.d.ts": "export declare const skin: object;\n",
	"tailwind.css": '@source "./dist";\n',
};

/** Writes a package into a fresh temp folder and returns its path. */
function pkg({ files = CLEAN, manifest = {} } = {}) {
	const dir = mkdtempSync(join(tmpdir(), "check-dist-env-"));
	writeFileSync(
		join(dir, "package.json"),
		JSON.stringify(
			{
				name: "fixture-pkg",
				version: "0.0.0",
				type: "module",
				files: ["dist", "tailwind.css"],
				exports: EXPORTS,
				...manifest,
			},
			null,
			"\t"
		)
	);
	for (const [path, content] of Object.entries(files)) {
		mkdirSync(dirname(join(dir, path)), { recursive: true });
		writeFileSync(join(dir, path), content);
	}
	return dir;
}

function run(dir, ...flags) {
	const r = spawnSync(process.execPath, [script, ...flags, dir], { encoding: "utf8" });
	rmSync(dir, { recursive: true, force: true });
	return { status: r.status, out: r.stdout + r.stderr };
}

test("a clean built package passes", () => {
	const r = run(pkg(), "--require-built");
	assert.equal(r.status, 0, r.out);
	assert.match(r.out, /ok/);
});

test("a raw bundler environment read in a shipped file fails, with file and line", () => {
	const r = run(
		pkg({
			files: {
				...CLEAN,
				"dist/button.js":
					"export function Button() {}\nif (import.meta.env.DEV) console.warn('x');\n",
			},
		})
	);
	assert.equal(r.status, 1, r.out);
	assert.match(r.out, /dist\/button\.js:2/);
	assert.match(r.out, /import\.meta\.env/);
});

test("the same read in a file the package does not ship is ignored", () => {
	const r = run(
		pkg({ files: { ...CLEAN, "src/dev-only.js": "console.log(import.meta.env.DEV);\n" } })
	);
	assert.equal(r.status, 0, r.out);
});

test("a framework-only module import in a shipped component fails", () => {
	const r = run(
		pkg({
			files: {
				...CLEAN,
				"dist/cameleon/Provider.svelte":
					'<script>\n\timport { browser } from "$app/environment";\n</script>\n',
			},
		})
	);
	assert.equal(r.status, 1, r.out);
	assert.match(r.out, /dist\/cameleon\/Provider\.svelte:2/);
	assert.match(r.out, /\$app\/environment/);
});

test("a dynamic import of a private environment module fails too", () => {
	const r = run(
		pkg({
			files: {
				...CLEAN,
				"dist/button.js": 'export const load = () => import("$env/static/public");\n',
			},
		})
	);
	assert.equal(r.status, 1, r.out);
	assert.match(r.out, /\$env\/static\/public/);
});

test("an import of the SvelteKit package in a shipped file fails", () => {
	const r = run(
		pkg({
			files: {
				...CLEAN,
				"dist/button.js": 'import { error } from "@sveltejs/kit";\nexport const Button = error;\n',
			},
		})
	);
	assert.equal(r.status, 1, r.out);
	assert.match(r.out, /dist\/button\.js:1/);
	assert.match(r.out, /@sveltejs\/kit/);
});

test("a package without one of the documented entry points fails", () => {
	const { "./package.json": _drop, ...rest } = EXPORTS;
	const r = run(pkg({ manifest: { exports: rest } }));
	assert.equal(r.status, 1, r.out);
	assert.match(r.out, /"\.\/package\.json"/);
});

test("an exports target the package does not ship fails", () => {
	const r = run(
		pkg({ manifest: { exports: { ...EXPORTS, "./styles.css": "./dist/styles.css" } } })
	);
	assert.equal(r.status, 1, r.out);
	assert.match(r.out, /\.\/dist\/styles\.css/);
});

test("an unbuilt package is skipped with a note, and fails under --require-built", () => {
	const unbuilt = { "tailwind.css": '@source "./dist";\n' };
	const skipped = run(pkg({ files: unbuilt }));
	assert.equal(skipped.status, 0, skipped.out);
	assert.match(skipped.out, /not built/);
	const strict = run(pkg({ files: unbuilt }), "--require-built");
	assert.equal(strict.status, 1, strict.out);
	assert.match(strict.out, /not built/);
});
