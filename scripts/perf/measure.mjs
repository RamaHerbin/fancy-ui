#!/usr/bin/env node
// Performance protocol for the three packages. See scripts/perf/README.md.
//
//   node scripts/perf/measure.mjs <section> [--out DIR] [--reps N] [--port N] [--only svelte|react|vue] [--component NAME] [--cycles N] [--wait-quiet on|off]
//                                 [--base-svelte URL] [--base-react URL] [--base-vue URL]   (effects, parity route)
//
// Sections, in the order `all` runs them:
//   sizes      JS/CSS weight of each consumer app built from the packed tarball
//   imports    barrel vs deep import cost, 5 components per package
//   effects    rAF/s, long tasks, CPU ms/s of 5 effects, idle / moving / offscreen / hidden
//              (Chromium, CDP metrics + tracing). `--component <slug>` with a slug outside
//              the 5 measures that component on the parity route instead (no `sizes` needed)
//   lifecycle  mount/unmount x50 and 10 simultaneous instances (contexts, listeners, heap)
//   stamp      backfills the run record of stored sections (--measured-commit, --tool-commit)
//   report     renders scripts/perf/BASELINE-<date>.md from the JSON the others wrote
//
// Every section writes <out>/<section>.json; raw traces go to <out>/traces/.
import { spawn, spawnSync } from "node:child_process";
import {
	cpSync,
	existsSync,
	mkdirSync,
	readFileSync,
	readdirSync,
	rmSync,
	statSync,
	writeFileSync,
} from "node:fs";
import os from "node:os";
import { dirname, join, resolve } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { fileURLToPath } from "node:url";

import {
	deltaMetrics,
	kb,
	markdownTable,
	measureAssets,
	median,
	parseKeptScratch,
	backfillMark,
	groupVerdict,
	QUIET_LOAD_PER_CORE,
	waitForQuiet,
	proposeBudget,
	runRows,
	stampRun,
	assertSmokePassed,
	recordedSettings,
} from "./lib.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(here, "../..");

// ---------------------------------------------------------------- arguments

const args = process.argv.slice(2);
const section = args[0] && !args[0].startsWith("--") ? args[0] : "help";
const opt = (name, fallback) => {
	const i = args.indexOf(`--${name}`);
	return i >= 0 ? args[i + 1] : fallback;
};
const OUT = resolve(opt("out", process.env.PERF_OUT ?? join(os.tmpdir(), "fancy-ui-perf")));
const REPS = Number(opt("reps", 3));
const BASE_PORT = Number(opt("port", 5355));
const ONLY = opt("only", "");
const COMPONENT = opt("component", "");
const CYCLES = Number(opt("cycles", 50));
// Stage servers of the parity bench (scripts/parity/capture.mjs), for `effects --component <slug>`.
const PARITY_BASE = {
	svelte: opt("base-svelte", "http://localhost:5291").replace(/\/$/, ""),
	react: opt("base-react", "http://localhost:5292").replace(/\/$/, ""),
	vue: opt("base-vue", "http://localhost:5293").replace(/\/$/, ""),
};
const DATE = opt("date", "2026-10-21");

mkdirSync(OUT, { recursive: true });
const jsonPath = (name) => join(OUT, `${name}.json`);
const save = (name, data) => writeFileSync(jsonPath(name), `${JSON.stringify(data, null, 2)}\n`);
const load = (name) => {
	if (!existsSync(jsonPath(name)))
		throw new Error(`run \`${name}\` first (missing ${jsonPath(name)})`);
	return JSON.parse(readFileSync(jsonPath(name), "utf8"));
};

// --------------------------------------------------------------- run record

/**
 * What a section stores about the run that produced it, so `report` prints it
 * back instead of reading the machine it happens to run on.
 *   measuredCommit  the library: HEAD, "+dirty" when files outside scripts/perf changed
 *   toolCommit      the tool: last commit touching scripts/perf, "+dirty" when it has edits
 * `--measured-commit` and `--tool-commit` override them (used by `stamp`).
 */
function runInfo() {
	const git = (...argv) => sh("git", argv, { cwd: ROOT }).stdout.trim();
	const dirty = (...paths) => git("status", "--porcelain", "--", ...paths).length > 0;
	const pkgVersion = (p) => JSON.parse(readFileSync(join(ROOT, p, "package.json"), "utf8")).version;
	const cpus = os.cpus();
	const head = git("rev-parse", "--short", "HEAD");
	return {
		measuredCommit: opt(
			"measured-commit",
			`${head}${dirty(".", ":!scripts/perf") ? "+dirty" : ""}`
		),
		toolCommit: opt(
			"tool-commit",
			`${git("log", "-1", "--format=%h", "--", "scripts/perf")}${dirty("scripts/perf") ? "+dirty" : ""}`
		),
		loadAvgAtEnd: os.loadavg(),
		cores: cpus.length,
		machine: `${cpus[0].model.trim()}, ${cpus.length} cores, ${Math.round(os.totalmem() / 2 ** 30)} GB`,
		os: `${os.type()} ${os.release()}`,
		node: process.version,
		versions: {
			"fancy-ui-svelte": JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")).version,
			"fancy-ui-react": pkgVersion("react"),
			"fancy-ui-vue": pkgVersion("vue"),
		},
	};
}

/**
 * Wait for a quiet machine before a group is measured (after its harness is
 * built, so the tool's own build is not what it waits on). On by default for
 * `effects` and `lifecycle`; `--wait-quiet off` (or `--no-wait-quiet`) skips
 * it, `--wait-quiet on` turns it on for any other section. On timeout it
 * proceeds and the group is labelled loaded. Returns the outcome, or
 * undefined when the wait is off.
 */
async function quietGate(sectionName) {
	const flag = opt("wait-quiet", "");
	const enabled = args.includes("--no-wait-quiet")
		? false
		: flag
			? flag !== "off"
			: sectionName === "effects" || sectionName === "lifecycle";
	if (!enabled) return undefined;
	const result = await waitForQuiet({
		loadavg: os.loadavg,
		cores: os.cpus().length,
		threshold: Number(opt("quiet-threshold", QUIET_LOAD_PER_CORE)),
		timeoutMs: Number(opt("quiet-timeout-min", 10)) * 60 * 1000,
		sleep,
		log: (line) => console.log(`  ${line}`),
	});
	console.log(
		result.quiet
			? `  quiet after ${(result.waitedMs / 1000).toFixed(0)} s (1-minute load ${result.load1.toFixed(2)})`
			: `  still loaded after ${(result.waitedMs / 1000).toFixed(0)} s (1-minute load ${result.load1.toFixed(2)}): measuring anyway, labelled loaded`
	);
	return result;
}

/** The run record of a group, with the outcome of its quiet wait when there was one. */
const runWithWait = (quietWait) => ({
	...runInfo(),
	...(quietWait ? { quietWait } : {}),
});

// Backfill: give stored sections that predate the run record one, without
// touching a record that is already there.
//   node scripts/perf/measure.mjs stamp --measured-commit 17b78315 --tool-commit 901879eb
function runStamp() {
	const measured = opt("measured-commit", "");
	const tool = opt("tool-commit", "");
	if (!measured || !tool) throw new Error("stamp needs --measured-commit and --tool-commit");
	// The load at stamp time says nothing about the run: leave it out. Effects
	// and lifecycle groups keep the `loadAvgAtEnd` they stored themselves.
	const { loadAvgAtEnd: _now, ...run } = runInfo();
	for (const name of ["sizes", "imports", "effects", "lifecycle"]) {
		if (!existsSync(jsonPath(name))) continue;
		save(name, stampRun(load(name), { ...run, backfilled: true }));
	}
}

// ---------------------------------------------------------------- consumers

const CONSUMERS = [
	{ name: "sveltekit", pkg: "fancy-ui-svelte", dist: ".svelte-kit/output/client" },
	{ name: "svelte-vite", pkg: "fancy-ui-svelte", dist: "dist" },
	{ name: "react-vite", pkg: "fancy-ui-react", dist: "dist" },
	{ name: "next", pkg: "fancy-ui-react", dist: ".next/static" },
	{ name: "vue-vite", pkg: "fancy-ui-vue", dist: "dist" },
	{ name: "nuxt", pkg: "fancy-ui-vue", dist: ".output/public/_nuxt" },
];

function sh(cmd, argv, options = {}) {
	const r = spawnSync(cmd, argv, { encoding: "utf8", maxBuffer: 1 << 28, ...options });
	if (r.status !== 0 && !options.allowFail) {
		throw new Error(
			`${cmd} ${argv.join(" ")} failed (${r.status})\n${(r.stdout ?? "").slice(-2000)}\n${(r.stderr ?? "").slice(-2000)}`
		);
	}
	return r;
}

function runSizes() {
	const packs = join(OUT, "packs");
	rmSync(packs, { recursive: true, force: true });
	mkdirSync(packs, { recursive: true });
	const state = { consumers: {}, tarballs: {} };
	const rows = [];
	for (const c of CONSUMERS) {
		if (ONLY && !c.pkg.endsWith(ONLY)) continue;
		console.log(`\n=== sizes: ${c.name} ===`);
		const t0 = Date.now();
		const r = sh("bash", [join(ROOT, "scripts/consumers", `${c.name}.sh`)], {
			env: { ...process.env, KEEP_CONSUMER: "1", CONSUMER_PACKS_DIR: packs },
			allowFail: true,
		});
		process.stdout.write((r.stdout ?? "").split("\n").slice(-6).join("\n"));
		assertSmokePassed(c.name, r);
		const scratch = parseKeptScratch(`${r.stdout}\n${r.stderr}`);
		if (!scratch) throw new Error(`${c.name}: no kept scratch folder in the output`);
		const app = join(scratch, "app");
		const distDir = join(app, c.dist);
		if (!existsSync(distDir)) throw new Error(`${c.name}: build output ${distDir} not found`);
		state.consumers[c.name] = { scratch, app, distDir, smokeExit: r.status, pkg: c.pkg };
		const m = measureAssets(distDir);
		rows.push({ name: c.name, pkg: c.pkg, seconds: Math.round((Date.now() - t0) / 1000), ...m });
	}
	for (const f of readdirSync(packs)) {
		state.tarballs[f] = statSync(join(packs, f)).size;
	}
	save("sizes", { rows, tarballs: state.tarballs, run: runInfo() });
	save("state", state);
}

// ----------------------------------------------------------------- imports

const IMPORT_COMPONENTS = [
	{ name: "Button", dir: "button" },
	{ name: "Dialog", dir: "dialog" },
	{ name: "Select", dir: "select" },
	{ name: "BorderBeam", dir: "border-beam" },
	{ name: "Toaster", dir: "toast" },
];
const ENTRY = {
	"svelte-vite": "src/main.js",
	"react-vite": "src/main.tsx",
	"vue-vite": "src/main.ts",
};

// The component's own file in the packed dist. The packages export no
// per-component subpath, so the probe imports it by absolute path.
// Svelte: <dir>/index.js (named export); React: <dir>/<Name>.js (named);
// Vue: <dir>/<Name>.vue.js (default export of the compiled component).
function deepImport(app, pkg, comp) {
	const base = join(app, "node_modules", pkg, "dist");
	const candidates = [
		[`fancy-ui/${comp.dir}/index.js`, "named"],
		[`components/${comp.dir}/${comp.name}.js`, "named"],
		[`components/${comp.dir}/${comp.name}.vue.js`, "default"],
	];
	for (const [rel, kind] of candidates) {
		if (existsSync(join(base, rel))) {
			const file = JSON.stringify(join(base, rel));
			return kind === "named"
				? `import { ${comp.name} } from ${file};\n`
				: `import ${comp.name} from ${file};\n`;
		}
	}
	throw new Error(`no deep entry for ${pkg}/${comp.dir} under ${base}`);
}

function probeBuild(app, consumer, source, tag) {
	const entry = join(app, ENTRY[consumer]);
	writeFileSync(entry, source);
	const outDir = join(OUT, "probe-out", tag);
	rmSync(outDir, { recursive: true, force: true });
	const t0 = Date.now();
	sh(
		join(app, "node_modules/.bin/vite"),
		["build", "--outDir", outDir, "--emptyOutDir", "--logLevel", "error"],
		{
			cwd: app,
		}
	);
	const ms = Date.now() - t0;
	const m = measureAssets(outDir);
	rmSync(outDir, { recursive: true, force: true });
	return { js: m.js, css: m.css, buildMs: ms };
}

// An entry that imports nothing. Component probes include whatever framework
// runtime they pull in, so costs are absolute, not "above the runtime".
const EMPTY_PROBE = "console.log('baseline');\n";

// Dev-server cost of an entry: JS modules the browser fetches and their raw
// bytes, until the network is idle. Unbundled packages (Svelte source) pay for
// every module the barrel reaches here even when the build tree-shakes it.
async function devCost(appDir, name, source, port) {
	writeFileSync(join(appDir, ENTRY[name]), source);
	const server = spawn(
		join(appDir, "node_modules/.bin/vite"),
		["--port", String(port), "--strictPort", "--host", "127.0.0.1", "--force"],
		{ cwd: appDir, stdio: "ignore" }
	);
	try {
		const url = `http://127.0.0.1:${port}/`;
		for (let i = 0; i < 100; i++) {
			try {
				if ((await fetch(url)).ok) break;
			} catch {
				/* not up yet */
			}
			await sleep(200);
		}
		const { chromium } = await import("@playwright/test");
		const browser = await chromium.launch();
		try {
			const page = await browser.newPage();
			const bodies = [];
			page.on("response", (r) => {
				const path = new URL(r.url()).pathname;
				if (path === "/" || /\.(css|svg|png|ico|woff2?)$/.test(path)) return;
				bodies.push(
					r.body().then(
						(b) => b.length,
						() => 0
					)
				);
			});
			const t0 = Date.now();
			await page.goto(url, { waitUntil: "networkidle" });
			await sleep(300);
			const loadMs = Date.now() - t0;
			const sizes = await Promise.all(bodies);
			return { modules: sizes.length, rawBytes: sizes.reduce((a, b) => a + b, 0), loadMs };
		} finally {
			await browser.close();
		}
	} finally {
		server.kill();
		await sleep(500);
	}
}

async function runImports() {
	const { consumers } = load("state");
	const results = [];
	let devPort = BASE_PORT + 20;
	for (const name of ["svelte-vite", "react-vite", "vue-vite"]) {
		const c = consumers[name];
		if (!c || (ONLY && !c.pkg.endsWith(ONLY))) continue;
		const appDir = c.app;
		const probe = (src, tag) => probeBuild(appDir, name, src, tag);
		const barrel = (list) =>
			`import { ${list.map((x) => x.name).join(", ")} } from "${c.pkg}";\nconsole.log(${list.map((x) => x.name).join(", ")});\n`;
		const deep = (list) => {
			let s = "";
			for (const x of list) s += deepImport(appDir, c.pkg, x);
			return `${s}console.log(${list.map((x) => x.name).join(", ")});\n`;
		};
		const rows = [];
		console.log(`\n=== imports: ${c.pkg} ===`);
		rows.push({
			case: "baseline",
			kind: "none",
			...probe(EMPTY_PROBE, `${name}-baseline`),
		});
		for (const comp of IMPORT_COMPONENTS) {
			for (const kind of ["barrel", "deep"]) {
				const src = kind === "barrel" ? barrel([comp]) : deep([comp]);
				console.log(`  ${comp.name} ${kind}`);
				rows.push({ case: comp.name, kind, ...probe(src, `${name}-${comp.name}-${kind}`) });
			}
		}
		for (const kind of ["barrel", "deep"]) {
			const src = kind === "barrel" ? barrel(IMPORT_COMPONENTS) : deep(IMPORT_COMPONENTS);
			console.log(`  all five ${kind}`);
			rows.push({ case: "all five", kind, ...probe(src, `${name}-all-${kind}`) });
		}
		const dev = [
			{
				case: "baseline",
				kind: "none",
				...(await devCost(appDir, name, EMPTY_PROBE, devPort++)),
			},
		];
		for (const [label, list] of [
			["Button", [IMPORT_COMPONENTS[0]]],
			["all five", IMPORT_COMPONENTS],
		]) {
			for (const kind of ["barrel", "deep"]) {
				console.log(`  dev ${label} ${kind}`);
				const src = kind === "barrel" ? barrel(list) : deep(list);
				dev.push({ case: label, kind, ...(await devCost(appDir, name, src, devPort++)) });
			}
		}
		results.push({ consumer: name, pkg: c.pkg, rows, dev, run: runInfo() });
	}
	save("imports", results);
}

// ----------------------------------------------------------------- harness

const HARNESS = {
	svelte: { consumer: "svelte-vite", entry: "src/main.js", file: "svelte-entry.js" },
	react: { consumer: "react-vite", entry: "src/main.tsx", file: "react-entry.tsx" },
};
const COMPONENT_NAMES = [
	"fluid-cursor",
	"border-beam",
	"displacement-text",
	"mosaic-glow",
	"toast",
];

const SW_GL = ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"];

async function withHarness(fw, port, fn) {
	const { consumers } = load("state");
	const h = HARNESS[fw];
	const c = consumers[h.consumer];
	if (!c) throw new Error(`run sizes first: no kept ${h.consumer}`);
	cpSync(join(here, "harness", h.file), join(c.app, h.entry));
	const outDir = join(c.app, "dist-perf");
	sh(
		join(c.app, "node_modules/.bin/vite"),
		["build", "--outDir", outDir, "--emptyOutDir", "--logLevel", "error"],
		{
			cwd: c.app,
		}
	);
	const server = spawn(
		join(c.app, "node_modules/.bin/vite"),
		["preview", "--outDir", outDir, "--port", String(port), "--strictPort", "--host", "127.0.0.1"],
		{ cwd: c.app, stdio: "ignore" }
	);
	try {
		const url = `http://127.0.0.1:${port}/`;
		for (let i = 0; i < 50; i++) {
			try {
				if ((await fetch(url)).ok) break;
			} catch {
				/* not up yet */
			}
			await sleep(200);
		}
		const { chromium } = await import("@playwright/test");
		const browser = await chromium.launch({ args: SW_GL });
		try {
			return await fn({ browser, url, version: browser.version() });
		} finally {
			await browser.close();
		}
	} finally {
		server.kill();
	}
}

const metricsOf = async (cdp) => {
	const { metrics } = await cdp.send("Performance.getMetrics");
	return Object.fromEntries(metrics.map((m) => [m.name, m.value]));
};
const gc = async (cdp) => {
	for (let i = 0; i < 3; i++) {
		await cdp.send("HeapProfiler.collectGarbage");
		await sleep(100);
	}
};

/** The parity route of a slug on a stage server (as scripts/parity/capture.mjs). */
function parityUrl(fw, slug) {
	const q = encodeURIComponent(slug);
	return fw === "svelte"
		? `${PARITY_BASE.svelte}/_parity/${q}?theme=dark`
		: `${PARITY_BASE[fw]}/?slug=${q}&theme=dark`;
}

/**
 * `parity`: the page is a parity stage, not the harness. There is no
 * window.__perf there, so a stand-in whose box is the stage is installed once
 * the demo has mounted.
 */
async function openPage(browser, url, { parity = false } = {}) {
	const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
	const page = await context.newPage();
	await page.addInitScript({ path: join(here, "harness/instrument.js") });
	const errors = [];
	page.on("pageerror", (e) => errors.push(String(e)));
	await page.goto(url);
	if (parity) {
		await page.waitForFunction(
			() => {
				const stage = document.querySelector("[data-parity-stage]");
				return (
					document.documentElement.dataset.parityReady === "1" ||
					Boolean(document.querySelector("[data-parity-missing]")) ||
					Boolean(stage && stage.childElementCount > 0 && !stage.querySelector(".animate-spin"))
				);
			},
			undefined,
			{ timeout: 30_000 }
		);
		if (await page.locator("[data-parity-missing]").count())
			throw new Error(`no parity scenario at ${url}`);
		await page.evaluate(() => {
			window.__perf = {
				boxRect() {
					const r = document.querySelector("[data-parity-stage]")?.getBoundingClientRect();
					return r ? { x: r.x, y: r.y, width: r.width, height: r.height } : null;
				},
			};
		});
	} else await page.waitForFunction(() => window.__perfReady === true);
	const cdp = await context.newCDPSession(page);
	await cdp.send("Performance.enable");
	await cdp.send("HeapProfiler.enable");
	return { context, page, cdp, errors };
}

const snapshot = (page) => page.evaluate(() => window.__probe.snapshot());

async function window_(page, cdp, ms, { moveMouse = false } = {}) {
	const rect = await page.evaluate(() => window.__perf.boxRect());
	const s0 = await snapshot(page);
	const m0 = await metricsOf(cdp);
	const t0 = Date.now();
	if (moveMouse && rect) {
		const cx = rect.x + rect.width / 2;
		const cy = rect.y + rect.height / 2;
		while (Date.now() - t0 < ms) {
			const a = (Date.now() - t0) / 250;
			await page.mouse.move(cx + Math.cos(a) * 90, cy + Math.sin(a * 1.3) * 60);
			await sleep(16);
		}
	} else {
		await sleep(ms);
	}
	const elapsed = Date.now() - t0;
	const m1 = await metricsOf(cdp);
	const s1 = await snapshot(page);
	const d = deltaMetrics(m0, m1, elapsed);
	const tasks = s1.longTasks.slice(s0.longTasks.length);
	return {
		cpuMsPerSec: d.cpuMsPerSec,
		scriptMsPerSec: d.scriptMsPerSec,
		rafPerSec: ((s1.raf - s0.raf) * 1000) / elapsed,
		longTasks: tasks.length,
		longTaskMs: tasks.reduce((a, b) => a + b, 0),
		longTaskMaxMs: tasks.length ? Math.max(...tasks) : 0,
	};
}

const medianOf = (samples, pick) => median(samples.map(pick));
function aggregateWindows(samples) {
	const keys = Object.keys(samples[0]);
	return Object.fromEntries(keys.map((k) => [k, medianOf(samples, (s) => s[k])]));
}

/**
 * Offscreen: a 3000 px spacer is prepended so the stage sits far below the
 * 800 px viewport (never scrolled into view), 3 s window. A component that
 * keeps painting or looping here pays for pixels nobody sees.
 */
async function offscreenWindow(page, cdp) {
	await page.evaluate(() => {
		const spacer = document.createElement("div");
		spacer.id = "__perf-spacer";
		spacer.style.cssText = "height:3000px;flex:none;width:1px";
		document.body.prepend(spacer);
		window.scrollTo(0, 0);
	});
	await sleep(500);
	const w = await window_(page, cdp, 3000);
	await page.evaluate(() => document.getElementById("__perf-spacer")?.remove());
	return w;
}

/**
 * Hidden: `document.hidden` / `visibilityState` are overridden and a
 * `visibilitychange` is dispatched, 3 s window. Headless Chromium has no
 * occluded or backgrounded state to ask for (CDP
 * `Emulation.setFocusEmulationEnabled` only fakes focus, and
 * `Page.setWebLifecycleState` "frozen" stops everything, which measures the
 * browser, not the component), so this measures what a component does when it
 * is told the tab is hidden: pause on `visibilitychange`, or keep going.
 */
async function hiddenWindow(page, cdp) {
	const setHidden = (hidden) =>
		page.evaluate((h) => {
			if (h) {
				Object.defineProperty(document, "hidden", { configurable: true, get: () => true });
				Object.defineProperty(document, "visibilityState", {
					configurable: true,
					get: () => "hidden",
				});
			} else {
				delete document.hidden;
				delete document.visibilityState;
			}
			document.dispatchEvent(new Event("visibilitychange"));
		}, hidden);
	await setHidden(true);
	await sleep(500);
	const w = await window_(page, cdp, 3000);
	await setHidden(false);
	return w;
}

/**
 * `effects --component <slug>` for a slug outside the harness: the parity
 * route of each requested framework (Svelte only without --only), same
 * windows as the harness rows. Stored in effects-parity.json; the baseline
 * report does not read it.
 */
async function runEffectsParity() {
	const out = [];
	const fws = ONLY ? [ONLY] : ["svelte"];
	const { chromium } = await import("@playwright/test");
	const browser = await chromium.launch({ args: SW_GL });
	try {
		const quietWait = await quietGate("effects");
		for (const fw of fws) {
			if (!PARITY_BASE[fw]) throw new Error(`unknown --only ${fw}`);
			const url = parityUrl(fw, COMPONENT);
			console.log(`\n=== effects (parity route): ${fw} ${url} ===`);
			const samples = { idle: [], active: [], offscreen: [], hidden: [] };
			for (let rep = 0; rep < REPS; rep++) {
				const { context, page, cdp, errors } = await openPage(browser, url, { parity: true });
				await sleep(1500);
				samples.idle.push(await window_(page, cdp, 5000));
				samples.active.push(await window_(page, cdp, 5000, { moveMouse: true }));
				samples.offscreen.push(await offscreenWindow(page, cdp));
				samples.hidden.push(await hiddenWindow(page, cdp));
				if (errors.length) console.log(`  page errors (${fw}):`, errors.slice(0, 2));
				await context.close();
			}
			const row = {
				name: COMPONENT,
				reps: REPS,
				...Object.fromEntries(Object.entries(samples).map(([k, v]) => [k, aggregateWindows(v)])),
			};
			for (const k of ["idle", "active", "offscreen", "hidden"])
				console.log(
					`  ${k}: ${row[k].cpuMsPerSec.toFixed(1)} CPU ms/s, ${row[k].rafPerSec.toFixed(0)} raf/s, ${row[k].longTasks} long tasks`
				);
			out.push({
				framework: fw,
				route: url,
				chromium: browser.version(),
				run: runWithWait(quietWait),
				rows: [row],
			});
		}
	} finally {
		await browser.close();
	}
	save("effects-parity", out);
}

async function runEffects() {
	if (COMPONENT && !COMPONENT_NAMES.includes(COMPONENT)) return runEffectsParity();
	const out = [];
	let port = BASE_PORT;
	for (const fw of Object.keys(HARNESS)) {
		if (ONLY && fw !== ONLY) continue;
		console.log(`\n=== effects: ${fw} ===`);
		await withHarness(fw, port, async ({ browser, url, version }) => {
			const quietWait = await quietGate("effects");
			const rows = [];
			for (const name of ["none", ...COMPONENT_NAMES].filter(
				(n) => !COMPONENT || n === COMPONENT
			)) {
				const idle = [];
				const active = [];
				const offscreen = [];
				const hidden = [];
				for (let rep = 0; rep < REPS; rep++) {
					const { context, page, cdp, errors } = await openPage(browser, url);
					if (name !== "none") await page.evaluate((n) => window.__perf.mount(n), name);
					await sleep(1500);
					idle.push(await window_(page, cdp, 5000));
					active.push(await window_(page, cdp, 5000, { moveMouse: true }));
					offscreen.push(await offscreenWindow(page, cdp));
					hidden.push(await hiddenWindow(page, cdp));
					if (errors.length) console.log(`  page errors (${name}):`, errors.slice(0, 2));
					await context.close();
				}
				rows.push({
					name,
					idle: aggregateWindows(idle),
					active: aggregateWindows(active),
					offscreen: aggregateWindows(offscreen),
					hidden: aggregateWindows(hidden),
					reps: REPS,
				});
				console.log(
					`  ${name}: idle ${rows.at(-1).idle.cpuMsPerSec.toFixed(1)} ms/s, ${rows.at(-1).idle.rafPerSec.toFixed(0)} raf/s`
				);
			}
			// Raw traces: one separate window per component so tracing overhead
			// never reaches the numbers above.
			mkdirSync(join(OUT, "traces"), { recursive: true });
			for (const name of COMPONENT_NAMES.filter((n) => !COMPONENT || n === COMPONENT)) {
				const { context, page } = await openPage(browser, url);
				const path = join(OUT, "traces", `${fw}-${name}.json`);
				await browser.startTracing(page, {
					path,
					categories: [
						"devtools.timeline",
						"v8.execute",
						"blink.user_timing",
						"disabled-by-default-devtools.timeline",
					],
				});
				await page.evaluate((n) => window.__perf.mount(n), name);
				await sleep(1000);
				const rect = await page.evaluate(() => window.__perf.boxRect());
				const t0 = Date.now();
				while (rect && Date.now() - t0 < 3000) {
					const a = (Date.now() - t0) / 250;
					await page.mouse.move(
						rect.x + rect.width / 2 + Math.cos(a) * 90,
						rect.y + rect.height / 2 + Math.sin(a) * 60
					);
					await sleep(16);
				}
				await browser.stopTracing();
				await context.close();
			}
			out.push({ framework: fw, chromium: version, run: runWithWait(quietWait), rows });
		});
		port += 1;
	}
	save("effects", out);
}

async function runLifecycle() {
	const out = [];
	let port = BASE_PORT;
	for (const fw of Object.keys(HARNESS)) {
		if (ONLY && fw !== ONLY) continue;
		console.log(`\n=== lifecycle: ${fw} ===`);
		await withHarness(fw, port, async ({ browser, url, version }) => {
			const quietWait = await quietGate("lifecycle");
			const rows = [];
			for (const name of COMPONENT_NAMES.filter((n) => !COMPONENT || n === COMPONENT)) {
				const { context, page, cdp, errors } = await openPage(browser, url);
				const cycle = (n) =>
					page.evaluate(
						async ([comp, times]) => {
							const pause = (ms) => new Promise((r) => setTimeout(r, ms));
							for (let i = 0; i < times; i++) {
								window.__perf.mount(comp);
								await pause(40);
								await window.__perf.unmountAll();
								await pause(10);
							}
						},
						[name, n]
					);
				await cycle(1); // warm-up: lazy chunks and one-off caches
				await sleep(500);
				await gc(cdp);
				const base = { m: await metricsOf(cdp), s: await snapshot(page) };

				await cycle(CYCLES);
				await sleep(800);
				await gc(cdp);
				const after = { m: await metricsOf(cdp), s: await snapshot(page) };
				const raf0 = (await snapshot(page)).raf;
				await sleep(1000);
				const rafAfterUnmount = (await snapshot(page)).raf - raf0;

				// 10 simultaneous instances from the same warm baseline.
				await page.evaluate((n) => window.__perf.mount(n, 10), name);
				await sleep(1500);
				await gc(cdp);
				const many = { m: await metricsOf(cdp), s: await snapshot(page) };
				const manyWindow = await window_(page, cdp, 3000);
				await page.evaluate(() => window.__perf.unmountAll());
				await sleep(800);
				await gc(cdp);
				const gone = { m: await metricsOf(cdp), s: await snapshot(page) };
				const raf1 = (await snapshot(page)).raf;
				await sleep(1000);
				const rafAfterMany = (await snapshot(page)).raf - raf1;

				const diff = (a, b) => ({
					heapBytes: a.m.JSHeapUsedSize - b.m.JSHeapUsedSize,
					nodes: a.m.Nodes - b.m.Nodes,
					cdpListeners: a.m.JSEventListeners - b.m.JSEventListeners,
					persistentListeners: a.s.persistentListeners - b.s.persistentListeners,
					persistentListenersByType: Object.fromEntries(
						Object.entries(a.s.persistentListenersByType)
							.map(([type, n]) => [type, n - (b.s.persistentListenersByType[type] ?? 0)])
							.filter(([, n]) => n !== 0)
					),
					observers: a.s.liveObservers - b.s.liveObservers,
					intervals: a.s.intervalsLive - b.s.intervalsLive,
				});
				rows.push({
					name,
					cycles: CYCLES,
					afterCycles: {
						...diff(after, base),
						contextsCreated: after.s.contextsCreated - base.s.contextsCreated,
						contextsConnected: after.s.contextsConnected,
						contextsRetained: after.s.contextsRetained - base.s.contextsRetained,
						contextWarnings: after.s.contextWarnings - base.s.contextWarnings,
						rafAfterUnmount,
					},
					tenInstances: {
						...diff(many, base),
						contextsCreated: many.s.contextsCreated - after.s.contextsCreated,
						contextsConnected: many.s.contextsConnected,
						contextWarnings: many.s.contextWarnings - after.s.contextWarnings,
						cpuMsPerSec: manyWindow.cpuMsPerSec,
						rafPerSec: manyWindow.rafPerSec,
					},
					afterTenUnmounted: {
						...diff(gone, base),
						contextsConnected: gone.s.contextsConnected,
						rafAfterUnmount: rafAfterMany,
					},
					errors: errors.slice(0, 3),
				});
				console.log(
					`  ${name}: heap ${kb(rows.at(-1).afterCycles.heapBytes)} KB, listeners ${rows.at(-1).afterCycles.persistentListeners}, contexts ${rows.at(-1).afterCycles.contextsCreated}/${rows.at(-1).afterCycles.contextsConnected}`
				);
				await context.close();
			}
			out.push({ framework: fw, chromium: version, run: runWithWait(quietWait), rows });
		});
		port += 1;
	}
	save("lifecycle", out);
}

// ------------------------------------------------------------------ report

function environment(sections) {
	const { sizes, effects, lifecycle } = sections;
	const first = sizes.run ?? effects[0]?.run ?? {};
	const settings = recordedSettings(effects, lifecycle);
	const mark = (v) => backfillMark(v, first);
	return [
		["machine", mark(first.machine ?? "unrecorded")],
		["os", mark(first.os ?? "unrecorded")],
		["node", mark(first.node ?? "unrecorded")],
		["chromium", effects[0]?.chromium ?? "n/a"],
		["gpu", "software GL (swiftshader), headless"],
		...Object.entries(first.versions ?? {}).map(([k, v]) => [k, mark(v)]),
		["repetitions", settings.reps],
		["lifecycle cycles", settings.cycles],
	];
}

const f1 = (n) => (Number.isFinite(n) ? n.toFixed(1) : "n/a");

function runReport() {
	const md = [];
	md.push(`# Performance baseline ${DATE}`, "");
	md.push(
		"Numbers only. Protocol and environment details: `scripts/perf/README.md`. Raw traces are not committed.",
		""
	);
	const sizes = load("sizes");
	const imports = load("imports");
	const effects = load("effects");
	const life = load("lifecycle");
	md.push(
		"## Environment",
		"",
		markdownTable(["key", "value"], environment({ sizes, imports, effects, lifecycle: life })),
		"",
		'Each section is stored with the library commit it measured, the commit of the tool that measured it and the load average when it ended. A section counts as quiet when the worse of its 1- and 5-minute loads is below half the core count (the 15-minute window includes the builds of the tool itself and is stored but not used); a section whose wait for a quiet machine timed out is labelled loaded whatever its load at the end; the others are labelled loaded and their timing numbers are indicative only. The "wait for quiet" column is how the pre-measurement wait of a section ended (1-minute load per core under 0.5 before the group starts); the load at the end includes the work of the tool itself (the browser, the builds), so a group can start quiet and still end labelled loaded. A record filled in after the measurement (`stamp`) is marked "(backfilled)" on everything it supplies: machine, os, node, package versions, library commit and tool commit.',
		"",
		markdownTable(
			[
				"section",
				"library commit",
				"tool commit",
				"load at end (1/5/15 min)",
				"state",
				"wait for quiet",
			],
			runRows({ sizes, imports, effects, lifecycle: life })
		),
		""
	);

	md.push("## 1. Consumer app weight (client JS + CSS, KB)", "");
	md.push(
		markdownTable(
			[
				"app",
				"package",
				"JS files",
				"JS raw",
				"JS gzip",
				"JS brotli",
				"CSS gzip",
				"CSS brotli",
				"total gzip",
				"total brotli",
			],
			sizes.rows.map((r) => [
				r.name,
				r.pkg,
				r.js.files,
				kb(r.js.raw),
				kb(r.js.gzip),
				kb(r.js.brotli),
				kb(r.css.gzip),
				kb(r.css.brotli),
				kb(r.total.gzip),
				kb(r.total.brotli),
			])
		),
		""
	);
	md.push(
		"Packed tarballs (KB): " +
			Object.entries(sizes.tarballs)
				.map(([f, b]) => `${f} ${kb(b)}`)
				.join(", "),
		""
	);

	md.push("## 2. Barrel vs deep import (JS only, KB, minified, one component per probe)", "");
	for (const g of effects) {
		for (const window of ["offscreen", "hidden"]) {
			const rows = g.rows.filter((r) => r.name !== "none" && r[window]);
			if (!rows.length) continue;
			const worst = Math.max(...rows.map((r) => r[window].cpuMsPerSec));
			const provisional = groupVerdict(g) !== "quiet";
			budgetRows.push([
				`${g.framework} ${window} CPU, worst effect (report-only)`,
				`${f1(worst)} ms/s`,
				`${proposeBudget(worst, 0.5, 5)} ms/s${provisional ? " (provisional: measured on a loaded machine)" : ""}`,
			]);
		}
	}
	for (const g of imports) {
		const base = g.rows.find((r) => r.case === "baseline").js;
		md.push(`### ${g.pkg} (${g.consumer})`, "");
		md.push(`Baseline (empty entry): ${kb(base.gzip)} KB gzip, ${kb(base.raw)} KB raw.`, "");
		const byCase = new Map();
		for (const r of g.rows.filter((x) => x.case !== "baseline")) {
			byCase.set(r.case, { ...byCase.get(r.case), [r.kind]: r });
		}
		md.push(
			markdownTable(
				[
					"component",
					"barrel gzip",
					"deep gzip",
					"barrel brotli",
					"deep brotli",
					"barrel raw",
					"deep raw",
					"barrel/deep (gzip)",
				],
				[...byCase].map(([name, v]) => [
					name,
					kb(v.barrel.js.gzip - base.gzip),
					kb(v.deep.js.gzip - base.gzip),
					kb(v.barrel.js.brotli - base.brotli),
					kb(v.deep.js.brotli - base.brotli),
					kb(v.barrel.js.raw - base.raw),
					kb(v.deep.js.raw - base.raw),
					(v.deep.js.gzip - base.gzip > 0
						? (v.barrel.js.gzip - base.gzip) / (v.deep.js.gzip - base.gzip)
						: NaN
					).toFixed(2),
				])
			),
			"",
			"Costs include the framework runtime pieces each component pulls in.",
			""
		);
		const devBase = g.dev.find((r) => r.case === "baseline");
		md.push(
			"Dev server (JS modules fetched until the network is idle, raw KB, load ms), above the empty-entry baseline:",
			"",
			markdownTable(
				["case", "kind", "modules", "raw KB", "load ms"],
				g.dev.map((r) => [
					r.case,
					r.kind,
					r.modules - (r.case === "baseline" ? 0 : devBase.modules),
					kb(r.rawBytes - (r.case === "baseline" ? 0 : devBase.rawBytes)),
					r.loadMs,
				])
			),
			"",
			`Baseline row is absolute (${devBase.modules} modules).`,
			""
		);
	}

	md.push("## 3. Effect activity (median of repetitions, 5 s windows)", "");
	for (const g of effects) {
		md.push(`### ${g.framework}`, "");
		md.push(
			markdownTable(
				[
					"component",
					"idle raf/s",
					"idle CPU ms/s",
					"idle script ms/s",
					"idle long tasks",
					"moving raf/s",
					"moving CPU ms/s",
					"moving script ms/s",
					"moving long tasks",
					"moving long-task ms",
					"offscreen raf/s",
					"offscreen CPU ms/s",
					"hidden raf/s",
					"hidden CPU ms/s",
				],
				g.rows.map((r) => [
					r.name,
					f1(r.idle.rafPerSec),
					f1(r.idle.cpuMsPerSec),
					f1(r.idle.scriptMsPerSec),
					f1(r.idle.longTasks),
					f1(r.active.rafPerSec),
					f1(r.active.cpuMsPerSec),
					f1(r.active.scriptMsPerSec),
					f1(r.active.longTasks),
					f1(r.active.longTaskMs),
					r.offscreen ? f1(r.offscreen.rafPerSec) : "n/a",
					r.offscreen ? f1(r.offscreen.cpuMsPerSec) : "n/a",
					r.hidden ? f1(r.hidden.rafPerSec) : "n/a",
					r.hidden ? f1(r.hidden.cpuMsPerSec) : "n/a",
				])
			),
			"",
			"`none` is the harness page with nothing mounted. `toast` is a Toaster with 4 visible toasts. CPU is renderer main-thread task time; GPU-process work is not included. `offscreen` is a 3 s window with the stage 3000 px below the viewport; `hidden` is a 3 s window after `document.hidden` is overridden to true and `visibilitychange` is dispatched (n/a: the run predates these windows). Both are report-only.",
			""
		);
	}

	md.push(`## 4. Mount/unmount and simultaneous instances`, "");
	for (const g of life) {
		const tenProvisional = groupVerdict(g) !== "quiet";
		md.push(
			`### ${g.framework}: ${g.rows[0].cycles} mount/unmount cycles, then 10 instances at once`,
			""
		);
		md.push(
			markdownTable(
				[
					"component",
					"heap delta KB",
					"persistent listeners",
					"observers",
					"intervals",
					"contexts created",
					"contexts connected",
					"contexts retained (delta)",
					"context warnings",
					"raf/s after unmount",
				],
				g.rows.map((r) => [
					r.name,
					kb(r.afterCycles.heapBytes),
					r.afterCycles.persistentListeners,
					r.afterCycles.observers,
					r.afterCycles.intervals,
					r.afterCycles.contextsCreated,
					r.afterCycles.contextsConnected,
					r.afterCycles.contextsRetained,
					r.afterCycles.contextWarnings,
					r.afterCycles.rafAfterUnmount,
				])
			),
			"",
			"10 simultaneous instances, against the warm baseline:",
			"",
			markdownTable(
				[
					"component",
					"heap delta KB",
					"nodes",
					"persistent listeners",
					"observers",
					"intervals",
					"contexts created",
					"contexts connected",
					"context warnings",
					tenProvisional ? "CPU ms/s (provisional: loaded machine)" : "CPU ms/s",
					"raf/s",
				],
				g.rows.map((r) => [
					r.name,
					kb(r.tenInstances.heapBytes),
					r.tenInstances.nodes,
					r.tenInstances.persistentListeners,
					r.tenInstances.observers,
					r.tenInstances.intervals,
					r.tenInstances.contextsCreated,
					r.tenInstances.contextsConnected,
					r.tenInstances.contextWarnings,
					f1(r.tenInstances.cpuMsPerSec),
					f1(r.tenInstances.rafPerSec),
				])
			),
			"",
			"After unmounting the 10 instances (residue against the same baseline):",
			"",
			markdownTable(
				[
					"component",
					"heap delta KB",
					"nodes",
					"persistent listeners",
					"observers",
					"intervals",
					"contexts connected",
					"raf/s after unmount",
				],
				g.rows.map((r) => [
					r.name,
					kb(r.afterTenUnmounted.heapBytes),
					r.afterTenUnmounted.nodes,
					r.afterTenUnmounted.persistentListeners,
					r.afterTenUnmounted.observers,
					r.afterTenUnmounted.intervals,
					r.afterTenUnmounted.contextsConnected,
					r.afterTenUnmounted.rafAfterUnmount,
				])
			),
			""
		);
	}

	md.push("## 5. Proposed initial budget (not enforced)", "");
	const budgetRows = [];
	for (const r of sizes.rows) {
		budgetRows.push([
			`${r.name} total gzip`,
			`${kb(r.total.gzip)} KB`,
			`${kb(proposeBudget(r.total.gzip, 0.15, 1024))} KB`,
		]);
	}
	for (const g of effects) {
		const worst = Math.max(
			...g.rows.filter((r) => r.name !== "none").map((r) => r.idle.cpuMsPerSec)
		);
		const provisional = groupVerdict(g) !== "quiet";
		budgetRows.push([
			`${g.framework} idle CPU, worst effect`,
			`${f1(worst)} ms/s`,
			`${proposeBudget(worst, 0.5, 5)} ms/s${provisional ? " (provisional: measured on a loaded machine)" : ""}`,
		]);
	}
	for (const g of imports) {
		const base = g.rows.find((r) => r.case === "baseline").js;
		const byCase = new Map();
		for (const r of g.rows.filter((x) => x.case !== "baseline")) {
			byCase.set(r.case, { ...byCase.get(r.case), [r.kind]: r });
		}
		let worstRatio = 0;
		for (const [name, v] of byCase) {
			const barrel = v.barrel.js.gzip - base.gzip;
			const deep = v.deep.js.gzip - base.gzip;
			if (deep > 0) worstRatio = Math.max(worstRatio, barrel / deep);
			budgetRows.push([
				`${g.pkg} ${name} through the barrel, gzip`,
				`${kb(barrel)} KB`,
				`${kb(proposeBudget(barrel, 0.1, 1024))} KB`,
			]);
		}
		budgetRows.push([`${g.pkg} barrel/deep ratio, worst component`, worstRatio.toFixed(2), "1.05"]);
	}
	for (const g of life) {
		const worstHeap = Math.max(...g.rows.map((r) => r.afterCycles.heapBytes));
		budgetRows.push([
			`${g.framework} heap delta after ${g.rows[0].cycles} cycles, worst component`,
			`${kb(worstHeap)} KB`,
			`${kb(proposeBudget(worstHeap, 0.5, 256 * 1024))} KB`,
		]);
		const worstResidue = (pick) => Math.max(...g.rows.map((r) => pick(r)));
		for (const [label, pick] of [
			["raf/s after unmount", (r) => r.afterTenUnmounted.rafAfterUnmount],
			["persistent listeners after unmount", (r) => r.afterTenUnmounted.persistentListeners],
			["observers still observing after unmount", (r) => r.afterTenUnmounted.observers],
			["intervals still running after unmount", (r) => r.afterTenUnmounted.intervals],
			["contexts still connected after unmount", (r) => r.afterTenUnmounted.contextsConnected],
			["contexts retained after the cycles (delta)", (r) => r.afterCycles.contextsRetained],
		]) {
			budgetRows.push([
				`${g.framework} ${label}, worst component`,
				String(worstResidue(pick)),
				"0",
			]);
		}
	}
	md.push(markdownTable(["metric", "measured", "proposed ceiling"], budgetRows), "");

	const file = join(here, `BASELINE-${DATE}.md`);
	writeFileSync(file, `${md.join("\n").trimEnd()}\n`);
	console.log(`wrote ${file}`);
}

// -------------------------------------------------------------------- main

const SECTIONS = {
	sizes: runSizes,
	imports: runImports,
	effects: runEffects,
	lifecycle: runLifecycle,
	stamp: runStamp,
	report: runReport,
};

if (section === "all") {
	for (const name of ["sizes", "imports", "effects", "lifecycle", "report"]) await SECTIONS[name]();
} else if (SECTIONS[section]) {
	await SECTIONS[section]();
} else {
	console.log(
		readFileSync(fileURLToPath(import.meta.url), "utf8")
			.split("\n")
			.slice(1, 15)
			.map((l) => l.replace(/^\/\/ ?/, ""))
			.join("\n")
	);
	process.exit(section === "help" ? 0 : 2);
}
