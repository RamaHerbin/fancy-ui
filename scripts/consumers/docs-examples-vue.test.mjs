/**
 * Unit tests for the pure helpers of docs-examples-vue.mjs.
 *
 *   node --test scripts/consumers/
 */
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

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
