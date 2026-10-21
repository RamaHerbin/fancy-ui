#!/usr/bin/env node
/**
 * Visual parity capture -- photographs every component's base demo on the
 * three parity stages (Svelte docs, React app, Vue app) at fixed moments, so
 * scripts/parity/diff.mjs can compare them pixel for pixel.
 *
 *   Svelte  <base-svelte>/_parity/<slug>?theme=<theme>   (src/routes/_parity)
 *   React   <base-react>/?slug=<slug>&theme=<theme>      (examples/parity-react)
 *   Vue     <base-vue>/?slug=<slug>&theme=<theme>        (examples/parity-vue)
 *
 * Each stage renders the demo alone in an 800×500 [data-parity-stage] box.
 *
 *   node scripts/parity/capture.mjs (--all | --only slug-a,slug-b)
 *        [--fw svelte,react,vue] [--theme light,dark] [--moments 0,600,1500]
 *        [--base-svelte http://localhost:5291] [--base-react http://localhost:5292]
 *        [--base-vue http://localhost:5293] [--out .parity] [--concurrency 4]
 *        [--reduced-motion no-preference|reduce] [--states all|none|open,focus,long]
 *
 * Output (git-ignored):
 *   <out>/shots/<fw>/<slug>/<theme>-<t>.png        rest pass
 *   <out>/shots/<fw>/<slug>/<theme>-<t>-hover.png  pointer pass (slugs with a hover/sweep/click hint)
 *   <out>/shots/<fw>/<slug>/<theme>-<t>@<state>.png  interaction states (hints "states", see states.mjs)
 *   <out>/capture-log.json                         per item: ok | missing | skipped | error + console errors
 *
 * Determinism. Every item gets its own browser context (the Playwright clock
 * is per context) with a frozen clock, a seeded Math.random and seeded
 * crypto.getRandomValues, so two runs of the same stage produce the same
 * pixels:
 *   - page.clock.pauseAt(FIXED_DATE) before goto: Date, performance.now,
 *     setTimeout/setInterval and requestAnimationFrame are all fakes that only
 *     move inside page.clock.runFor. (pauseAt alone, not install + pauseAt: a
 *     replayed install entry would offset performance.now by the real
 *     milliseconds between the two calls.)
 *   - CSS animations, transitions and element.animate() run on the
 *     compositor's real clock, which the fake does not reach. A sync loop,
 *     itself a fake setInterval so it ticks inside runFor, pauses every
 *     animation the first time it sees one and pins its currentTime to the
 *     fake time elapsed since then; finite ones that have run their course are
 *     finish()ed so `finished` promises and finish events still fire.
 *   - The clock stays frozen until the stage is ready, fonts are loaded, the
 *     stage's images are decoded and the network is idle, so how long the page
 *     took to load in real time never shows in the frame. t = 0 is that
 *     instant.
 *
 * Per-slug tweaks live in scripts/parity/hints/<slug>.json:
 *   { "hover"?: [fx, fy], "sweep"?: true, "click"?: [fx, fy], "skip"?: "reason", "moments"?: number[] }
 * hover/sweep/click follow applyPointerHint (scripts/lib/stage-capture.mjs),
 * with its 350 ms rest after a hover spent on the fake clock; moments of the
 * pointer pass count from the end of the gesture.
 *
 * A failing item is recorded in the log and the run goes on. Interaction
 * states (open, focus, long content; scripts/parity/states.mjs) are stricter:
 * a missing scenario, an unreachable stage, a state that is never reached or a
 * shot that is not written is an error naming <slug>@<state>, and the run
 * exits non-zero.
 */

import { chromium } from "@playwright/test";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
	checkExpect,
	entryStatusForState,
	settle,
	planStateItems,
	runSteps,
	stateShotName,
	STATE_NAMES,
} from "./states.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..", "..");
const hintsDir = join(__dirname, "hints");

const FRAMEWORKS = ["svelte", "react", "vue"];
const THEMES = ["light", "dark"];
const DEFAULT_MOMENTS = [0, 600, 1500];
const FIXED_DATE = new Date("2026-01-01T12:00:00.000Z");
const VIEWPORT = { width: 1000, height: 700 };
const LAUNCH_ARGS = ["--use-gl=angle", "--use-angle=swiftshader", "--font-render-hinting=none"];
/** Fake-clock period of the animation sync loop, one 60 Hz frame. */
const SYNC_MS = 16;
const READY_TIMEOUT = 30_000;
const IDLE_TIMEOUT = 5_000;

function parseArgs(argv) {
	const args = {
		only: null,
		all: false,
		fws: FRAMEWORKS,
		themes: THEMES,
		moments: DEFAULT_MOMENTS,
		base: {
			svelte: "http://localhost:5291",
			react: "http://localhost:5292",
			vue: "http://localhost:5293",
		},
		out: join(repoRoot, ".parity"),
		concurrency: 4,
		reducedMotion: "no-preference",
		states: "all",
	};
	const list = (value) =>
		value
			.split(",")
			.map((s) => s.trim())
			.filter(Boolean);
	for (let i = 0; i < argv.length; i++) {
		const flag = argv[i];
		const value = argv[i + 1];
		if (flag === "--all") {
			args.all = true;
			continue;
		}
		if (flag === "--only") args.only = list(value);
		else if (flag === "--fw") args.fws = list(value);
		else if (flag === "--theme") args.themes = list(value);
		else if (flag === "--moments") args.moments = list(value).map(Number);
		else if (flag === "--base-svelte") args.base.svelte = value.replace(/\/$/, "");
		else if (flag === "--base-react") args.base.react = value.replace(/\/$/, "");
		else if (flag === "--base-vue") args.base.vue = value.replace(/\/$/, "");
		else if (flag === "--out") args.out = resolve(value);
		else if (flag === "--concurrency") args.concurrency = Math.max(1, Number(value) || 1);
		else if (flag === "--reduced-motion") args.reducedMotion = value;
		else if (flag === "--states")
			args.states = value === "all" || value === "none" ? value : list(value);
		else throw new Error(`unknown flag ${flag}`);
		i++;
	}
	if (!args.all && !args.only) throw new Error("pass --all or --only slug-a,slug-b");
	for (const fw of args.fws) if (!FRAMEWORKS.includes(fw)) throw new Error(`unknown --fw ${fw}`);
	for (const t of args.themes) if (!THEMES.includes(t)) throw new Error(`unknown --theme ${t}`);
	if (Array.isArray(args.states))
		for (const s of args.states)
			if (!STATE_NAMES.includes(s)) throw new Error(`unknown --states ${s}`);
	if (args.moments.some((t) => !Number.isFinite(t) || t < 0)) throw new Error("bad --moments");
	return args;
}

/** Every shipped slug, from the registry itself (as build-component-thumbs does). */
async function registrySlugs() {
	const registryPath = join(repoRoot, "src", "lib", "fancy-ui", "registry.ts");
	const { transformWithEsbuild } = await import("vite");
	const source = readFileSync(registryPath, "utf8");
	const { code } = await transformWithEsbuild(source, registryPath, { loader: "ts" });
	const { registry } = await import(
		`data:text/javascript;base64,${Buffer.from(code, "utf8").toString("base64")}`
	);
	return Object.values(registry)
		.filter((c) => c.status === "done")
		.map((c) => c.slug)
		.sort();
}

function readHint(slug) {
	const file = join(hintsDir, `${slug}.json`);
	if (!existsSync(file)) return {};
	return JSON.parse(readFileSync(file, "utf8"));
}

function stageUrl(base, fw, slug, theme, variant) {
	const q = encodeURIComponent;
	const v = variant ? `&variant=${q(variant)}` : "";
	return fw === "svelte"
		? `${base}/_parity/${q(slug)}?theme=${theme}${v}`
		: `${base}/?slug=${q(slug)}&theme=${theme}${v}`;
}

/**
 * Runs in every document before any page script: seeded randomness and the
 * stored preferences. Kept self-contained -- it is serialised into the page.
 */
function determinismInit({ storage }) {
	const mulberry32 = (seed) => () => {
		seed |= 0;
		seed = (seed + 0x6d2b79f5) | 0;
		let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
	Math.random = mulberry32(1);
	// The stages call this right before mounting, so module-load draws (three.js
	// UUIDs in the full package barrels) do not shift the component's stream.
	globalThis.__parityReseed = () => {
		Math.random = mulberry32(1);
	};
	const bytes = mulberry32(2);
	if (globalThis.crypto?.getRandomValues) {
		crypto.getRandomValues = (array) => {
			const view = new Uint8Array(array.buffer, array.byteOffset, array.byteLength);
			for (let i = 0; i < view.length; i++) view[i] = Math.floor(bytes() * 256);
			return array;
		};
	}
	try {
		for (const [key, value] of storage) localStorage.setItem(key, value);
	} catch {
		/* storage blocked */
	}
	// A WebGL canvas drawn many times inside one runFor burst shows whichever
	// frame the compositor last committed, not the last one drawn. A 1x1
	// readback after each draw to the default framebuffer syncs the GPU, so
	// the shot is the final frame.
	for (const Ctx of [globalThis.WebGLRenderingContext, globalThis.WebGL2RenderingContext]) {
		if (!Ctx) continue;
		const bind = Ctx.prototype.bindFramebuffer;
		Ctx.prototype.bindFramebuffer = function (target, fb) {
			this.__parityFb = fb;
			return bind.call(this, target, fb);
		};
		for (const m of ["drawArrays", "drawElements"]) {
			const draw = Ctx.prototype[m];
			Ctx.prototype[m] = function (...args) {
				const result = draw.apply(this, args);
				if (!this.__parityFb)
					this.readPixels(0, 0, 1, 1, this.RGBA, this.UNSIGNED_BYTE, new Uint8Array(4));
				return result;
			};
		}
	}
}

/**
 * Takes over every Web Animation (CSS animations and transitions included):
 * paused on first sight, then pinned to the fake time elapsed since. Runs
 * from a fake setInterval, so it ticks inside page.clock.runFor.
 */
function startAnimationSync(period) {
	const born = new WeakMap();
	const finished = new WeakSet();
	const sync = () => {
		const now = performance.now();
		for (const anim of document.getAnimations()) {
			if (finished.has(anim)) continue;
			if (!born.has(anim)) born.set(anim, now);
			const elapsed = (now - born.get(anim)) * (anim.playbackRate || 0);
			const end = anim.effect?.getComputedTiming().endTime ?? Infinity;
			try {
				if (anim.playbackRate > 0 && Number.isFinite(end) && elapsed >= end) {
					anim.finish();
					finished.add(anim);
				} else {
					if (anim.playState !== "paused") anim.pause();
					anim.currentTime = elapsed;
				}
			} catch {
				/* an animation torn down mid-sync */
			}
		}
	};
	window.__paritySync = sync;
	// Finite animations not yet run to their end (states.mjs settles on 0).
	window.__parityPending = () => {
		sync();
		return document
			.getAnimations()
			.filter(
				(anim) =>
					!finished.has(anim) &&
					anim.playbackRate > 0 &&
					Number.isFinite(anim.effect?.getComputedTiming().endTime ?? Infinity)
			).length;
	};
	sync();
	setInterval(sync, period);
}

/**
 * Polls a page predicate from Node. page.waitForFunction polls with the
 * page's own timers, which the frozen clock never fires.
 */
async function until(page, predicate, what) {
	const deadline = Date.now() + READY_TIMEOUT;
	while (!(await page.evaluate(predicate))) {
		if (Date.now() > deadline) throw new Error(`timed out waiting for ${what}`);
		await new Promise((r) => setTimeout(r, 50));
	}
}

async function waitForStage(page, fw) {
	const stage = page.locator("[data-parity-stage]");
	await stage.first().waitFor({ state: "attached", timeout: READY_TIMEOUT });
	// The React / Vue apps flag readiness themselves and mark an unknown slug.
	if (fw !== "svelte") {
		await until(
			page,
			() =>
				document.documentElement.dataset.parityReady === "1" ||
				Boolean(document.querySelector("[data-parity-missing]")),
			"dataset.parityReady"
		);
	} else {
		// DemoRenderer shows its spinner while the demo module loads.
		await until(
			page,
			() => {
				const el = document.querySelector("[data-parity-stage]");
				// A ?variant= scenario renders nothing until its module lands.
				return (
					Boolean(el) &&
					el.childElementCount > 0 &&
					!el.querySelector(":scope > .h-64 > .animate-spin.border-t-transparent")
				);
			},
			"the demo to load"
		);
	}
	if (await page.locator("[data-parity-missing]").count()) return null;
	await page.evaluate(async () => {
		await document.fonts.ready;
		const stageEl = document.querySelector("[data-parity-stage]");
		await Promise.all(
			[...stageEl.querySelectorAll("img")].map((img) => img.decode().catch(() => {}))
		);
	});
	// Late chunks, images and fonts land while the clock is still frozen.
	await page.waitForLoadState("networkidle", { timeout: IDLE_TIMEOUT }).catch(() => {});
	await page.evaluate(() => document.fonts.ready);
	return stage.first();
}

/** applyPointerHint semantics, with every wait spent on the fake clock. */
async function applyHint(page, stage, hint) {
	const box = await stage.boundingBox();
	if (!box) throw new Error("stage has no box");
	const at = (fx, fy) => [box.x + box.width * fx, box.y + box.height * fy];
	if (hint.sweep) {
		await page.mouse.move(...at(0.15, 0.7));
		await page.mouse.move(...at(0.5, 0.35), { steps: 18 });
		await page.mouse.move(...at(0.72, 0.55), { steps: 12 });
	} else if (hint.hover) {
		await page.mouse.move(...at(0.2, 0.2));
		await page.mouse.move(...at(...hint.hover), { steps: 12 });
		await page.clock.runFor(350);
	}
	if (hint.click) await page.mouse.click(...at(...hint.click));
}

async function captureItem(browser, args, item) {
	const { fw, slug, theme, pointer, moments, hint, state, spec } = item;
	const context = await browser.newContext({
		viewport: VIEWPORT,
		deviceScaleFactor: 1,
		colorScheme: theme,
		reducedMotion: args.reducedMotion,
	});
	const consoleErrors = [];
	try {
		await context.addInitScript(determinismInit, {
			storage: [
				["fancy-ui-theme", theme],
				["fancy-ui-motion", "auto"],
			],
		});
		const page = await context.newPage();
		page.on("console", (msg) => {
			if (msg.type() === "error") consoleErrors.push(msg.text().slice(0, 500));
		});
		page.on("pageerror", (err) => consoleErrors.push(`pageerror: ${err.message.slice(0, 500)}`));
		await page.clock.pauseAt(FIXED_DATE);
		await page.mouse.move(0, 0);

		const res = await page.goto(stageUrl(args.base[fw], fw, slug, theme, spec?.variant), {
			waitUntil: "load",
			timeout: 60_000,
		});
		if (res && res.status() === 404) return { status: "missing", consoleErrors };
		const stage = await waitForStage(page, fw);
		if (!stage) return { status: "missing", consoleErrors };

		await page.evaluate(startAnimationSync, SYNC_MS);
		if (pointer) await applyHint(page, stage, hint);
		if (state) {
			await runSteps(page, stage, slug, state, spec.steps);
			await settle(page, slug, state);
		}

		const dir = join(args.out, "shots", fw, slug);
		mkdirSync(dir, { recursive: true });
		const files = [];
		let elapsed = 0;
		for (const t of moments) {
			if (t > elapsed) await page.clock.runFor(t - elapsed);
			elapsed = Math.max(elapsed, t);
			// Pick up anything started since the last tick (a hover transition).
			await page.evaluate(() => window.__paritySync());
			// A state that was left (a panel closed, focus lost) fails the item.
			if (state) await checkExpect(page, stage, slug, state, spec.expect);
			const name = state
				? stateShotName(theme, t, state)
				: `${theme}-${t}${pointer ? "-hover" : ""}.png`;
			await stage.screenshot({
				path: join(dir, name),
				type: "png",
				animations: "allow",
				caret: "hide",
				timeout: 20_000,
			});
			files.push(`${fw}/${slug}/${name}`);
		}
		return { status: "ok", files, consoleErrors };
	} finally {
		await context.close();
	}
}

async function reachable(base) {
	try {
		await fetch(base);
		return true;
	} catch {
		return false;
	}
}

async function main() {
	const args = parseArgs(process.argv.slice(2));
	const known = await registrySlugs();
	const slugs = args.all ? known : args.only;
	const unknown = slugs.filter((s) => !known.includes(s));
	if (unknown.length) console.warn(`not in registry (captured anyway): ${unknown.join(", ")}`);

	// A framework whose server is down is reported once, not 300 times.
	const fws = [];
	const down = [];
	for (const fw of args.fws) {
		if (await reachable(args.base[fw])) fws.push(fw);
		else {
			down.push(fw);
			console.error(`${fw} stage not reachable at ${args.base[fw]} -- skipped`);
		}
	}
	const stateErrors = [];

	const items = [];
	const log = {};
	for (const slug of slugs) {
		const hint = readHint(slug);
		const moments = hint.moments ?? args.moments;
		const pointerPass = Boolean(hint.hover || hint.sweep || hint.click);
		for (const fw of fws) {
			for (const theme of args.themes) {
				if (hint.skip) {
					log[`${fw}/${slug}/${theme}`] = { fw, slug, theme, status: "skipped", reason: hint.skip };
					continue;
				}
				items.push({ fw, slug, theme, pointer: false, moments, hint });
				if (pointerPass) items.push({ fw, slug, theme, pointer: true, moments, hint });
			}
		}
		if (args.states === "none") continue;
		// States are planned against every requested framework, so a stage that
		// is down fails them instead of thinning the comparison.
		const plan = planStateItems({
			slug,
			hint,
			fws: args.fws,
			themes: args.themes,
			wanted: args.states,
		});
		stateErrors.push(...plan.errors);
		for (const item of plan.items) {
			if (down.includes(item.fw)) {
				const id = `${item.fw}/${slug}/${item.theme}@${item.state}`;
				log[id] = {
					fw: item.fw,
					slug,
					theme: item.theme,
					state: item.state,
					status: "error",
					error: `${slug}@${item.state}: ${item.fw} stage not reachable`,
				};
			} else items.push({ ...item, pointer: false, hint });
		}
	}
	if (stateErrors.length) throw new Error(`bad state hints:\n  ${stateErrors.join("\n  ")}`);
	if (items.length === 0) throw new Error("nothing to capture");

	mkdirSync(args.out, { recursive: true });
	const browser = await chromium.launch({ args: LAUNCH_ARGS });
	const counts = { ok: 0, missing: 0, error: 0 };
	for (const e of Object.values(log)) if (e.status === "error") counts.error++;
	let done = 0;
	try {
		const queue = [...items];
		const worker = async () => {
			for (let item = queue.shift(); item; item = queue.shift()) {
				const id = `${item.fw}/${item.slug}/${item.theme}${item.pointer ? "-hover" : ""}${item.state ? `@${item.state}` : ""}`;
				const started = Date.now();
				let entry;
				// A first visit can make the Vite dev server optimise a new
				// dependency and reload the page under us; one retry absorbs it.
				for (let attempt = 0; attempt < 2; attempt++) {
					try {
						entry = await captureItem(browser, args, item);
						break;
					} catch (err) {
						const message = err.message.split("\n")[0];
						entry = {
							status: "error",
							error:
								item.state && !message.startsWith(`${item.slug}@`)
									? `${item.slug}@${item.state}: ${message}`
									: message,
							consoleErrors: [],
						};
						if (!/context was destroyed|navigat/i.test(err.message)) break;
					}
				}
				if (item.state) entry = entryStatusForState(entry, item.slug, item.state);
				counts[entry.status]++;
				log[id] = {
					fw: item.fw,
					slug: item.slug,
					theme: item.theme,
					pointer: item.pointer,
					...(item.state ? { state: item.state } : {}),
					...entry,
					ms: Date.now() - started,
				};
				done++;
				process.stdout.write(`\r  ${done}/${items.length} items`);
			}
		};
		await Promise.all(Array.from({ length: args.concurrency }, worker));
		process.stdout.write("\n");
	} finally {
		await browser.close();
	}

	// Merge into the existing log so an --only run keeps earlier entries.
	const logPath = join(args.out, "capture-log.json");
	let previous = {};
	try {
		previous = JSON.parse(readFileSync(logPath, "utf8")).items ?? {};
	} catch {
		/* first run */
	}
	const merged = { ...previous, ...log };
	const sorted = Object.fromEntries(
		Object.keys(merged)
			.sort()
			.map((k) => [k, merged[k]])
	);
	writeFileSync(
		logPath,
		`${JSON.stringify({ updated: new Date().toISOString(), items: sorted }, null, "\t")}\n`
	);

	console.log(
		`parity capture: ${counts.ok} ok, ${counts.missing} missing, ${counts.error} error -> ${args.out}`
	);
	const errors = Object.entries(log).filter(([, e]) => e.status === "error");
	if (errors.length) {
		console.error(
			`\n${errors.length} item(s) failed:\n  ${errors.map(([id, e]) => `${id}: ${e.error}`).join("\n  ")}`
		);
		process.exitCode = 1;
	}
}

main().catch((err) => {
	console.error(`parity capture: ${err.message}`);
	process.exit(1);
});
