import { test } from "node:test";
import assert from "node:assert/strict";
import { findCounts, checkText, registrySize } from "./check-readme-count.mjs";

test("findCounts finds badge, bold and prose counts", () => {
	const text =
		"![C](https://img.shields.io/badge/Components-151-8B5CF6)\n- **151 components** x\nAll 151 components of y\nContributions 151 components and counting";
	assert.deepEqual(
		findCounts(text).map((c) => c.value),
		[151, 151, 151, 151]
	);
});

test("findCounts ignores counts that describe a sub-kit", () => {
	assert.deepEqual(findCounts("subpath (18 components, the accent) and badge/Components-9-x"), [
		{ value: 9, line: 1 },
	]);
});

test("findCounts reads the description sentence", () => {
	assert.deepEqual(
		findCounts('"description": "146 UI components for Svelte 5"').map((c) => c.value),
		[146]
	);
});

test("checkText reports mismatches only", () => {
	assert.deepEqual(checkText("x.md", "**5 components**", 5), []);
	assert.equal(checkText("x.md", "**5 components**\nbadge/Components-4-x", 5).length, 1);
});

test("registrySize parses the real registry", () => {
	assert.ok(registrySize() > 100);
});
