#!/usr/bin/env node
/**
 * Contact sheets, capture triage and the ambient-loop invariant.
 *
 * Reads the output of scripts/parity/capture.mjs (`<parity dir>/capture-log.json`,
 * `scores.json`, `shots/<fw>/<slug>/<theme>-<ms>[-hover].png`) and, per component:
 *
 *   - lays the shots out as a grid (rows: svelte | react | vue, columns: the seven
 *     moments 0, 150, 300, 600, 1200, 2000, 4000 ms) and writes
 *     evidence/sheet-<theme>.png, plus sheet-hover-<theme>.png when a pointer
 *     pass exists. Pixel work happens in headless Chromium (no image library).
 *   - slices the capture log and parity scores into evidence/capture-log.json and
 *     evidence/parity.json, and tallies console errors.
 *   - checks the ambient invariant for loop-driven components: at least two later
 *     frames must differ from frame 0. The test is per region, not per stage: the
 *     stage is cut into a 16 x 10 grid and a frame counts as different when any
 *     tile has more than 1% of its pixels changed (threshold 24). A whole-stage
 *     ratio gate (0.004) misses small loops (three dots, a thin streak) that
 *     are plainly moving; a tile does not.
 *   - classifies `capturable` (full | rest-only | pointer-pass | none).
 *
 * The AMBIENT list holds components whose loop runs on its own. A component that
 * only reacts to the pointer, to a value change or to a state flip does not
 * belong in it (it would be reported as a dead loop); keep it to timer, rAF and
 * `infinite` keyframe loops.
 *
 * Usage:
 *   node scripts/audit/sheet.mjs [--repo <dir>] [--out <dir>] [--inventory <file>]
 *            [--parity <dir>] [--only slug,slug] [--no-sheets] [--self-test]
 *
 * Writes components/<slug>/partial-S2.json and logs/S2-results.json.
 *
 * What this does NOT catch: a loop whose period is longer than the capture window
 * (4 s; timer-driven swaps every 3 to 5 s need a real-clock capture), a loop too
 * faint to cross threshold 24 (reported as dead, check at threshold 6 by eye), and
 * anything outside the 800x500 stage.
 */

import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
	FRAMEWORKS,
	PIXEL_THRESHOLD,
	REGION_RATIO_MIN,
	THEMES,
	ambientVerdict,
	installPixelToolkit,
	isMain,
	loadInventory,
	parseArgs,
	parseList,
	resolvePaths,
} from "./lib.mjs";

export const MOMENTS = [0, 150, 300, 600, 1200, 2000, 4000];

/** Components whose loop runs without any input (timer, rAF or `infinite` keyframes). */
export const AMBIENT = new Set([
	"animated-beam",
	"border-beam",
	"glow-border",
	"neon-border",
	"pulse-beam",
	"meteors",
	"marquee",
	"pixel-loader",
	"thinking-indicator",
	"typing-indicator",
	"flip-words",
	"container-text-flip",
	"colourful-text",
	"sparkles-text",
	"matrix-rain",
	"bg-falling-stars",
	"bg-stars",
	"flickering-grid",
	"sparkles",
	"mosaic-glow",
	"skeleton",
	"logo-cloud",
	"line-shadow-text",
	"terminal-text",
	"pixel-scene",
]);
/** Driven by the pointer: empty or static at rest. */
export const POINTER = new Set([
	"fluid-cursor",
	"smooth-cursor",
	"image-trail-cursor",
	"magnetic",
	"magnetic-field",
	"card-3d",
	"glare-card",
	"compare",
	"glowing-effect",
	"direction-aware-hover",
	"card-spotlight",
	"interactive-grid-pattern",
	"dock",
]);
/** HDR / GPU only, scroll-driven, or ripple rings: a rest frame is all the stage can show. */
export const RESTONLY = new Set([
	"fireworks-hdr",
	"mosaic-glow",
	"pixel-scene",
	"sun-switch",
	"story-thread",
	"sticky-scroll",
	"tracing-beam",
	"scroll-progress",
	"timeline",
	"reveal",
	"container-scroll",
	"tick-nav",
	"scroll-anchor",
	"ripple",
]);

/**
 * `capturable` and its reason from the capture-log entries of one slug.
 *
 * @param {{ slug: string, entries: [string, any][], hasHover: boolean, hasHint: boolean }} x
 */
export function classifyCapturable({ slug, entries, hasHover, hasHint }) {
	const sv = entries.filter(([, v]) => v.fw === "svelte" && !v.pointer);
	if (!sv.some(([, v]) => v.status === "ok"))
		return { capturable: "none", why: "no ok svelte rest item" };
	if (RESTONLY.has(slug))
		return {
			capturable: "rest-only",
			why: "hdr/gpu/scroll-driven/ripple: the stage cannot show it",
		};
	if (POINTER.has(slug))
		return {
			capturable: "pointer-pass",
			why:
				"pointer-driven; rest frame mostly static" + (hasHover ? "" : "; NO hover shots present"),
		};
	return { capturable: "full", why: hasHint ? "rest + hinted pointer pass" : "rest pass" };
}

/** Ports with no ok item in the capture log. */
export function missingPorts(entries) {
	return FRAMEWORKS.filter(
		(fw) => fw !== "svelte" && !entries.some(([, v]) => v.fw === fw && v.status === "ok")
	);
}

/** Does this slug get the ambient invariant? Listed loops and every background. */
export function isAmbientCandidate(slug, category) {
	return AMBIENT.has(slug) || category === "backgrounds";
}

/** Browser-side contact sheet (injected as source). */
const SHEET_SOURCE = `
window.__sheet = async function ({ slug, theme, hover, cells }) {
	const CW = 400, CH = 250, G = 6, LH = 22, HEAD = 26;
	const cols = cells[0].length;
	const canvas = document.createElement("canvas");
	canvas.width = cols * CW + (cols + 1) * G;
	canvas.height = HEAD + 3 * (CH + G) + G;
	const ctx = canvas.getContext("2d");
	ctx.fillStyle = "#2b2b2b";
	ctx.fillRect(0, 0, canvas.width, canvas.height);
	ctx.font = "600 14px ui-sans-serif, system-ui, sans-serif";
	ctx.fillStyle = "#fff";
	ctx.textBaseline = "middle";
	ctx.fillText(slug + "  " + theme + (hover ? "  hover" : "") + "  (rows: svelte | react | vue)", G + 4, HEAD / 2);
	for (let r = 0; r < 3; r++) {
		for (let c = 0; c < cols; c++) {
			const x = G + c * (CW + G);
			const y = HEAD + r * (CH + G) + G;
			const cell = cells[r][c];
			if (cell.data) {
				ctx.drawImage(await window.__px.decode(cell.data), x, y, CW, CH);
			} else {
				ctx.fillStyle = "#1a1a1a";
				ctx.fillRect(x, y, CW, CH);
				ctx.fillStyle = "#999";
				ctx.font = "13px ui-sans-serif, system-ui, sans-serif";
				ctx.fillText("missing", x + CW / 2 - 24, y + CH / 2);
			}
			const text = cell.fw + ", " + cell.t + " ms";
			ctx.font = "600 12px ui-sans-serif, system-ui, sans-serif";
			const w = ctx.measureText(text).width + 12;
			ctx.fillStyle = "rgba(0,0,0,0.72)";
			ctx.fillRect(x + 4, y + 4, w, LH - 4);
			ctx.fillStyle = "#fff";
			ctx.fillText(text, x + 10, y + 4 + (LH - 4) / 2);
		}
	}
	const url = canvas.toDataURL("image/png");
	return url.slice(url.indexOf(",") + 1);
};
/** Largest tile ratio of every frame against frame 0. */
window.__ambient = async function ({ frames, threshold }) {
	const ref = frames[0];
	const out = [];
	for (let i = 1; i < frames.length; i++) {
		const r = ref && frames[i] ? await window.__px.regions(ref, frames[i], threshold, 16, 10) : null;
		out.push(r ? r.max : null);
	}
	return out;
};`;

export function selfTest() {
	const fail = (m) => {
		console.error(`sheet self-test FAILED: ${m}`);
		process.exit(1);
	};
	for (const s of [
		"displacement-text",
		"hyper-text",
		"liquid-text",
		"text-roll",
		"frosted-glass",
		"liquid-glass",
	])
		if (AMBIENT.has(s)) fail(`${s} reacts to input, not an ambient loop`);
	if (!isAmbientCandidate("marquee", "layout") || !isAmbientCandidate("zzz", "backgrounds"))
		fail("ambient candidates");
	if (isAmbientCandidate("button", "actions")) fail("button is not ambient");
	const ok = (fw, extra = {}) => [`${fw}-k`, { fw, status: "ok", ...extra }];
	const c1 = classifyCapturable({
		slug: "x",
		entries: [ok("svelte")],
		hasHover: false,
		hasHint: true,
	});
	if (c1.capturable !== "full") fail("full");
	if (
		classifyCapturable({ slug: "x", entries: [], hasHover: false, hasHint: false }).capturable !==
		"none"
	)
		fail("none");
	if (
		classifyCapturable({
			slug: "sun-switch",
			entries: [ok("svelte")],
			hasHover: false,
			hasHint: false,
		}).capturable !== "rest-only"
	)
		fail("rest-only");
	if (
		classifyCapturable({ slug: "dock", entries: [ok("svelte")], hasHover: false, hasHint: false })
			.capturable !== "pointer-pass"
	)
		fail("pointer-pass");
	if (missingPorts([ok("svelte"), ok("react")]).join() !== "vue") fail("missingPorts");
	if (ambientVerdict([0.002, 0.03, 0.05]).pass !== true) fail("ambient pass");
	if (ambientVerdict([0.002, 0.03, null]).pass !== false) fail("ambient fail");
	if (REGION_RATIO_MIN !== 0.01 || PIXEL_THRESHOLD !== 24) fail("constants");
	console.log("sheet self-test ok");
}

async function main() {
	const { opts, flags } = parseArgs(process.argv.slice(2), ["self-test", "no-sheets"]);
	if (flags.has("self-test")) return selfTest();
	const paths = resolvePaths(opts);
	const only = parseList(opts.only);
	const noSheets = flags.has("no-sheets");
	const inventory = loadInventory(paths.inventory);
	const slugs = inventory.map((i) => i.slug).filter((s) => !only || only.has(s));
	const log = JSON.parse(readFileSync(join(paths.parity, "capture-log.json"), "utf8")).items;
	const scores = JSON.parse(readFileSync(join(paths.parity, "scores.json"), "utf8"));
	const hintsDir = join(paths.repo, "scripts", "parity", "hints");
	const hints = {};
	for (const f of readdirSync(hintsDir))
		hints[f.replace(/\.json$/, "")] = JSON.parse(readFileSync(join(hintsDir, f), "utf8"));

	const b64 = (p) => (existsSync(p) ? readFileSync(p).toString("base64") : null);
	const shot = (fw, slug, theme, t, hover) =>
		join(paths.parity, "shots", fw, slug, `${theme}-${t}${hover ? "-hover" : ""}.png`);
	const evDir = (s) => join(paths.out, "components", s, "evidence");
	const triage = {
		items: { ok: {}, missing: {}, skipped: {}, error: {} },
		nonOk: [],
		consoleErrors: [],
		pngs: 0,
	};
	for (const fw of FRAMEWORKS) for (const k of Object.keys(triage.items)) triage.items[k][fw] = 0;

	const { chromium } = await import("@playwright/test");
	const browser = await chromium.launch();
	const page = await browser.newPage();
	await installPixelToolkit(page);
	await page.addScriptTag({ content: SHEET_SOURCE });
	let nSheets = 0;
	const results = {};

	for (const slug of slugs) {
		mkdirSync(evDir(slug), { recursive: true });
		const entries = Object.entries(log).filter(([, v]) => v.slug === slug);
		writeFileSync(
			join(evDir(slug), "capture-log.json"),
			JSON.stringify(Object.fromEntries(entries), null, 2)
		);
		writeFileSync(join(evDir(slug), "parity.json"), JSON.stringify(scores[slug] ?? null, null, 2));
		for (const [key, v] of entries) {
			triage.items[v.status] ??= {};
			triage.items[v.status][v.fw] = (triage.items[v.status][v.fw] ?? 0) + 1;
			if (v.status !== "ok")
				triage.nonOk.push(
					`${key}: ${v.status}${v.reason ? " - " + v.reason : ""}${v.error ? " - " + v.error : ""}`
				);
			for (const e of v.consoleErrors ?? [])
				triage.consoleErrors.push(`${key}: ${String(e).slice(0, 200)}`);
			triage.pngs += (v.files ?? []).length;
		}
		let hasHover = false;
		if (!noSheets) {
			for (const theme of THEMES) {
				for (const hover of [false, true]) {
					const cells = FRAMEWORKS.map((fw) =>
						MOMENTS.map((t) => ({ fw, t, data: b64(shot(fw, slug, theme, t, hover)) }))
					);
					if (!cells.some((row) => row.some((c) => c.data))) continue;
					if (hover) hasHover = true;
					const png = await page.evaluate((i) => window.__sheet(i), { slug, theme, hover, cells });
					writeFileSync(
						join(evDir(slug), `sheet${hover ? "-hover" : ""}-${theme}.png`),
						Buffer.from(png, "base64")
					);
					nSheets++;
				}
			}
		} else {
			hasHover =
				existsSync(shot("svelte", slug, "light", 0, true)) ||
				existsSync(shot("svelte", slug, "dark", 0, true));
		}
		// ambient invariant: per-region, Svelte frames, best of the two themes
		let ambient = null;
		const category = inventory.find((i) => i.slug === slug)?.category;
		if (isAmbientCandidate(slug, category)) {
			ambient = { checked: true, regionRatioMin: REGION_RATIO_MIN, byTheme: {} };
			let best = 0;
			for (const theme of THEMES) {
				const frames = MOMENTS.map((t) => b64(shot("svelte", slug, theme, t, false)));
				if (frames.every((f) => !f)) continue;
				const maxRatios = await page.evaluate((i) => window.__ambient(i), {
					frames,
					threshold: PIXEL_THRESHOLD,
				});
				const v = ambientVerdict(maxRatios);
				ambient.byTheme[theme] = { maxRegionRatios: maxRatios, differing: v.differing };
				best = Math.max(best, v.differing);
			}
			ambient.differing = best;
			ambient.pass = best >= 2;
		}
		const { capturable, why } = classifyCapturable({
			slug,
			entries,
			hasHover,
			hasHint: !!hints[slug],
		});
		const partial = {
			slug,
			agent: "S2",
			axes: {},
			fields: {
				capturable,
				capturable_reason: why,
				hover_pass: hasHover,
				missing_ports: missingPorts(entries),
			},
			findings: [],
			uncertain_flags: [],
		};
		if (ambient && !ambient.pass) {
			partial.findings.push({
				id: `${slug}-20`,
				axis: "A6",
				priority: "P2",
				title: `${slug} loop not visible / frozen in capture`,
				detail: `Ambient candidate: only ${ambient.differing} of ${MOMENTS.length - 1} Svelte frames differ from frame 0 in any 50x50 tile by more than ${REGION_RATIO_MIN} (threshold ${PIXEL_THRESHOLD}). Either the loop is dead, the capture pins it, its period is longer than the window, or it renders nothing headless.`,
				evidence: [
					`components/${slug}/evidence/sheet-light.png`,
					`components/${slug}/evidence/sheet-dark.png`,
				],
				verification: "capture",
				verification_cmd: `node scripts/parity/capture.mjs --only ${slug} --moments 0,500,1000,2000,4000 --out .parity-recheck`,
				frameworks: ["svelte"],
				status: "uncertain",
				note: "Resolve with a real-clock capture or an in-browser observation to tell a dead loop from a frozen-clock artefact.",
			});
			partial.uncertain_flags.push(`${slug}-20`);
		}
		if (ambient) partial.fields.ambient_check = ambient;
		writeFileSync(
			join(paths.out, "components", slug, "partial-S2.json"),
			JSON.stringify(partial, null, 2)
		);
		results[slug] = {
			capturable,
			ambient: ambient ? { differing: ambient.differing, pass: ambient.pass } : null,
			missingPorts: partial.fields.missing_ports,
		};
	}
	await browser.close();
	mkdirSync(join(paths.out, "logs"), { recursive: true });
	writeFileSync(
		join(paths.out, "logs", "S2-results.json"),
		JSON.stringify({ results, triage, nSheets }, null, 2)
	);
	console.log(
		JSON.stringify({ slugs: slugs.length, nSheets, pngs: triage.pngs, nonOk: triage.nonOk.length })
	);
}

if (isMain(process.argv[1], import.meta.url)) {
	main().catch((e) => {
		console.error(e);
		process.exit(1);
	});
}
