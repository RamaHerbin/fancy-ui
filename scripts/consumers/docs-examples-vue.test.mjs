/**
 * Unit tests for the pure helpers of docs-examples-vue.mjs.
 *
 *   node --test scripts/consumers/docs-examples-vue.test.mjs
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import { exampleName, listExamples, ownDiagnostics } from "./docs-examples-vue.mjs";

test("listExamples returns every .vue snippet, nested folders included, sorted", () => {
	const dir = mkdtempSync(join(tmpdir(), "docs-examples-"));
	try {
		mkdirSync(join(dir, "_install"));
		writeFileSync(join(dir, "button.vue"), "");
		writeFileSync(join(dir, "alpha.vue"), "");
		writeFileSync(join(dir, "notes.txt"), "");
		writeFileSync(join(dir, "_install", "usage.vue"), "");
		writeFileSync(join(dir, "_install", "stylesheet.txt"), "");
		assert.deepEqual(listExamples(dir), ["_install/usage.vue", "alpha.vue", "button.vue"]);
	} finally {
		rmSync(dir, { recursive: true, force: true });
	}
});

test("a failing run still removes its scratch folder", () => {
	// A tarball that does not exist makes `npm install` fail inside main's try
	// block; the scratch app must be gone afterwards (fail() used to exit the
	// process before the `finally` could clean up).
	const tmp = mkdtempSync(join(tmpdir(), "docs-examples-cleanup-"));
	const source = join(tmp, "snippets");
	mkdirSync(source);
	writeFileSync(join(source, "one.vue"), "<template><p>hi</p></template>\n");
	const scratchRoot = join(tmp, "scratch");
	mkdirSync(scratchRoot);
	try {
		const r = spawnSync(
			process.execPath,
			[
				join(dirname(fileURLToPath(import.meta.url)), "docs-examples-vue.mjs"),
				"--source",
				source,
				"--tarball",
				join(tmp, "missing.tgz"),
			],
			{ env: { ...process.env, TMPDIR: scratchRoot, KEEP_CONSUMER: "" }, encoding: "utf8" }
		);
		assert.notEqual(r.status, 0, "the run must fail");
		const left = readdirSync(scratchRoot).filter((n) =>
			n.startsWith("fancy-ui-docs-examples-vue.")
		);
		assert.deepEqual(left, [], "the scratch folder must be removed");
	} finally {
		rmSync(tmp, { recursive: true, force: true });
	}
});

test("exampleName gives a flat, selector-safe id", () => {
	assert.equal(exampleName("_install/first-component.vue"), "install-first-component");
	assert.equal(exampleName("glow-border.vue"), "glow-border");
});

test("ownDiagnostics keeps type errors located in the examples and drops the rest", () => {
	const output = [
		"src/examples/dialog.vue(12,3): error TS2322: Type 'x' is not assignable to type 'y'.",
		"node_modules/fancy-ui-vue/dist/foo.d.ts(1,1): error TS1000: library noise",
		"src/examples/_install/usage.vue(4,1): error TS2305: no exported member",
		"",
	].join("\n");
	assert.deepEqual(ownDiagnostics(output), [
		"src/examples/dialog.vue(12,3): error TS2322: Type 'x' is not assignable to type 'y'.",
		"src/examples/_install/usage.vue(4,1): error TS2305: no exported member",
	]);
});
