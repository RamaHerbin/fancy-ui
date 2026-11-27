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
 *     `ambient-or-unsettled` and the end state does not count. When the
 *     no-preference run has no t2000 or t4000 frame, `end_check` says
 *     `no-reference`: capture it with moments 0,600,1500,2000,4000.
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

import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
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

const logCache = new Map();
/** The `ok` items of a capture directory's log, or null when there is no log. */
function captureLog(root) {
	if (!logCache.has(root)) {
		const p = join(root, "capture-log.json");
		let items = null;
		try {
			items = Object.values(JSON.parse(readFileSync(p, "utf8")).items ?? {});
		} catch {
			items = null;
		}
		logCache.set(root, items);
	}
	return logCache.get(root);
}

/**
 * The moments (ms) the CURRENT capture produced for one framework x theme (and
 * pass). Read from the capture log, which lists the files each item wrote: a
 * re-run with other moments overwrites the log but leaves earlier frames on
 * disk, so a directory scan would mix superseded shots in. Falls back to the
 * directory when there is no log.
 */
export function momentsFromFiles(files, fw, slug, theme, suffix = "") {
	const re = new RegExp(`^${fw}/${slug}/${theme}-(\\d+)${suffix}\\.png$`);
	return files
		.map((f) => re.exec(f))
		.filter(Boolean)
		.map((m) => Number(m[1]));
}
function momentsIn(root, fw, slug, theme, suffix = "") {
	const items = captureLog(root);
	if (items) {
		const files = items
			.filter((it) => it.status === "ok" && it.fw === fw && it.slug === slug)
			.flatMap((it) => it.files ?? []);
		return momentsFromFiles(files, fw, slug, theme, suffix);
	}
	const dir = join(root, "shots", fw, slug);
	if (!existsSync(dir)) return [];
	const re = new RegExp(`^${theme}-(\\d+)${suffix}\\.png$`);
	return readdirSync(dir)
		.map((f) => re.exec(f))
		.filter(Boolean)
		.map((m) => Number(m[1]));
}

/**
 * Which reduced-motion frames to compare, from the moments a capture actually
 * produced (a hint's `moments` overrides the documented 0,300,1500,3000): `first`
 * = the earliest, `late` = the moment nearest 1500 after it (the frame that must
 * be still), `mid` = the first moment strictly between them (pre-paint window),
 * `later` = the last moment after `late`. Null with fewer than two moments.
 */
export function pickMoments(available) {
	const ms = [...new Set(available)].filter((n) => Number.isFinite(n)).sort((a, b) => a - b);
	if (ms.length < 2) return null;
	const [first, ...rest] = ms;
	const late = rest.reduce(
		(best, n) => (Math.abs(n - 1500) < Math.abs(best - 1500) ? n : best),
		rest[0]
	);
	const mid = rest.find((n) => n < late) ?? null;
	const later = rest.filter((n) => n > late).at(-1) ?? null;
	return { first, mid, late, later };
}

/** A pointer-pass frame this far in is past the open delays of hover-driven content (tooltip: 500 ms). */
export const HOVER_SETTLED_MS = 600;

/**
 * The two pointer-pass frames compared for stillness: the last two hover
 * moments, provided the earlier one is at least HOVER_SETTLED_MS in. Earlier
 * pairs cannot tell content that mounts after a delay from motion, so the pass
 * is not compared (null) rather than scored.
 */
export function pickHoverPair(available) {
	const ms = [...new Set(available)].filter((n) => Number.isFinite(n)).sort((a, b) => a - b);
	if (ms.length < 2) return null;
	const [a, b] = ms.slice(-2);
	return a >= HOVER_SETTLED_MS ? { a, b } : null;
}

/**
 * The no-preference reference frames: `ref` = the last moment (the settled
 * picture), `prev` = the latest moment from one second on before it, which
 * proves the reference is settled; null when no such witness exists.
 */
export function pickReference(available) {
	const ms = [...new Set(available)].filter((n) => Number.isFinite(n)).sort((a, b) => a - b);
	if (!ms.length) return null;
	const ref = ms.at(-1);
	const prev = ms.filter((n) => n >= 1000 && n < ref).at(-1) ?? null;
	return { ref, prev };
}

/**
 * One framework x theme entry from the raw ratios. Pure.
 *
 * @param {{ still: number, r0_300?: number|null, r300_1500?: number|null, r1500_3000?: number|null,
 *           hover?: number|null, end?: number|null, settle?: number|null }} x
 */
export function rmEntry(x) {
	const settled = x.settle != null && x.settle < STILL_RATIO;
	const ambient = x.settle != null && !settled;
	// the still window is mid->late when a midpoint exists (else first->late), and
	// late->later whenever that frame exists: motion that starts late still counts
	const motionRatio = Math.max(x.r300_1500 ?? x.still, x.r1500_3000 ?? 0);
	const prePaint = x.r300_1500 != null && x.still >= STILL_RATIO && motionRatio < STILL_RATIO;
	const endCheck =
		x.end == null || x.settle == null
			? "no-reference"
			: settled
				? "compared"
				: "ambient-or-unsettled";
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
	const noRef = list.filter(([, e]) => e.end_check === "no-reference");
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
		noRef.length
			? `end-state not compared on ${noRef.length}/${list.length} captures: no-reference (no-pref t2000 frame missing, or no settled witness from one second on)`
			: "",
		unsettled.length
			? `end-state not compared on ${unsettled.length}/${list.length} captures: ambient-or-unsettled (no-pref t2000 vs t4000 >= ${STILL_RATIO})`
			: "",
		`max motion ratio ${maxA.toFixed(4)} (${maxA < STILL_RATIO ? "<" : ">="} ${STILL_RATIO})`,
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
			detail: `With reduce, frame(${e.ratio_rm300_rm1500 != null ? (e.moments?.rm.mid ?? 300) : (e.moments?.rm.first ?? 0)}) vs frame(${e.moments?.rm.late ?? 1500}${e.ratio_rm1500_rm3000 != null ? `/${e.moments?.rm.later ?? 3000}` : ""}) differ by ratio ${e.motion_ratio.toFixed(4)}${e.hover_still_ratio != null ? ` (pointer pass ${e.hover_still_ratio.toFixed(4)})` : ""} on ${k} (threshold ${PIXEL_THRESHOLD}, limit ${STILL_RATIO}).`,
			fws: [...new Set(bad.map(([k2]) => k2.split("-")[0]))],
			worst: k,
		};
	} else if (score === 1) {
		const [k, e] = [...noEnd].sort((x, y) => y[1].end_ratio - x[1].end_ratio)[0];
		finding = {
			priority: "P1",
			title: "reduced motion skips the end state",
			detail: `With reduce, frame(${e.moments?.rm.late ?? 1500}) vs no-preference t${e.moments?.ref?.ref ?? 4000} (settled) differ by ratio ${e.end_ratio.toFixed(4)} on ${k} (limit ${END_RATIO}): the final visual state is not reached or differs.`,
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
	// motion that starts after the late frame counts even without a midpoint
	const lateMover = rmEntry({ still: 0, r1500_3000: 0.2, end: 0, settle: 0 });
	if (lateMover.motion_ratio !== 0.2 || scoreRmDynamic([lateMover]) !== 0)
		fail("late motion without a midpoint scores 0");
	// end state differs from the settled reference -> 1
	const skip = rmEntry({ still: 0, r300_1500: 0, end: 0.2, settle: 0 });
	if (scoreRmDynamic([skip]) !== 1) fail("skipped end scores 1");
	// ambient no-preference run: end not compared, nothing to score -> null
	const amb = rmEntry({ still: 0, r300_1500: 0, end: 0.5, settle: 0.1 });
	if (amb.end_check !== "ambient-or-unsettled" || scoreRmDynamic([amb]) !== null) fail("ambient");
	// no t2000 frame in the no-preference run: no reference, not ambient
	const noRef = rmEntry({ still: 0, r300_1500: 0, end: 0.5, settle: null });
	if (noRef.end_check !== "no-reference") fail("missing t2000 is no-reference");
	const noRefNote = summariseSlug("x", { "svelte-dark": noRef }, "micro").axis.note;
	if (
		!noRefNote.includes("no-reference (no-pref t2000 frame missing") ||
		noRefNote.includes("ambient")
	)
		fail("no-reference note");
	// the motion note prints the comparison that actually holds
	if (!summariseSlug("x", { "svelte-dark": calm }, "micro").axis.note.includes("(< "))
		fail("motion note below threshold");
	if (!summariseSlug("x", { "svelte-dark": moving }, "micro").axis.note.includes("(>= "))
		fail("motion note above threshold");
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
		// The moments come from the files a capture produced, per framework and
		// theme: a hint may have replaced the documented 0,300,1500,3000.
		const plan = {};
		for (const fw of FRAMEWORKS)
			for (const theme of THEMES)
				plan[`${fw}-${theme}`] = {
					rm: pickMoments(momentsIn(paths.parityRm, fw, slug, theme)),
					ref: pickReference(momentsIn(paths.parity, fw, slug, theme)),
				};
		for (const theme of THEMES) {
			const cells = FRAMEWORKS.map((fw) => {
				const { rm, ref } = plan[`${fw}-${theme}`];
				return [
					{
						label: `${fw} rm ${rm?.first ?? 0}`,
						data: rm ? b64(shot(paths.parityRm, fw, slug, theme, rm.first)) : null,
					},
					{
						label: `${fw} rm ${rm?.late ?? 1500}`,
						data: rm ? b64(shot(paths.parityRm, fw, slug, theme, rm.late)) : null,
					},
					{
						label: `${fw} no-pref ${ref?.ref ?? 4000}`,
						data: ref ? b64(shot(paths.parity, fw, slug, theme, ref.ref)) : null,
					},
				];
			});
			if (cells.some((r) => r.some((c) => c.data))) {
				const png = await page.evaluate((i) => window.__rmSheet(i), { slug, theme, cells });
				writeFileSync(join(ev, `sheet-rm-${theme}.png`), Buffer.from(png, "base64"));
			}
		}
		for (const fw of FRAMEWORKS)
			for (const theme of THEMES) {
				const { rm, ref } = plan[`${fw}-${theme}`];
				if (!rm) continue;
				const rmShot = (t, suffix) => shot(paths.parityRm, fw, slug, theme, t, suffix);
				const p0 = rmShot(rm.first);
				const p1 = rmShot(rm.late);
				if (!existsSync(p0) || !existsSync(p1)) continue;
				const n4 = ref ? shot(paths.parity, fw, slug, theme, ref.ref) : null;
				const n2 = ref?.prev != null ? shot(paths.parity, fw, slug, theme, ref.prev) : null;
				const p300 = rm.mid != null ? rmShot(rm.mid) : null;
				const p3000 = rm.later != null ? rmShot(rm.later) : null;
				const hp = pickHoverPair(momentsIn(paths.parityRm, fw, slug, theme, "-hover"));
				const h0 = hp ? rmShot(hp.a, "-hover") : null;
				const h1 = hp ? rmShot(hp.b, "-hover") : null;
				const raw = {
					still: await R(b64(p0), b64(p1)),
					settle: n2 && n4 && existsSync(n2) && existsSync(n4) ? await R(b64(n2), b64(n4)) : null,
					end: n4 && existsSync(n4) ? await R(b64(p1), b64(n4)) : null,
					hover: h0 && h1 && existsSync(h0) && existsSync(h1) ? await R(b64(h0), b64(h1)) : null,
				};
				if (p300 && existsSync(p300)) {
					raw.r300_1500 = await R(b64(p300), b64(p1));
					raw.r0_300 = await R(b64(p0), b64(p300));
				}
				// independent of the midpoint: motion that starts after `late` must count
				if (p3000 && existsSync(p3000)) raw.r1500_3000 = await R(b64(p1), b64(p3000));
				info.fw[`${fw}-${theme}`] = {
					...rmEntry(raw),
					moments: { rm, ref, hover: hp },
					rm0: rel(p0),
					rm1500: rel(p1),
					ref: n4 ? rel(n4) : null,
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
