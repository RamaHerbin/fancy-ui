#!/usr/bin/env node
/**
 * Performance sweep, rubric axis A4, over the Svelte parity stage.
 *
 * Same method as scripts/perf/measure.mjs (Chrome DevTools Protocol
 * `Performance.getMetrics` deltas, a `longtask` observer, a requestAnimationFrame
 * counter), pointed at `<base-svelte>/_parity/<slug>?theme=dark` so any component
 * can be measured, not only the five in the harness. For each slug it takes
 * `--reps` fresh page loads, each with a 5 s idle window and a 5 s window with the
 * pointer sweeping the stage, and reports the median of:
 *
 *   rafPerSec, cpuMsPerSec (CDP TaskDuration), scriptMsPerSec, layoutMsPerSec,
 *   styleMsPerSec, longTasks, longTaskMs, p95FrameMs, heapDeltaKB
 *
 * Then one page is reloaded `--reloads` times and listeners / DOM nodes / heap /
 * documents are sampled after garbage collection (a lifecycle leak signal).
 * `loadAvgAtStart` and the core count are recorded per slug: a reading taken on a
 * busy machine is indicative only and must not be scored 0.
 *
 * Usage:
 *   node scripts/audit/perf-sweep.mjs [--repo <dir>] [--out <dir>] [--inventory <file>]
 *            [--only slug,slug] [--shard i/n] [--reps 3] [--reloads 20]
 *            [--base-svelte <url>] [--self-test]
 *
 *   --only    comma list; slugs are measured one at a time, never in parallel
 *   --shard   i/n: take every n-th slug starting at i (to split a run across shells)
 *   --reps    page loads per slug (default 3)
 *   --reloads reload count of the lifecycle probe (default 20)
 *
 * Writes components/<slug>/evidence/perf.json and, without --only,
 * logs/perf-sweep-shard-<i>of<n>.json.
 *
 * What this does NOT catch: GPU or shader cost (software rendering, main thread
 * only), offscreen pausing (the parity route never scrolls the component out of
 * view), and anything that depends on a real device. Run it on a quiet machine
 * and read the `loadAvgAtStart` before trusting a number.
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import { join } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { isMain, loadInventory, parseArgs, parseList, resolvePaths } from "./lib.mjs";

const SW_GL = ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"];

/** Page-side probe: counts rAF calls, records frame times and long tasks. */
const PROBE = () => {
	const p = { raf: 0, frames: [], longTasks: [] };
	const native = window.requestAnimationFrame.bind(window);
	window.requestAnimationFrame = (cb) => {
		p.raf += 1;
		return native((t) => {
			if (p.frames.length < 4000) p.frames.push(performance.now());
			cb(t);
		});
	};
	try {
		new PerformanceObserver((l) => {
			for (const e of l.getEntries()) p.longTasks.push(e.duration);
		}).observe({ type: "longtask", buffered: true });
	} catch {
		/* longtask unsupported */
	}
	window.__p = p;
};

/** Median of a number list (null when empty). */
export function median(a) {
	const s = [...a].sort((x, y) => x - y);
	const n = s.length;
	return n ? (n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2) : null;
}

/** Median of each key across run objects, rounded to 2 decimals; nulls skipped. */
export function agg(arr) {
	return Object.fromEntries(
		Object.keys(arr[0]).map((k) => {
			const v = arr.map((x) => x[k]).filter((x) => x !== null);
			return [k, v.length ? Math.round(median(v) * 100) / 100 : null];
		})
	);
}

/**
 * CDP gives seconds-valued counters; turn two snapshots into ms per second.
 *
 * @param {Record<string, number>} m0
 * @param {Record<string, number>} m1
 * @param {number} elapsedMs
 */
export function rates(m0, m1, elapsedMs) {
	const d = (k) => ((m1[k] - m0[k]) * 1000) / (elapsedMs / 1000);
	return {
		cpuMsPerSec: d("TaskDuration"),
		cpuSumMsPerSec:
			d("ScriptDuration") + d("LayoutDuration") + d("RecalcStyleDuration") + d("TaskDuration"),
		scriptMsPerSec: d("ScriptDuration"),
		layoutMsPerSec: d("LayoutDuration"),
		styleMsPerSec: d("RecalcStyleDuration"),
	};
}

/** p95 of the gaps between frame timestamps (null under 5 gaps). */
export function p95FrameMs(frameTimes) {
	const ints = frameTimes
		.slice(1)
		.map((t, i) => t - frameTimes[i])
		.sort((a, b) => a - b);
	return ints.length >= 5 ? ints[Math.min(ints.length - 1, Math.floor(ints.length * 0.95))] : null;
}

/** `i/n` -> [i, n]; rejects anything else. */
export function parseShard(s) {
	const m = /^(\d+)\/(\d+)$/.exec(s ?? "0/1");
	if (!m || Number(m[2]) < 1 || Number(m[1]) >= Number(m[2])) throw new Error(`bad --shard ${s}`);
	return [Number(m[1]), Number(m[2])];
}

/** Slugs this run measures: the `--only` list (inventory order) else all, then the shard. */
export function pickTargets(slugs, only, shard) {
	const [i, n] = shard;
	return slugs.filter((s) => !only || only.has(s)).filter((_, k) => k % n === i);
}

const metrics = async (cdp) =>
	Object.fromEntries(
		(await cdp.send("Performance.getMetrics")).metrics.map((m) => [m.name, m.value])
	);
const gc = async (cdp) => {
	for (let i = 0; i < 3; i++) {
		await cdp.send("HeapProfiler.collectGarbage");
		await sleep(80);
	}
};

async function windowRun(page, cdp, ms, sweep) {
	const box = await page.evaluate(() => {
		const r = document.querySelector("[data-parity-stage]")?.getBoundingClientRect();
		return r ? { x: r.x, y: r.y, w: r.width, h: r.height } : null;
	});
	const s0 = await page.evaluate(() => ({
		raf: window.__p.raf,
		f: window.__p.frames.length,
		lt: window.__p.longTasks.length,
	}));
	await gc(cdp);
	const m0 = await metrics(cdp);
	const t0 = Date.now();
	if (sweep && box) {
		const cx = box.x + box.w / 2;
		const cy = box.y + box.h / 2;
		while (Date.now() - t0 < ms) {
			const a = (Date.now() - t0) / 250;
			await page.mouse.move(cx + Math.cos(a) * box.w * 0.3, cy + Math.sin(a * 1.3) * box.h * 0.3);
			await sleep(16);
		}
	} else await sleep(ms);
	const el = Date.now() - t0;
	const m1 = await metrics(cdp);
	const s1 = await page.evaluate(() => ({
		raf: window.__p.raf,
		f: window.__p.frames.slice(),
		lt: window.__p.longTasks.slice(),
	}));
	const lt = s1.lt.slice(s0.lt);
	return {
		rafPerSec: ((s1.raf - s0.raf) * 1000) / el,
		...rates(m0, m1, el),
		longTasks: lt.length,
		longTaskMs: lt.reduce((a, b) => a + b, 0),
		p95FrameMs: p95FrameMs(s1.f.slice(s0.f)),
		heapDeltaKB: (m1.JSHeapUsedSize - m0.JSHeapUsedSize) / 1024,
	};
}

async function open(browser, base, slug) {
	const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
	const page = await ctx.newPage();
	await page.addInitScript(PROBE);
	const errors = [];
	page.on("pageerror", (e) => errors.push(String(e).slice(0, 120)));
	await page.goto(`${base}/_parity/${slug}?theme=dark`, { waitUntil: "load" });
	await page.waitForSelector("[data-parity-stage]", { timeout: 15000 }).catch(() => {});
	const cdp = await ctx.newCDPSession(page);
	await cdp.send("Performance.enable");
	await cdp.send("HeapProfiler.enable");
	return { ctx, page, cdp, errors };
}

async function measure(browser, base, slug, REPS, RELOADS) {
	const idle = [];
	const active = [];
	let errs = [];
	for (let r = 0; r < REPS; r++) {
		const { ctx, page, cdp, errors } = await open(browser, base, slug);
		await sleep(1500);
		idle.push(await windowRun(page, cdp, 5000, false));
		active.push(await windowRun(page, cdp, 5000, true));
		errs = errs.concat(errors);
		await ctx.close();
	}
	// lifecycle: reload N times on one page, sample after GC
	const { ctx, page, cdp } = await open(browser, base, slug);
	const samples = [];
	for (let i = 1; i <= RELOADS; i++) {
		if (i > 1) {
			await page.reload({ waitUntil: "load" });
			await page.waitForSelector("[data-parity-stage]", { timeout: 15000 }).catch(() => {});
		}
		await sleep(400);
		if (i === 1 || i === 5 || i === 10 || i === 15 || i === RELOADS) {
			await gc(cdp);
			const m = await metrics(cdp);
			samples.push({
				reload: i,
				listeners: m.JSEventListeners,
				nodes: m.Nodes,
				heapKB: Math.round(m.JSHeapUsedSize / 1024),
				docs: m.Documents,
			});
		}
	}
	await ctx.close();
	const f = samples[0];
	const l = samples.at(-1);
	return {
		idle: agg(idle),
		active: agg(active),
		reps: REPS,
		pageErrors: [...new Set(errs)].slice(0, 3),
		lifecycle: {
			reloads: RELOADS,
			samples,
			listenersDelta: l.listeners - f.listeners,
			nodesDelta: l.nodes - f.nodes,
			heapDeltaKB: l.heapKB - f.heapKB,
			documentsDelta: l.docs - f.docs,
		},
	};
}

export function selfTest() {
	const fail = (m) => {
		console.error(`perf-sweep self-test FAILED: ${m}`);
		process.exit(1);
	};
	if (median([3, 1, 2]) !== 2 || median([1, 2, 3, 4]) !== 2.5 || median([]) !== null)
		fail("median");
	const a = agg([
		{ x: 1, y: null },
		{ x: 3, y: null },
		{ x: 2, y: null },
	]);
	if (a.x !== 2 || a.y !== null) fail("agg");
	const r = rates(
		{ TaskDuration: 1, ScriptDuration: 0, LayoutDuration: 0, RecalcStyleDuration: 0 },
		{ TaskDuration: 1.5, ScriptDuration: 0.25, LayoutDuration: 0, RecalcStyleDuration: 0 },
		5000
	);
	// 0.5 s of task time over 5 s = 100 ms per second
	if (Math.abs(r.cpuMsPerSec - 100) > 1e-9 || Math.abs(r.scriptMsPerSec - 50) > 1e-9) fail("rates");
	if (p95FrameMs([0, 16, 32]) !== null) fail("p95 needs 5 gaps");
	const ft = Array.from({ length: 21 }, (_, i) => i * 16);
	if (p95FrameMs(ft) !== 16) fail("p95 steady");
	if (parseShard("1/3").join() !== "1,3") fail("parseShard");
	let threw = false;
	try {
		parseShard("3/3");
	} catch {
		threw = true;
	}
	if (!threw) fail("parseShard range");
	const slugs = ["a", "b", "c", "d"];
	if (pickTargets(slugs, parseList("b,d"), [0, 1]).join() !== "b,d") fail("pickTargets only");
	if (pickTargets(slugs, null, [1, 2]).join() !== "b,d") fail("pickTargets shard");
	console.log("perf-sweep self-test ok");
}

async function main() {
	const { opts, flags } = parseArgs(process.argv.slice(2), ["self-test"]);
	if (flags.has("self-test")) return selfTest();
	const paths = resolvePaths(opts);
	const REPS = Number(opts.reps ?? 3);
	const RELOADS = Number(opts.reloads ?? 20);
	const shard = parseShard(opts.shard);
	const only = parseList(opts.only);
	const slugs = loadInventory(paths.inventory).map((i) => i.slug);
	const mine = pickTargets(slugs, only, shard);
	const { chromium } = await import("@playwright/test");
	mkdirSync(join(paths.out, "logs"), { recursive: true });
	const browser = await chromium.launch({ args: SW_GL });
	const version = browser.version();
	const results = {};
	const t0 = Date.now();
	for (const slug of mine) {
		const load = os.loadavg();
		const t = Date.now();
		try {
			const r = await measure(browser, paths.bases.svelte, slug, REPS, RELOADS);
			const rec = {
				slug,
				...r,
				loadAvgAtStart: load.map((x) => Math.round(x * 100) / 100),
				cores: os.cpus().length,
				chromium: version,
				swiftshader: true,
				offscreenPause:
					"not testable on the parity route (no scroll); see the IO evidence in static.txt",
				at: new Date().toISOString(),
			};
			results[slug] = rec;
			const dir = join(paths.out, "components", slug, "evidence");
			mkdirSync(dir, { recursive: true });
			writeFileSync(join(dir, "perf.json"), JSON.stringify(rec, null, 2) + "\n");
			console.log(
				`${slug}: idle ${rec.idle.cpuMsPerSec} ms/s raf ${rec.idle.rafPerSec} lt ${rec.idle.longTasks} | ${((Date.now() - t) / 1000).toFixed(0)}s`
			);
		} catch (e) {
			results[slug] = { slug, error: String(e).slice(0, 300) };
			console.log(`${slug}: ERROR ${String(e).slice(0, 120)}`);
		}
	}
	await browser.close();
	if (!only)
		writeFileSync(
			join(paths.out, "logs", `perf-sweep-shard-${shard[0]}of${shard[1]}.json`),
			JSON.stringify(results, null, 2)
		);
	console.log(`done ${mine.length} in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
}

if (isMain(process.argv[1], import.meta.url)) {
	main().catch((e) => {
		console.error(e);
		process.exit(1);
	});
}
