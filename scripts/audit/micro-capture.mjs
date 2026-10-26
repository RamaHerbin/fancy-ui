#!/usr/bin/env node
/**
 * Micro-interaction capture, dynamic half of rubric axis A3 (CONTRACTS section
 * 4: hover is a preview, never the only path).
 *
 * For each component and framework it opens the parity stage on the real clock
 * (800x500, dark theme) and photographs four states of the first interactive
 * element it finds (or the stage centre when there is none):
 *
 *   rest    pointer parked outside the stage
 *   hover   pointer rested on the target for 700 ms
 *   press   pointer held down for 200 ms
 *   focus   a fresh page load, keyboard Tab until focus lands inside the stage
 *
 * A second fresh load of the rest state gives a noise floor. Ratios (share of
 * pixels whose largest RGB delta exceeds 24) are written next to the shots:
 * `rest_hover`, `rest_press`, `rest_focus` and `noise`. A state counts as
 * visible when its ratio clears the noise floor by more than 0.004
 * (`microSignal`). The rubric reads A3 off these: a hover that changes pixels
 * with no `focus` twin that also changes pixels is the defect.
 *
 * Usage:
 *   node scripts/audit/micro-capture.mjs [--repo <dir>] [--out <dir>] [--inventory <file>]
 *            [--only slug,slug] [--fw svelte,react,vue] [--concurrency 4]
 *            [--base-svelte <url>] [--base-react <url>] [--base-vue <url>]
 *            [--hover-static <file>] [--self-test]
 *
 *   --hover-static   optional JSON `{ "<slug>": { hoverRules: [{ motionProps: [...] }] } }`
 *                    from a static hover census; components with a motion-bearing
 *                    :hover rule join the default selection. Without it the
 *                    selection is core components, buttons, cards and navigation.
 *
 * Writes components/<slug>/evidence/micro-{rest,hover,focus,press}-<fw>.png and
 * logs/micro-results.json (merged into an existing file, per slug and framework).
 *
 * What this does NOT catch: hover content that needs a second target (a menu
 * item inside a popup), state that depends on data the stage does not seed, and
 * pointer-driven effects that need a path rather than a rest point (use the
 * parity pointer hints for those). It photographs one target per component.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
	FRAMEWORKS,
	PIXEL_THRESHOLD,
	STILL_RATIO,
	installPixelToolkit,
	isMain,
	loadInventory,
	parseArgs,
	parseList,
	resolvePaths,
	stageUrl,
} from "./lib.mjs";

const LAUNCH_ARGS = ["--use-gl=angle", "--use-angle=swiftshader"];
const ALWAYS = new Set([
	"gradient-button",
	"interactive-hover-button",
	"pressable",
	"rainbow-button",
	"ripple-button",
	"shimmer-button",
	"sun-switch",
]);
const INTERACTIVE =
	'[role="button"],button,a[href],[role="link"],input,textarea,[role="textbox"],[role="switch"],[role="checkbox"],[role="tab"],[role="combobox"],select';

/**
 * Slugs to capture: core components, the button family, cards and navigation,
 * plus any component whose static hover census found a motion-bearing rule.
 *
 * @param {{ slug: string, group?: string, category?: string }[]} inventory
 * @param {Record<string, { hoverRules?: { motionProps?: string[] }[] }>} hoverStatic
 * @param {Set<string>|null} only
 */
export function selectSlugs(inventory, hoverStatic = {}, only = null) {
	const set = new Set();
	for (const it of inventory) {
		if (
			it.group === "core" ||
			ALWAYS.has(it.slug) ||
			["cards", "navigation"].includes(it.category ?? "")
		)
			set.add(it.slug);
		if (hoverStatic[it.slug]?.hoverRules?.some((r) => r.motionProps?.length)) set.add(it.slug);
	}
	return [...set].sort().filter((s) => !only || only.has(s));
}

/**
 * Which states changed pixels beyond the noise floor. `ratio` is
 * `{ rest_hover, rest_press, rest_focus, noise }`; a missing ratio is `null`.
 */
export function microSignal(ratio) {
	const noise = ratio.noise ?? 0;
	const vis = (r) => (r == null ? null : r - noise > STILL_RATIO);
	return {
		hover: vis(ratio.rest_hover),
		press: vis(ratio.rest_press),
		focus: vis(ratio.rest_focus),
		// the A3 defect: hover changes the stage, keyboard focus does not
		hoverOnly: vis(ratio.rest_hover) === true && vis(ratio.rest_focus) === false,
	};
}

async function ready(page, fw) {
	const stage = page.locator("[data-parity-stage]").first();
	await stage.waitFor({ state: "attached", timeout: 30000 });
	const t0 = Date.now();
	for (;;) {
		const st = await page.evaluate((fw) => {
			if (document.querySelector("[data-parity-missing]")) return "missing";
			const el = document.querySelector("[data-parity-stage]");
			if (fw !== "svelte")
				return document.documentElement.dataset.parityReady === "1" ? "ok" : "wait";
			return el &&
				el.childElementCount > 0 &&
				!el.querySelector(":scope > .h-64 > .animate-spin.border-t-transparent")
				? "ok"
				: "wait";
		}, fw);
		if (st === "missing") return null;
		if (st === "ok") break;
		if (Date.now() - t0 > 30000) throw new Error("stage not ready");
		await page.waitForTimeout(100);
	}
	await page.evaluate(() => document.fonts.ready);
	await page.waitForLoadState("networkidle", { timeout: 4000 }).catch(() => {});
	await page.waitForTimeout(600);
	return stage;
}

async function target(stage) {
	const box = await stage.boundingBox();
	const loc = stage.locator(INTERACTIVE);
	const n = await loc.count();
	for (let i = 0; i < n; i++) {
		const el = loc.nth(i);
		if (!(await el.isVisible().catch(() => false))) continue;
		if (
			await el
				.evaluate(
					(e) => e.disabled || e.getAttribute("aria-disabled") === "true" || e.type === "hidden"
				)
				.catch(() => false)
		)
			continue;
		const b = await el.boundingBox();
		if (b && b.width > 4 && b.height > 4)
			return {
				x: b.x + b.width / 2,
				y: b.y + b.height / 2,
				kind: "interactive",
				tag: await el.evaluate(
					(e) =>
						e.tagName.toLowerCase() +
						(e.getAttribute("role") ? `[role=${e.getAttribute("role")}]` : "")
				),
			};
	}
	return {
		x: box.x + box.width / 2,
		y: box.y + box.height / 2,
		kind: "centre",
		tag: "stage-centre",
	};
}

async function job(ctxOpts, slug, fw) {
	const { browser, newCaptureContext, paths } = ctxOpts;
	const ev = join(paths.out, "components", slug, "evidence");
	const restB = join(paths.out, "logs", "tmp-restB");
	mkdirSync(ev, { recursive: true });
	mkdirSync(restB, { recursive: true });
	const res = { slug, fw };
	let ctx;
	try {
		ctx = await newCaptureContext(browser, {
			theme: "dark",
			scale: 1,
			viewport: { width: 800, height: 500 },
		});
		// Page 1: rest, hover, press
		let page = await ctx.newPage();
		const errors = [];
		page.on("pageerror", (e) => errors.push(String(e).slice(0, 160)));
		await page.goto(stageUrl(paths.bases, fw, slug), {
			waitUntil: "domcontentloaded",
			timeout: 30000,
		});
		let stage = await ready(page, fw);
		if (!stage) {
			res.status = "missing";
			return res;
		}
		const shot = (name) =>
			stage.screenshot({
				path: join(ev, `micro-${name}-${fw}.png`),
				animations: "allow",
				caret: "initial",
			});
		await page.mouse.move(2, 2);
		await shot("rest");
		const tgt = await target(stage);
		res.target = tgt;
		await page.mouse.move(tgt.x - 30, tgt.y - 30);
		await page.mouse.move(tgt.x, tgt.y, { steps: 8 });
		await page.waitForTimeout(700);
		await shot("hover");
		await page.mouse.down();
		await page.waitForTimeout(200);
		await shot("press");
		await page.mouse.up();
		await page.close();
		// Page 2: fresh load, rest again (noise floor), keyboard focus
		page = await ctx.newPage();
		page.on("pageerror", (e) => errors.push(String(e).slice(0, 160)));
		await page.goto(stageUrl(paths.bases, fw, slug), {
			waitUntil: "domcontentloaded",
			timeout: 30000,
		});
		stage = await ready(page, fw);
		await stage.screenshot({ path: join(restB, `${slug}-${fw}.png`), animations: "allow" });
		let landed = false;
		let tabs = 0;
		for (; tabs < 14 && !landed; tabs++) {
			await page.keyboard.press("Tab");
			landed = await page.evaluate(() => {
				const a = document.activeElement;
				const s = document.querySelector("[data-parity-stage]");
				return !!a && a !== document.body && !!s && s.contains(a);
			});
		}
		res.focus = {
			landed,
			tabs,
			active: landed
				? await page.evaluate(() => {
						const a = document.activeElement;
						return (
							a.tagName.toLowerCase() +
							(a.getAttribute("role") ? `[role=${a.getAttribute("role")}]` : "") +
							(a.matches(":focus-visible") ? " :focus-visible" : " (not focus-visible)")
						);
					})
				: null,
		};
		await page.waitForTimeout(300);
		await stage.screenshot({ path: join(ev, `micro-focus-${fw}.png`), animations: "allow" });
		res.errors = errors;
		res.status = "ok";
	} catch (e) {
		res.status = "error";
		res.error = String(e).slice(0, 200);
	} finally {
		await ctx?.close().catch(() => {});
	}
	return res;
}

export function selfTest() {
	const fail = (m) => {
		console.error(`micro-capture self-test FAILED: ${m}`);
		process.exit(1);
	};
	const inv = [
		{ slug: "a", group: "core", category: "actions" },
		{ slug: "b", group: "fancy", category: "text" },
		{ slug: "c", group: "fancy", category: "cards" },
		{ slug: "pressable", group: "fancy", category: "effects" },
		{ slug: "d", group: "fancy", category: "effects" },
	];
	const hov = {
		d: { hoverRules: [{ motionProps: ["transform"] }] },
		b: { hoverRules: [{ motionProps: [] }] },
	};
	if (selectSlugs(inv, hov).join() !== "a,c,d,pressable") fail("selectSlugs");
	if (selectSlugs(inv, hov, new Set(["c", "zzz"])).join() !== "c") fail("selectSlugs --only");
	const s = microSignal({ rest_hover: 0.05, rest_press: 0.0, rest_focus: 0.0, noise: 0.001 });
	if (s.hover !== true || s.press !== false || !s.hoverOnly) fail("microSignal hover-only");
	const t = microSignal({ rest_hover: 0.05, rest_press: null, rest_focus: 0.04, noise: 0 });
	if (t.hoverOnly || t.press !== null) fail("microSignal twin");
	console.log("micro-capture self-test ok");
}

async function main() {
	const { opts, flags } = parseArgs(process.argv.slice(2), ["self-test"]);
	if (flags.has("self-test")) return selfTest();
	const paths = resolvePaths(opts);
	const fws = (opts.fw ?? FRAMEWORKS.join(",")).split(",");
	const conc = Number(opts.concurrency ?? 4);
	const inv = loadInventory(paths.inventory);
	const hoverPath = opts["hover-static"];
	const hoverStatic =
		hoverPath && existsSync(hoverPath) ? JSON.parse(readFileSync(hoverPath, "utf8")) : {};
	const slugs = selectSlugs(inv, hoverStatic, parseList(opts.only));
	const { chromium } = await import("@playwright/test");
	const { newCaptureContext } = await import("../lib/stage-capture.mjs");

	const jobs = slugs.flatMap((s) => fws.map((fw) => [s, fw]));
	const t0 = Date.now();
	const browser = await chromium.launch({ args: LAUNCH_ARGS });
	const results = [];
	let next = 0;
	await Promise.all(
		Array.from({ length: conc }, async () => {
			while (next < jobs.length) {
				const [s, fw] = jobs[next++];
				const r = await job({ browser, newCaptureContext, paths }, s, fw);
				results.push(r);
				process.stdout.write(`${results.length}/${jobs.length} ${s}/${fw} ${r.status}\n`);
			}
		})
	);

	// pixel ratios, in a blank Chromium page (RGB only, threshold 24)
	const tk = await browser.newPage();
	await installPixelToolkit(tk);
	const b64 = (p) => readFileSync(p).toString("base64");
	const R = (a, b) =>
		tk.evaluate(([x, y, t]) => window.__px.ratio(x, y, t, 3), [a, b, PIXEL_THRESHOLD]);
	for (const r of results) {
		if (r.status !== "ok") continue;
		const ev = join(paths.out, "components", r.slug, "evidence");
		const rest = b64(join(ev, `micro-rest-${r.fw}.png`));
		r.ratio = {
			rest_focus: await R(rest, b64(join(ev, `micro-focus-${r.fw}.png`))),
			rest_hover: await R(rest, b64(join(ev, `micro-hover-${r.fw}.png`))),
			rest_press: await R(rest, b64(join(ev, `micro-press-${r.fw}.png`))),
			noise: await R(rest, b64(join(paths.out, "logs", "tmp-restB", `${r.slug}-${r.fw}.png`))),
		};
		r.signal = microSignal(r.ratio);
	}
	await browser.close();
	const outPath = join(paths.out, "logs", "micro-results.json");
	let prev = {};
	try {
		prev = JSON.parse(readFileSync(outPath, "utf8"));
	} catch {
		/* first run */
	}
	for (const r of results) (prev[r.slug] ??= {})[r.fw] = r;
	mkdirSync(join(paths.out, "logs"), { recursive: true });
	writeFileSync(outPath, JSON.stringify(prev, null, 1));
	const n = (st) => results.filter((r) => r.status === st).length;
	console.log(
		`done ${results.length} jobs in ${((Date.now() - t0) / 1000).toFixed(0)}s; ok=${n("ok")} missing=${n("missing")} error=${n("error")}`
	);
}

if (isMain(process.argv[1], import.meta.url)) {
	main().catch((e) => {
		console.error(e);
		process.exit(1);
	});
}
