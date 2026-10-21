/**
 * Unit tests for the pure helpers of the performance protocol.
 *
 *   node --test scripts/perf/
 */

import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import {
	classifyAsset,
	compressedSizes,
	deltaMetrics,
	markdownTable,
	measureAssets,
	median,
	parseKeptScratch,
	proposeBudget,
} from "./lib.mjs";

test("compressedSizes reports raw, gzip and brotli bytes", () => {
	const text = Buffer.from("fancy-ui ".repeat(500));
	const s = compressedSizes(text);
	assert.equal(s.raw, text.length);
	assert.ok(s.gzip > 0 && s.gzip < s.raw);
	assert.ok(s.brotli > 0 && s.brotli <= s.gzip);
});

test("classifyAsset sorts JS and CSS and ignores the rest", () => {
	assert.equal(classifyAsset("index-abc.js"), "js");
	assert.equal(classifyAsset("chunk.mjs"), "js");
	assert.equal(classifyAsset("app.css"), "css");
	assert.equal(classifyAsset("index.js.map"), null);
	assert.equal(classifyAsset("font.woff2"), null);
	assert.equal(classifyAsset("index.html"), null);
});

test("measureAssets walks a folder and totals JS and CSS separately", () => {
	const dir = mkdtempSync(join(tmpdir(), "perf-assets-"));
	try {
		mkdirSync(join(dir, "assets", "nested"), { recursive: true });
		writeFileSync(join(dir, "assets", "a.js"), "export const a = 1;\n".repeat(100));
		writeFileSync(join(dir, "assets", "nested", "b.js"), "export const b = 2;\n".repeat(100));
		writeFileSync(join(dir, "assets", "a.css"), ".x{color:red}\n".repeat(100));
		writeFileSync(join(dir, "assets", "a.js.map"), "{}");
		writeFileSync(join(dir, "index.html"), "<html></html>");
		const m = measureAssets(dir);
		assert.equal(m.js.files, 2);
		assert.equal(m.css.files, 1);
		assert.equal(m.js.raw, 2 * "export const a = 1;\n".length * 100);
		assert.ok(m.js.gzip < m.js.raw);
		assert.equal(m.total.files, 3);
		assert.equal(m.total.raw, m.js.raw + m.css.raw);
	} finally {
		rmSync(dir, { recursive: true, force: true });
	}
});

test("parseKeptScratch finds the folder KEEP_CONSUMER=1 printed", () => {
	const out =
		"consumer: KEEP_CONSUMER=1, scratch kept at /tmp/x/fancy-ui-consumer-next.AbC123\nconsumer: next -> ...";
	assert.equal(parseKeptScratch(out), "/tmp/x/fancy-ui-consumer-next.AbC123");
	assert.equal(parseKeptScratch("nothing here"), null);
});

test("median handles odd, even and empty input", () => {
	assert.equal(median([3, 1, 2]), 2);
	assert.equal(median([4, 1, 3, 2]), 2.5);
	assert.ok(Number.isNaN(median([])));
});

test("deltaMetrics turns two CDP metric samples into per-second rates", () => {
	const before = {
		TaskDuration: 1,
		ScriptDuration: 0.5,
		JSHeapUsedSize: 1000,
		JSEventListeners: 10,
		Nodes: 100,
	};
	const after = {
		TaskDuration: 1.5,
		ScriptDuration: 0.7,
		JSHeapUsedSize: 3000,
		JSEventListeners: 14,
		Nodes: 160,
	};
	const d = deltaMetrics(before, after, 2000);
	assert.equal(d.cpuMsPerSec, 250);
	assert.equal(Math.round(d.scriptMsPerSec), 100);
	assert.equal(d.heapDeltaBytes, 2000);
	assert.equal(d.listenersDelta, 4);
	assert.equal(d.nodesDelta, 60);
});

test("markdownTable aligns columns and rejects ragged rows", () => {
	const t = markdownTable(
		["a", "bb"],
		[
			["1", "2"],
			["333", "4"],
		]
	);
	assert.equal(t.split("\n").length, 4);
	assert.match(t, /^\| a {2} \| bb \|$/m);
	assert.throws(() => markdownTable(["a"], [["1", "2"]]));
});

test("proposeBudget adds headroom and rounds up to a readable step", () => {
	assert.equal(proposeBudget(1000, 0.25, 100), 1300);
	assert.equal(proposeBudget(0, 0.25, 100), 0);
	assert.equal(proposeBudget(7.2, 0.5, 1), 11);
});
