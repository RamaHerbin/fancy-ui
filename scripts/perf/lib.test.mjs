/**
 * Unit tests for the pure helpers of the performance protocol.
 *
 *   node --test scripts/perf/
 */

import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import v8 from "node:v8";
import vm from "node:vm";

import {
	classifyAsset,
	compressedSizes,
	deltaMetrics,
	markdownTable,
	measureAssets,
	median,
	assertSmokePassed,
	parseKeptScratch,
	loadVerdict,
	proposeBudget,
	recordedSettings,
	runRows,
	stampRun,
	backfillMark,
	groupLoad,
	waitForQuiet,
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

test("recordedSettings reads repetitions and cycles from the stored results", () => {
	const effects = [{ rows: [{ reps: 5 }, { reps: 5 }] }];
	const lifecycle = [{ rows: [{ cycles: 50 }] }];
	assert.deepEqual(recordedSettings(effects, lifecycle), { reps: "5", cycles: "50" });
	assert.deepEqual(recordedSettings([], []), { reps: "n/a", cycles: "n/a" });
	const mixed = [{ rows: [{ reps: 3 }] }, { rows: [{ reps: 5 }] }];
	assert.equal(recordedSettings(mixed, []).reps, "3, 5");
});

test("assertSmokePassed refuses a size for a broken consumer", () => {
	assert.doesNotThrow(() => assertSmokePassed("next", { status: 0 }));
	assert.throws(() => assertSmokePassed("next", { status: 1 }), /next.*smoke.*1/i);
	assert.throws(() => assertSmokePassed("next", { status: null }), /smoke/i);
});

test("the observer probe does not keep disconnected observers alive", async () => {
	v8.setFlagsFromString("--expose-gc");
	const gc = vm.runInNewContext("gc");
	class Fake {
		constructor(cb) {
			this.cb = cb;
		}
		observe() {}
		unobserve() {}
		disconnect() {}
	}
	const win = {
		requestAnimationFrame: () => 0,
		setInterval: () => 0,
		clearInterval: () => {},
		setTimeout: () => 0,
		ResizeObserver: Fake,
		IntersectionObserver: Fake,
		MutationObserver: Fake,
		PerformanceObserver: class {
			observe() {}
		},
		HTMLCanvasElement: { prototype: { getContext() {} } },
		EventTarget: { prototype: { addEventListener() {}, removeEventListener() {} } },
		document: {},
		console: { warn() {} },
	};
	win.window = win;
	const ctx = vm.createContext({ ...win, window: win, WeakRef, WeakMap, Set, Math });
	// the script reads these as globals and through `window`
	Object.assign(ctx, win, { window: win });
	// PERF_INSTRUMENT points the test at another copy of the probe (used to record the red run)
	const probe = process.env.PERF_INSTRUMENT ?? new URL("./harness/instrument.js", import.meta.url);
	vm.runInContext(readFileSync(probe, "utf8"), ctx);
	const weak = [];
	const mount = () => {
		const heavy = { payload: new Array(1000).fill(1) };
		weak.push(new WeakRef(heavy));
		const o = new win.ResizeObserver(() => heavy);
		o.observe({});
		o.disconnect();
	};
	for (let i = 0; i < 5; i++) mount();
	for (let i = 0; i < 4; i++) {
		await new Promise((r) => setImmediate(r));
		gc();
	}
	assert.equal(weak.filter((w) => w.deref()).length, 0, "callbacks stay reachable");
	assert.equal(win.__probe.snapshot().liveObservers, 0);
});

test("loadVerdict calls a machine quiet only below half a core of load per core", () => {
	assert.equal(loadVerdict(5.5, 14), "quiet");
	assert.equal(loadVerdict(7, 14), "loaded");
	assert.equal(loadVerdict(22.6, 14), "loaded");
	assert.equal(loadVerdict(undefined, 14), "unrecorded");
	assert.equal(loadVerdict(1, undefined), "unrecorded");
});

test("loadVerdict takes the worst of the 1- and 5-minute loads", () => {
	assert.equal(loadVerdict([6.8, 8.2, 14.3], 14), "loaded");
	assert.equal(loadVerdict([2, 3, 4], 14), "quiet");
	assert.equal(loadVerdict([], 14), "unrecorded");
});

test("loadVerdict ignores the 15-minute load, which includes the tool's own builds", () => {
	assert.equal(loadVerdict([1, 1, 9], 14), "quiet");
	assert.equal(loadVerdict([2, 3, 25], 14), "quiet");
	assert.equal(loadVerdict([1, 7, 1], 14), "loaded");
	assert.equal(loadVerdict([7, 1, 1], 14), "loaded");
	assert.equal(loadVerdict([1, Number.NaN, 1], 14), "unrecorded");
});

/** A fake clock plus a fake loadavg that reads from a script, one reading per poll. */
function fakeEnv(readings) {
	let t = 0;
	let i = 0;
	const polls = [];
	return {
		polls,
		get clock() {
			return t;
		},
		opts: {
			cores: 10,
			loadavg: () => {
				const r = readings[Math.min(i, readings.length - 1)];
				i += 1;
				polls.push(r);
				return r;
			},
			sleep: async (ms) => {
				t += ms;
			},
			now: () => t,
		},
	};
}

test("waitForQuiet returns at once when the 1-minute load per core is already under the threshold", async () => {
	const env = fakeEnv([[4.9, 9, 9]]);
	const r = await waitForQuiet(env.opts);
	assert.deepEqual(r, { quiet: true, waitedMs: 0, load1: 4.9, polls: 1 });
	assert.equal(env.clock, 0);
});

test("waitForQuiet polls until the load drops, and reports how long it waited", async () => {
	const env = fakeEnv([
		[8, 8, 8],
		[6, 8, 8],
		[5, 7, 8],
		[3, 6, 8],
	]);
	const r = await waitForQuiet({ ...env.opts, pollMs: 1000 });
	assert.deepEqual(r, { quiet: true, waitedMs: 3000, load1: 3, polls: 4 });
});

test("waitForQuiet gives up at the timeout and says it was not quiet", async () => {
	const env = fakeEnv([[9, 9, 9]]);
	const r = await waitForQuiet({ ...env.opts, pollMs: 1000, timeoutMs: 5000 });
	assert.equal(r.quiet, false);
	assert.equal(r.waitedMs, 5000);
	assert.equal(r.load1, 9);
});

test("waitForQuiet uses the 1-minute load only, against the given threshold", async () => {
	const env = fakeEnv([[2, 50, 50]]);
	assert.equal((await waitForQuiet({ ...env.opts, threshold: 0.3 })).quiet, true);
	const env2 = fakeEnv([[3, 0, 0]]);
	assert.equal((await waitForQuiet({ ...env2.opts, threshold: 0.3, timeoutMs: 0 })).quiet, false);
});

test("runRows labels a section loaded when its quiet wait timed out, whatever the load at its end", () => {
	const base = {
		measuredCommit: "lib1",
		toolCommit: "tool1",
		cores: 14,
		loadAvgAtEnd: [1, 1, 1],
	};
	const rows = runRows({
		effects: [
			{
				framework: "svelte",
				rows: [],
				run: { ...base, quietWait: { quiet: true, waitedMs: 5000, load1: 4.2 } },
			},
			{
				framework: "react",
				rows: [],
				run: { ...base, quietWait: { quiet: false, waitedMs: 600000, load1: 9 } },
			},
		],
		lifecycle: [],
	});
	const byName = Object.fromEntries(rows.map((r) => [r[0], r]));
	assert.equal(byName["effects (svelte)"][4], "quiet");
	assert.equal(byName["effects (react)"][4], "loaded");
	assert.equal(byName["effects (svelte)"][5], "quiet after 5 s, 1-minute load 4.2");
	assert.equal(byName["effects (react)"][5], "timed out after 600 s, 1-minute load 9.0");
});

test("backfillMark and groupLoad", () => {
	assert.equal(backfillMark("x", { backfilled: true }), "x (backfilled)");
	assert.equal(backfillMark("x", { backfilled: false }), "x");
	assert.equal(backfillMark("x", undefined), "x");
	assert.deepEqual(
		groupLoad({ loadAvgAtEnd: [1, 2, 3], run: { loadAvgAtEnd: [9, 9, 9] } }),
		[1, 2, 3]
	);
	assert.deepEqual(groupLoad({ run: { loadAvgAtEnd: [4, 5, 6] } }), [4, 5, 6]);
	assert.equal(groupLoad({}), undefined);
});

test("runRows marks a backfilled record on the library commit and the tool commit", () => {
	const rows = runRows({
		sizes: { rows: [], run: { measuredCommit: "a", toolCommit: "b", cores: 14, backfilled: true } },
	});
	assert.deepEqual(rows[0].slice(1, 3), ["a (backfilled)", "b (backfilled)"]);
});

test("stampRun fills a missing run record and never overwrites a recorded one", () => {
	const run = { measuredCommit: "aaa", toolCommit: "bbb", cores: 14 };
	const object = stampRun({ rows: [] }, run);
	assert.deepEqual(object.run, run);
	const list = stampRun([{ rows: [] }, { rows: [], run: { measuredCommit: "zzz" } }], run);
	assert.deepEqual(list[0].run, run);
	assert.equal(list[1].run.measuredCommit, "zzz");
});

test("runRows prints each section's own commits and load, and labels the loaded ones", () => {
	const run = (load, c = "lib1") => ({
		measuredCommit: c,
		toolCommit: "tool1",
		cores: 14,
		loadAvgAtEnd: load,
	});
	const rows = runRows({
		sizes: { rows: [], run: run([2, 3, 4]) },
		imports: [{ pkg: "p", run: run([1, 1, 1]) }],
		effects: [
			{
				framework: "svelte",
				loadAvgAtEnd: [8.2, 16.6, 25.4],
				run: { ...run(undefined), cores: 14 },
			},
			{ framework: "react", run: run([22.6, 17.6, 22.5]) },
		],
		lifecycle: [{ framework: "svelte", run: run([2.5, 3.4, 4.1]) }],
	});
	const byName = Object.fromEntries(rows.map((r) => [r[0], r]));
	assert.deepEqual(byName.sizes.slice(1), ["lib1", "tool1", "2.0 / 3.0 / 4.0", "quiet", "not run"]);
	assert.equal(byName["effects (svelte)"][3], "8.2 / 16.6 / 25.4");
	assert.equal(byName["effects (svelte)"][4], "loaded");
	assert.equal(byName["effects (react)"][4], "loaded");
	assert.equal(byName["lifecycle (svelte)"][4], "quiet");
});
