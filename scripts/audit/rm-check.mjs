#!/usr/bin/env node
/**
 * Reduced-motion check, dynamic half of rubric axis A2 (CONTRACTS section 5).
 *
 * Reads two capture sets that scripts/parity/capture.mjs produced and compares
 * them in headless Chromium (pixel work in a canvas, threshold 24, the same
 * approach as scripts/parity/diff.mjs):
 *
 *   <rm dir>/shots/<fw>/<slug>/<theme>-<ms>.png       captured with --reduced-motion reduce
 *   <parity dir>/shots/<fw>/<slug>/<theme>-<ms>.png   captured with no preference
 *
 * Per framework x theme it records:
 *   - motion ratio: do frames move under `reduce`? (t300 vs t1500 vs t3000 when
 *     those exist, else t0 vs t1500). A change only between t0 and t300 is
 *     pre-paint, not motion, and is flagged `pre_paint`.
 *   - end ratio: does the `reduce` end state equal the settled no-preference
 *     state? Only compared when the no-preference run has settled (its t2000 and
 *     t4000 frames agree to under 0.004); otherwise `end_check` says
 *     `ambient-or-unsettled` and the end state does not count.
 *
 * Scores (see lib.mjs `scoreRmDynamic`): 0 = motion plays under reduce, 1 = the
 * end state is skipped, 3 = still and equal end state, null = nothing comparable.
 * Writes per slug evidence/sheet-rm-<theme>.png, evidence/rm-ratios.json and
 * partial-S3.json, and logs/S3b-rm-summary.md.
 *
 * Usage:
 *   node scripts/parity/capture.mjs --reduced-motion reduce --moments 0,300,1500,3000 --out .parity-rm
 *   node scripts/audit/rm-check.mjs [--repo <dir>] [--out <dir>] [--inventory <file>]
 *                                   [--parity <dir>] [--parity-rm <dir>]
 *                                   [--only slug,slug] [--self-test]
 *
 * What this does NOT catch: motion that finishes before t300 (a 200 ms fade
 * played under reduce looks like pre-paint), JS motion the capture clock pins,
 * and anything WebGL/WebGPU draws that headless software rendering cannot show.
 * The static half (static.mjs) covers declarations; neither proves a screen
 * reader or a real compositor behaves.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import {
	END_RATIO,
	FRAMEWORKS,
	PIXEL_THRESHOLD,
	STILL_RATIO,
	THEMES,
	installPixelToolkit,
	isMain,
	loadInventory,
	parseArgs,
	parseList,
	resolvePaths,
	scoreRmDynamic,
} from "./lib.mjs";

const shot = (root, fw, slug, theme, t, suffix = "") =>
	join(root, "shots", fw, slug, `${theme}-${t}${suffix}.png`);
const b64 = (p) => (existsSync(p) ? readFileSync(p).toString("base64") : null);

/**
 * One framework x theme entry from the raw ratios. Pure.
 *
 * @param {{ still: number, r0_300?: number|null, r300_1500?: number|null, r1500_3000?: number|null,
 *           hover?: number|null, end?: number|null, settle?: number|null }} x
 */
export function rmEntry(x) {
	const settled = x.settle != null && x.settle < STILL_RATIO;
	const ambient = x.settle != null && !settled;
	const motionRatio = x.r300_1500 != null ? Math.max(x.r300_1500, x.r1500_3000 ?? 0) : x.still;
	const prePaint = x.r300_1500 != null && x.still >= STILL_RATIO && motionRatio < STILL_RATIO;
	const endCheck = x.end == null ? "no-reference" : settled ? "compared" : "ambient-or-unsettled";
	return {
		still_ratio: x.still,
		motion_ratio: motionRatio,
		pre_paint: prePaint,
		ratio_rm0_rm300: x.r0_300 ?? null,
		ratio_rm300_rm1500: x.r300_1500 ?? null,
		ratio_rm1500_rm3000: x.r1500_3000 ?? null,
		hover_still_ratio: x.hover ?? null,
		end_ratio: x.end ?? null,
		end_check: endCheck,
		ambient,
		nopref_settle_ratio: x.settle ?? null,
	};
}

/**
 * Axis A2 (dynamic) from one slug's entries (`{ "<fw>-<theme>": rmEntry }`).
 * Returns the axis object, the finding (or null) and the bucket name.
 */
export function summariseSlug(slug, entries, motionClass) {
	const list = Object.entries(entries);
	if (motionClass === "static") {
		return {
			bucket: "na_static",
			axis: {
				score: null,
				na_reason: "static",
				evidence: [],
				note: "dynamic: static component (motion_class static); reduced-motion capture still taken for the sheet",
			},
			finding: null,
		};
	}
	if (!list.length) {
		return {
			bucket: "missing",
			axis: {
				score: null,
				na_reason: "not-applicable",
				evidence: [],
				note: "dynamic: no reduced-motion capture produced (see capture log)",
			},
			finding: null,
		};
	}
	const score = scoreRmDynamic(list.map(([, e]) => e));
	const still = (e) =>
		e.motion_ratio < STILL_RATIO &&
		(e.hover_still_ratio == null || e.hover_still_ratio < STILL_RATIO);
	const bad = list.filter(([, e]) => !still(e));
	const noEnd = list.filter(
		([, e]) => e.end_check === "compared" && e.end_ratio != null && e.end_ratio >= END_RATIO
	);
	const compared = list.filter(
		([, e]) => e.end_check === "compared" && e.end_ratio != null && e.end_ratio < END_RATIO
	);
	const unsettled = list.filter(([, e]) => e.end_check === "ambient-or-unsettled");
	const pre = list.filter(([, e]) => e.pre_paint);
	const svelteOnly = list.every(([k]) => k.startsWith("svelte"));
	const maxA = Math.max(...list.map(([, e]) => Math.max(e.motion_ratio, e.hover_still_ratio ?? 0)));
	const maxB = Math.max(
		...list.map(([, e]) => (e.end_check === "compared" ? (e.end_ratio ?? 0) : 0))
	);
	const notes = [
		`dynamic${svelteOnly ? "; svelte only (no react/vue capture)" : ""}`,
		pre.length
			? `pre-paint at t0 only (t300==t1500==t3000) on ${pre.length}/${list.length} captures, not motion`
			: "",
		unsettled.length
			? `end-state not compared on ${unsettled.length}/${list.length} captures: ambient-or-unsettled (no-pref t2000 vs t4000 >= ${STILL_RATIO})`
			: "",
		`max motion ratio ${maxA.toFixed(4)} (< ${STILL_RATIO})`,
		compared.length
			? `max end ratio ${maxB.toFixed(4)} (< ${END_RATIO}, ${compared.length} compared)`
			: "end-state half null, static half decides",
	].filter(Boolean);
	const axis = {
		score,
		...(score == null ? { na_reason: "not-applicable" } : {}),
		evidence: [
			`components/${slug}/evidence/sheet-rm-light.png`,
			`components/${slug}/evidence/sheet-rm-dark.png`,
			`components/${slug}/evidence/rm-ratios.json`,
		],
		note: notes.join("; "),
	};
	let finding = null;
	if (score === 0) {
		const [k, e] = [...bad].sort((x, y) => y[1].motion_ratio - x[1].motion_ratio)[0];
		finding = {
			priority: "P0",
			title: "motion plays under prefers-reduced-motion: reduce",
			detail: `With reduce, frame(${e.ratio_rm300_rm1500 != null ? "300" : "0"}) vs frame(1500${e.ratio_rm1500_rm3000 != null ? "/3000" : ""}) differ by ratio ${e.motion_ratio.toFixed(4)}${e.hover_still_ratio != null ? ` (pointer pass ${e.hover_still_ratio.toFixed(4)})` : ""} on ${k} (threshold ${PIXEL_THRESHOLD}, limit ${STILL_RATIO}).`,
			fws: [...new Set(bad.map(([k2]) => k2.split("-")[0]))],
			worst: k,
		};
	} else if (score === 1) {
		const [k, e] = [...noEnd].sort((x, y) => y[1].end_ratio - x[1].end_ratio)[0];
		finding = {
			priority: "P1",
			title: "reduced motion skips the end state",
			detail: `With reduce, frame(1500) vs no-preference t4000 (settled) differ by ratio ${e.end_ratio.toFixed(4)} on ${k} (limit ${END_RATIO}): the final visual state is not reached or differs.`,
			fws: [...new Set(noEnd.map(([k2]) => k2.split("-")[0]))],
			worst: k,
		};
	}
	const bucket =
		score === 0 ? "a2_0" : score === 1 ? "a2_1" : score === 3 ? "a2_3" : "a2_unsettled";
	return { bucket, axis, finding };
}

/** Browser-side contact sheet for the reduced-motion pass (injected as source). */
const SHEET_SOURCE = `
window.__rmSheet = async function ({ slug, theme, cells }) {
	const CW = 400, CH = 250, G = 6, HEAD = 26, cols = 3;
	const canvas = document.createElement("canvas");
	canvas.width = cols * CW + (cols + 1) * G;
	canvas.height = HEAD + 3 * (CH + G) + G;
	const ctx = canvas.getContext("2d");
	ctx.fillStyle = "#2b2b2b";
	ctx.fillRect(0, 0, canvas.width, canvas.height);
	ctx.font = "600 14px ui-sans-serif, system-ui, sans-serif";
	ctx.fillStyle = "#fff";
	ctx.textBaseline = "middle";
	ctx.fillText(slug + "  " + theme + "  reduced motion (cols: rm t0 | rm t1500 | no-pref t4000; rows: svelte | react | vue)", G + 4, HEAD / 2);
	for (let r = 0; r < 3; r++)
		for (let c = 0; c < cols; c++) {
			const x = G + c * (CW + G), y = HEAD + r * (CH + G) + G;
			const cell = cells[r][c];
			if (cell.data) ctx.drawImage(await window.__px.decode(cell.data), x, y, CW, CH);
			else {
				ctx.fillStyle = "#1a1a1a";
				ctx.fillRect(x, y, CW, CH);
				ctx.fillStyle = "#999";
				ctx.font = "13px sans-serif";
				ctx.fillText("missing", x + CW / 2 - 24, y + CH / 2);
			}
			ctx.font = "600 12px ui-sans-serif, system-ui, sans-serif";
			const w = ctx.measureText(cell.label).width + 12;
			ctx.fillStyle = "rgba(0,0,0,0.72)";
			ctx.fillRect(x + 4, y + 4, w, 18);
			ctx.fillStyle = "#fff";
			ctx.fillText(cell.label, x + 10, y + 13);
		}
	const u = canvas.toDataURL("image/png");
	return u.slice(u.indexOf(",") + 1);
};`;

const motionClassOf = (out, slug) => {
	try {
		return JSON.parse(readFileSync(join(out, "components", slug, "partial-S1.json"), "utf8")).fields
			.motion_class;
	} catch {
		return null;
	}
};

export function selfTest() {
	const fail = (m) => {
		console.error(`rm-check self-test FAILED: ${m}`);
		process.exit(1);
	};
	// still frames, settled no-preference, end states equal -> 3
	const calm = rmEntry({ still: 0, r300_1500: 0, r1500_3000: 0, end: 0.001, settle: 0.001 });
	if (calm.end_check !== "compared" || calm.pre_paint) fail("calm entry");
	if (scoreRmDynamic([calm]) !== 3) fail("calm scores 3");
	// motion between t300 and t1500 -> 0
	const moving = rmEntry({ still: 0.2, r300_1500: 0.2, r1500_3000: 0, end: 0, settle: 0 });
	if (scoreRmDynamic([calm, moving]) !== 0) fail("moving scores 0");
	// change only before t300 -> pre-paint, not motion
	const pre = rmEntry({
		still: 0.05,
		r0_300: 0.05,
		r300_1500: 0,
		r1500_3000: 0,
		end: 0,
		settle: 0,
	});
	if (!pre.pre_paint || pre.motion_ratio !== 0) fail("pre-paint");
	// end state differs from the settled reference -> 1
	const skip = rmEntry({ still: 0, r300_1500: 0, end: 0.2, settle: 0 });
	if (scoreRmDynamic([skip]) !== 1) fail("skipped end scores 1");
	// ambient no-preference run: end not compared, nothing to score -> null
	const amb = rmEntry({ still: 0, r300_1500: 0, end: 0.5, settle: 0.1 });
	if (amb.end_check !== "ambient-or-unsettled" || scoreRmDynamic([amb]) !== null) fail("ambient");
	const s = summariseSlug("x", { "svelte-dark": moving }, "micro");
	if (s.bucket !== "a2_0" || s.finding?.priority !== "P0") fail("summary P0");
	if (summariseSlug("x", {}, "static").axis.na_reason !== "static") fail("static na");
	console.log("rm-check self-test ok");
}

async function main() {
	const { opts, flags } = parseArgs(process.argv.slice(2), ["self-test"]);
	if (flags.has("self-test")) return selfTest();
	const paths = resolvePaths(opts);
	const only = parseList(opts.only);
	const slugs = loadInventory(paths.inventory)
		.map((i) => i.slug)
		.filter((s) => !only || only.has(s));
	const rel = (p) => relative(paths.repo, p);
	const { chromium } = await import("@playwright/test");
	const browser = await chromium.launch();
	const page = await browser.newPage();
	await installPixelToolkit(page);
	await page.addScriptTag({ content: SHEET_SOURCE });
	const R = (a, b) =>
		page.evaluate(([x, y, t]) => window.__px.ratio(x, y, t, 4), [a, b, PIXEL_THRESHOLD]);

	const out = {
		slugs: {},
		a2_0: [],
		a2_1: [],
		a2_3: [],
		a2_unsettled: [],
		na_static: [],
		missing: [],
	};
	for (const slug of slugs) {
		const ev = join(paths.out, "components", slug, "evidence");
		mkdirSync(ev, { recursive: true });
		const info = { fw: {} };
		for (const theme of THEMES) {
			const cells = FRAMEWORKS.map((fw) => [
				{ label: `${fw} rm 0`, data: b64(shot(paths.parityRm, fw, slug, theme, 0)) },
				{ label: `${fw} rm 1500`, data: b64(shot(paths.parityRm, fw, slug, theme, 1500)) },
				{ label: `${fw} no-pref 4000`, data: b64(shot(paths.parity, fw, slug, theme, 4000)) },
			]);
			if (cells.some((r) => r.some((c) => c.data))) {
				const png = await page.evaluate((i) => window.__rmSheet(i), { slug, theme, cells });
				writeFileSync(join(ev, `sheet-rm-${theme}.png`), Buffer.from(png, "base64"));
			}
		}
		for (const fw of FRAMEWORKS)
			for (const theme of THEMES) {
				const p0 = shot(paths.parityRm, fw, slug, theme, 0);
				const p1 = shot(paths.parityRm, fw, slug, theme, 1500);
				if (!existsSync(p0) || !existsSync(p1)) continue;
				const n4 = shot(paths.parity, fw, slug, theme, 4000);
				const n2 = shot(paths.parity, fw, slug, theme, 2000);
				const p300 = shot(paths.parityRm, fw, slug, theme, 300);
				const p3000 = shot(paths.parityRm, fw, slug, theme, 3000);
				const h0 = shot(paths.parityRm, fw, slug, theme, 0, "-hover");
				const h1 = shot(paths.parityRm, fw, slug, theme, 1500, "-hover");
				const raw = {
					still: await R(b64(p0), b64(p1)),
					settle: existsSync(n2) && existsSync(n4) ? await R(b64(n2), b64(n4)) : null,
					end: existsSync(n4) ? await R(b64(p1), b64(n4)) : null,
					hover: existsSync(h0) && existsSync(h1) ? await R(b64(h0), b64(h1)) : null,
				};
				if (existsSync(p300)) {
					raw.r300_1500 = await R(b64(p300), b64(p1));
					raw.r0_300 = await R(b64(p0), b64(p300));
					if (existsSync(p3000)) raw.r1500_3000 = await R(b64(p1), b64(p3000));
				}
				info.fw[`${fw}-${theme}`] = {
					...rmEntry(raw),
					rm0: rel(p0),
					rm1500: rel(p1),
					ref: rel(n4),
				};
			}
		out.slugs[slug] = info;
	}
	await browser.close();

	for (const slug of slugs) {
		const info = out.slugs[slug];
		const { bucket, axis, finding } = summariseSlug(slug, info.fw, motionClassOf(paths.out, slug));
		out[bucket].push(slug);
		const ev = join(paths.out, "components", slug, "evidence");
		writeFileSync(join(ev, "rm-ratios.json"), JSON.stringify(info, null, 2));
		const findings = finding
			? [
					{
						id: `${slug}-30`,
						axis: "A2",
						priority: finding.priority,
						title: finding.title,
						detail: finding.detail,
						evidence: [
							info.fw[finding.worst].rm0,
							info.fw[finding.worst].rm1500,
							`components/${slug}/evidence/sheet-rm-light.png`,
							`components/${slug}/evidence/rm-ratios.json`,
						],
						verification: "capture",
						verification_cmd: `node scripts/parity/capture.mjs --only ${slug} --reduced-motion reduce --moments 0,300,1500,3000 --concurrency 4 --out .parity-rm && node scripts/audit/rm-check.mjs --only ${slug}`,
						frameworks: finding.fws,
						status: "open",
					},
				]
			: [];
		writeFileSync(
			join(paths.out, "components", slug, "partial-S3.json"),
			JSON.stringify(
				{ slug, agent: "S3", axes: { A2: axis }, fields: {}, findings, uncertain_flags: [] },
				null,
				2
			)
		);
	}
	mkdirSync(join(paths.out, "logs"), { recursive: true });
	writeFileSync(join(paths.out, "logs", "S3b-results.json"), JSON.stringify(out, null, 2));
	const list = (a) => a.map((s) => `- ${s}`).join("\n") || "(none)";
	writeFileSync(
		join(paths.out, "logs", "S3b-rm-summary.md"),
		`# Reduced-motion summary (A2 dynamic)

Slugs: ${slugs.length}. A2=3: ${out.a2_3.length}, A2=1: ${out.a2_1.length}, A2=0: ${out.a2_0.length}, null ambient-or-unsettled: ${out.a2_unsettled.length}, null static: ${out.na_static.length}, null no-capture: ${out.missing.length}

## A2 = 0 (motion plays under reduce, P0)
${list(out.a2_0)}

## A2 = 1 (end state skipped)
${list(out.a2_1)}

## null, ambient-or-unsettled (static half decides)
${list(out.a2_unsettled)}

## null, static
${list(out.na_static)}

## null, no capture
${list(out.missing)}
`
	);
	console.log(
		JSON.stringify({
			a3: out.a2_3.length,
			a1: out.a2_1.length,
			a0: out.a2_0.length,
			static: out.na_static.length,
			unsettled: out.a2_unsettled.length,
			none: out.missing.length,
		})
	);
}

if (isMain(process.argv[1], import.meta.url)) {
	main().catch((e) => {
		console.error(e);
		process.exit(1);
	});
}
