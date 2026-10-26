#!/usr/bin/env node
/**
 * Local accessibility sweep, rubric axis A8, over the Svelte parity stage.
 *
 * Injects axe-core at runtime (downloaded once from a public CDN and cached
 * under `<out>/logs/tmp/`; no dependency is added) into
 * `<base-svelte>/_parity/<slug>?theme=<light|dark>` and runs it on the stage in
 * both themes. Before every run it waits for fonts, finishes every Web
 * Animation, and waits 300 ms, so a half-faded node is not scored. When a
 * serious or critical hit shows up it waits 4 s of real time, settles again and
 * keeps only the second pass, because staggered timer-driven reveals cannot be
 * finished through the animation API.
 *
 * Components with an `open` state in `scripts/parity/hints/<slug>.json` (or the
 * built-in rules for the context menu, tooltip and hover card) are scanned again
 * with the popup open, and overlays get a keyboard check: opens, focus moves
 * inside, Escape closes, focus returns.
 *
 * Nodes the demo harness supplies rather than the component are tagged
 * `demo: true` and kept out of the component score (they stay in `axe.json`
 * under `demo_hits`): anything under a `[data-demo]` ancestor, anything outside
 * the stage that is not a popup root, and any rule listed in an optional
 * `--demo-rules` file.
 *
 * Usage:
 *   node scripts/audit/axe-sweep.mjs [--repo <dir>] [--out <dir>] [--inventory <file>]
 *            [--only slug,slug] [--concurrency 4] [--base-svelte <url>]
 *            [--demo-rules <file>] [--self-test]
 *
 *   --demo-rules   JSON array of `{ slug, rule, re, why }`: a violation of axe
 *                  rule `rule` in component `slug` whose node HTML matches the
 *                  regular expression `re` is tagged as demo chrome, with `why`.
 *
 * Writes components/<slug>/evidence/axe.json.
 *
 * What this does NOT catch: anything axe cannot see (focus order sense, label
 * wording, motion), colour contrast on content that only appears in a state the
 * sweep does not reach, and screen reader behaviour. CI runs the Playwright a11y
 * spec for the gate; this is the wider local sweep that also records demo hits.
 */

import fs from "node:fs";
import { join } from "node:path";
import { isMain, loadInventory, parseArgs, parseList, resolvePaths } from "./lib.mjs";

export const AXE_VERSION = "4.10.2";
export const AXE_URL = `https://cdnjs.cloudflare.com/ajax/libs/axe-core/${AXE_VERSION}/axe.min.js`;
const THEMES = ["light", "dark"];
const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"];
export const OVERLAYS = new Set(
	"dialog alert-dialog drawer sheet popover hover-card tooltip dropdown-menu context-menu command-menu select combobox autocomplete date-picker time-picker".split(
		" "
	)
);
const POPUP =
	"[role=dialog],[role=alertdialog],[role=listbox],[role=menu],[role=tooltip],[popover]";
const INCLUDE_OPEN = ["[data-parity-stage]", ...POPUP.split(",")];

// Runs in the page: settle, then axe, then classify every node as demo chrome or component.
const runAxe = (page, include, slug, curated) =>
	page.evaluate(
		async ({ tags, include, popup, slug, curated }) => {
			await document.fonts.ready;
			// streaming demos keep inserting `.ft-fresh` tint spans (350 ms tint from opacity .6): wait up to 8 s for the stream to go quiet
			for (let i = 0; i < 80 && document.querySelector("[data-parity-stage] .ft-fresh"); i++)
				await new Promise((r) => setTimeout(r, 100));
			document.getAnimations().forEach((a) => {
				try {
					a.finish();
				} catch {
					/* already finished */
				}
			});
			await new Promise((r) => setTimeout(r, 300));
			const inc = include.filter((s) => document.querySelector(s));
			const run = () =>
				window.axe.run(
					{ include: inc.map((s) => [s]) },
					{ runOnly: tags, resultTypes: ["violations", "incomplete"] }
				);
			let res = await run();
			// timer-driven reveals (staggered words etc.) are not WAAPI animations, finish() cannot settle them: if anything serious/critical
			// shows up, wait 4 s of real time, finish again, and keep only the second pass (hits that persist)
			if (res.violations.some((v) => ["serious", "critical"].includes(v.impact))) {
				await new Promise((r) => setTimeout(r, 4000));
				document.getAnimations().forEach((a) => {
					try {
						a.finish();
					} catch {
						/* already finished */
					}
				});
				await new Promise((r) => setTimeout(r, 300));
				res = await run();
			}
			const conv = (v) => ({
				id: v.id,
				impact: v.impact,
				help: v.help,
				nodes: v.nodes.map((n) => {
					let reason = null;
					let el = null;
					try {
						if (n.target.length === 1) el = document.querySelector(n.target[0]);
					} catch {
						/* selector not queryable (shadow / iframe) */
					}
					if (el) {
						if (el.closest("[data-demo]")) reason = "[data-demo] ancestor";
						else if (!el.closest("[data-parity-stage]") && !el.closest(popup))
							reason = "outside [data-parity-stage] (not a popup root)";
					}
					let transient = false;
					if (!reason && el?.closest(".ft-fresh")) transient = true;
					if (!reason && !transient) {
						const c = curated.find(
							(c) => c.slug === slug && c.rule === v.id && new RegExp(c.re).test(n.html)
						);
						if (c) reason = "listed demo rule: " + c.why;
					}
					return {
						target: n.target.join(" "),
						html: n.html.slice(0, 240),
						summary: (n.failureSummary || "").replace(/\s+/g, " ").slice(0, 320),
						demo: !!reason,
						demo_reason: reason,
						transient,
					};
				}),
			});
			return {
				sc: res.violations.filter((v) => ["serious", "critical"].includes(v.impact)).map(conv),
				moderate: res.violations.filter((v) => v.impact === "moderate").map(conv),
				minor: res.violations.filter((v) => v.impact === "minor").length,
				incomplete: res.incomplete.length,
			};
		},
		{ tags: TAGS, include, popup: POPUP, slug, curated }
	);

/**
 * Component-scored result (demo nodes removed) plus the demo hits, for one state.
 * A node inside a still-streaming `.ft-fresh` tint span (transient by design) is
 * excluded and kept in the demo hits as transient.
 *
 * @param {{ sc: any[], moderate: any[], minor: number, incomplete: number }} r
 */
export function split(r) {
	const comp = { seriousCritical: [], moderate: [], minor: r.minor, incomplete: r.incomplete };
	const demo = [];
	const cut = (list, into, tag) => {
		for (const v of list) {
			v.nodes.forEach((n) => {
				if (n.transient) {
					n.demo = true;
					n.demo_reason = "transient: .ft-fresh streaming tint still running after 8 s";
				}
			});
			const keep = v.nodes.filter((n) => !n.demo);
			const dm = v.nodes.filter((n) => n.demo);
			const base = { id: v.id, impact: v.impact, help: v.help };
			if (keep.length)
				into.push({
					...base,
					nodes: keep.length,
					targets: keep.slice(0, 3).map((n) => n.target),
					html: keep.slice(0, 1).map((n) => n.html),
					summary: keep[0].summary,
				});
			if (dm.length)
				demo.push({
					...base,
					severity: tag,
					demo: true,
					nodes: dm.length,
					targets: dm.slice(0, 3).map((n) => n.target),
					html: dm.slice(0, 1).map((n) => n.html),
					demo_reason: dm[0].demo_reason,
				});
		}
	};
	cut(r.sc, comp.seriousCritical, "serious+critical");
	cut(r.moderate, comp.moderate, "moderate");
	return { comp, demo };
}

/** Serious + critical rule hits owned by the component in one theme, rest and open states. */
export function countSeriousCritical(result, theme) {
	return ["rest", "open"].reduce(
		(n, st) => n + (result.themes[theme]?.[st]?.seriousCritical?.length ?? 0),
		0
	);
}

/** Read a slug's parity hint (`{ states: { open: { steps } } }`), or `{}`. */
export function readHint(repo, slug) {
	const p = join(repo, "scripts", "parity", "hints", `${slug}.json`);
	return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, "utf8")) : {};
}

const loc = (page, t) => page.getByRole(t.role, t.name ? { name: t.name } : {}).first();

async function openState(page, slug, hint) {
	const steps = hint.states?.open?.steps;
	if (steps) {
		for (const s of steps) {
			if (s.click) await loc(page, s.click).click({ timeout: 4000 });
			else if (s.hover) await loc(page, s.hover).hover({ timeout: 4000 });
			else if (s.focus) await loc(page, s.focus).focus({ timeout: 4000 });
			else if (s.press) await page.keyboard.press(s.press);
			else if (s.type) await page.keyboard.type(s.type);
		}
		return "hint";
	}
	const stage = page.locator("[data-parity-stage]");
	if (slug === "context-menu") {
		const box = await stage.boundingBox();
		await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2, { button: "right" });
		return "right-click-center";
	}
	const trig = stage
		.locator('button, [role=combobox], input, [aria-haspopup], [tabindex="0"]')
		.first();
	if (slug === "tooltip" || slug === "hover-card") await trig.focus();
	else await trig.click({ timeout: 4000 });
	return "first-trigger";
}

const activeInfo = (page) =>
	page.evaluate((sel) => {
		const a = document.activeElement;
		if (!a || a === document.body) return { inside: false, tag: "body" };
		return {
			inside: !!a.closest(sel),
			tag: a.tagName.toLowerCase(),
			role: a.getAttribute("role"),
			name: (a.getAttribute("aria-label") || a.textContent || "").trim().slice(0, 40),
		};
	}, POPUP);

async function keyboard(page, base, slug, hint) {
	const k = { opened: false };
	try {
		await page.goto(`${base}/_parity/${slug}?theme=dark`, { waitUntil: "networkidle" });
		await page.waitForSelector("[data-parity-stage]");
		k.via = await openState(page, slug, hint);
		await page.waitForTimeout(500);
		k.opened = await page
			.locator(POPUP)
			.first()
			.isVisible()
			.catch(() => false);
		const fi = await activeInfo(page);
		k.focusInside = fi;
		const nonModalHover = slug === "tooltip" || slug === "hover-card";
		k.focusMovedInside = fi.inside ? true : nonModalHover ? "n/a-nonmodal" : false;
		await page.keyboard.press("Escape");
		await page.waitForTimeout(500);
		k.closed = !(await page
			.locator(POPUP)
			.first()
			.isVisible()
			.catch(() => false));
		const after = await activeInfo(page);
		k.focusAfter = after;
		k.focusReturned = after.tag !== "body" && !after.inside;
		// combobox-like widgets keep focus on the input (role=combobox) while the popup is open: count as inside
		const comboLike = [
			"combobox",
			"autocomplete",
			"select",
			"command-menu",
			"date-picker",
			"time-picker",
		].includes(slug);
		if (comboLike && fi.role === "combobox") k.focusMovedInside = "focus-stays-on-combobox";
		k.pass = k.opened && k.focusMovedInside !== false && k.closed && k.focusReturned;
	} catch (e) {
		k.error = String(e.message).split("\n")[0];
		k.pass = false;
	}
	return k;
}

async function one(ctx, slug) {
	const { browser, axeSrc, paths, curated } = ctx;
	const base = paths.bases.svelte;
	const out = {
		slug,
		axeVersion: AXE_VERSION,
		settle: "fonts.ready + getAnimations().finish() + 300ms",
		themes: {},
		demo_hits: [],
		keyboard: null,
		errors: [],
	};
	const hint = readHint(paths.repo, slug);
	for (const theme of THEMES) {
		const bctx = await browser.newContext({ viewport: { width: 1000, height: 700 } });
		const page = await bctx.newPage();
		const t = { rest: null, open: null };
		try {
			await page.goto(`${base}/_parity/${slug}?theme=${theme}`, {
				waitUntil: "networkidle",
				timeout: 30000,
			});
			await page.waitForSelector("[data-parity-stage]", { timeout: 15000 });
			await page.evaluate(axeSrc);
			const r = split(await runAxe(page, ["[data-parity-stage]"], slug, curated));
			t.rest = r.comp;
			r.demo.forEach((d) => out.demo_hits.push({ theme, state: "rest", ...d }));
			if (hint.states?.open) {
				try {
					await openState(page, slug, hint);
					await page.waitForTimeout(500);
					const o = split(await runAxe(page, INCLUDE_OPEN, slug, curated));
					t.open = o.comp;
					o.demo.forEach((d) => out.demo_hits.push({ theme, state: "open", ...d }));
				} catch (e) {
					t.open = { error: String(e.message).split("\n")[0] };
				}
			}
			if (theme === "dark" && OVERLAYS.has(slug))
				out.keyboard = await keyboard(page, base, slug, hint);
		} catch (e) {
			out.errors.push(`${theme}: ${String(e.message).split("\n")[0]}`);
		}
		out.themes[theme] = t;
		await bctx.close();
	}
	// dark-theme views kept at the top level for summary scripts
	out.theme = "dark";
	out.rest = out.themes.dark.rest;
	out.open = out.themes.dark.open;
	const dir = join(paths.out, "components", slug, "evidence");
	fs.mkdirSync(dir, { recursive: true });
	fs.writeFileSync(join(dir, "axe.json"), JSON.stringify(out, null, 1));
	return out;
}

/** axe source, cached locally after the first successful download (CDN timeouts happen), retried 5x. */
async function loadAxe(cachePath) {
	let src = fs.existsSync(cachePath) ? fs.readFileSync(cachePath, "utf8") : "";
	for (let i = 0; !src && i < 5; i++) {
		try {
			src = await (await fetch(AXE_URL)).text();
			fs.mkdirSync(join(cachePath, ".."), { recursive: true });
			fs.writeFileSync(cachePath, src);
		} catch {
			await new Promise((r) => setTimeout(r, 3000));
		}
	}
	if (!src.includes("axe")) throw new Error("axe download failed");
	return src;
}

export function selfTest() {
	const fail = (m) => {
		console.error(`axe-sweep self-test FAILED: ${m}`);
		process.exit(1);
	};
	const node = (demo, transient = false) => ({
		target: "#a",
		html: "<p>",
		summary: "",
		demo,
		demo_reason: demo ? "demo" : null,
		transient,
	});
	const r = split({
		sc: [
			{
				id: "color-contrast",
				impact: "serious",
				help: "h",
				nodes: [node(false), node(true), node(false, true)],
			},
		],
		moderate: [{ id: "region", impact: "moderate", help: "h", nodes: [node(true)] }],
		minor: 2,
		incomplete: 1,
	});
	if (r.comp.seriousCritical.length !== 1 || r.comp.seriousCritical[0].nodes !== 1)
		fail("component nodes");
	if (r.demo.length !== 2 || r.demo[0].nodes !== 2) fail("demo hits include transient");
	if (r.comp.moderate.length !== 0 || r.comp.minor !== 2) fail("moderate and minor");
	const res = {
		themes: { dark: { rest: r.comp, open: { error: "x" } }, light: { rest: null, open: null } },
	};
	if (countSeriousCritical(res, "dark") !== 1 || countSeriousCritical(res, "light") !== 0)
		fail("count");
	if (!AXE_URL.includes(AXE_VERSION)) fail("url");
	console.log("axe-sweep self-test ok");
}

async function main() {
	const { opts, flags } = parseArgs(process.argv.slice(2), ["self-test"]);
	if (flags.has("self-test")) return selfTest();
	const paths = resolvePaths(opts);
	const only = parseList(opts.only);
	const conc = Number(opts.concurrency ?? 4);
	const slugs = loadInventory(paths.inventory)
		.map((i) => i.slug)
		.filter((s) => !only || only.has(s));
	const curated = opts["demo-rules"] ? JSON.parse(fs.readFileSync(opts["demo-rules"], "utf8")) : [];
	const axeSrc = await loadAxe(join(paths.out, "logs", "tmp", `axe-${AXE_VERSION}.min.js`));
	const { chromium } = await import("@playwright/test");
	const browser = await chromium.launch();
	const t0 = Date.now();
	const queue = [...slugs];
	const results = [];
	await Promise.all(
		Array.from({ length: conc }, async () => {
			while (queue.length)
				results.push(await one({ browser, axeSrc, paths, curated }, queue.shift()));
		})
	);
	await browser.close();
	const sc = results.reduce(
		(n, r) => n + countSeriousCritical(r, "dark") + countSeriousCritical(r, "light"),
		0
	);
	console.log(
		`done ${results.length} slugs in ${((Date.now() - t0) / 1000).toFixed(0)}s; component serious+critical rule-hits (both themes)=${sc}; demo_hits=${results.reduce((n, r) => n + r.demo_hits.length, 0)}; errors=${results.filter((r) => r.errors.length).length}`
	);
}

if (isMain(process.argv[1], import.meta.url)) {
	main().catch((e) => {
		console.error(e);
		process.exit(1);
	});
}
