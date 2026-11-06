/**
 * Unit tests for the pure parts of the design & motion audit instruments.
 *
 *   node --test scripts/audit/audit.test.mjs
 *
 * No browser and no dev server: regex census on fixture strings and fixture
 * folders, rubric scoring, record validation, ratio maths, and the merge and
 * matrix rules.
 */

import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import {
	assertRecords,
	axisCell,
	deltaCell,
	driversCell,
	renderMatrix,
	validateAll,
} from "./build-matrix.mjs";
import {
	POPUP,
	split as axeSplit,
	countSeriousCritical,
	looksLikeAxe,
	s6Partial,
} from "./axe-sweep.mjs";
import { buildInventory, creditSources, entryBlocks, field, tagList } from "./inventory.mjs";
import {
	AXES,
	REGION_RATIO_MIN,
	ambientVerdict,
	axisPriority,
	compareImageData,
	parseArgs,
	parseList,
	priorityDrivers,
	recordPriority,
	regionRatios,
	resolvePaths,
	scoreA1,
	scoreA3Dynamic,
	scoreA4,
	scoreA5,
	scoreA8,
	scoreRmDynamic,
	scoreTotal,
	stageUrl,
	stripLineRef,
	validateRecord,
} from "./lib.mjs";
import { mergeA2, mergeRecord, rateAxis, syntheticPriority } from "./merge-records.mjs";
import { selectSlugs, microSignal, s4Partial } from "./micro-capture.mjs";
import {
	agg,
	median,
	p95FrameMs,
	parseShard,
	pickTargets,
	rates,
	s5Partial,
} from "./perf-sweep.mjs";
import { pickHoverPair, pickMoments, pickReference, rmEntry, summariseSlug } from "./rm-check.mjs";
import {
	AMBIENT,
	classifyCapturable,
	isAmbientCandidate,
	missingPorts,
	s9Partial,
} from "./sheet.mjs";
import {
	STATIC_FINDING_IDS,
	analyse,
	configure,
	reschedulesItself,
	gateOf,
	loadFileText,
	normCurve,
	parseCss,
	scanMarkup,
	splitTop,
	timeLiterals,
	transitionProperty,
} from "./static.mjs";

const here = dirname(fileURLToPath(import.meta.url));

// --- static census -----------------------------------------------------------

const TOKENS = `export const EASINGS = {
	out: "cubic-bezier(0.16, 1, 0.3, 1)",
	inout: "cubic-bezier(0.4, 0, 0.2, 1)",
};`;

/** A throwaway checkout with one component folder, so `analyse` runs end to end. */
function fixtureRepo(svelte) {
	const repo = mkdtempSync(join(tmpdir(), "audit-static-"));
	const motion = join(repo, "src", "lib", "fancy-ui", "_internals", "motion");
	mkdirSync(motion, { recursive: true });
	writeFileSync(join(motion, "tokens.ts"), TOKENS);
	const dir = join(repo, "src", "lib", "fancy-ui", "widget");
	mkdirSync(dir, { recursive: true });
	writeFileSync(join(dir, "Widget.svelte"), svelte);
	configure(repo);
	return analyse({ slug: "widget" }).partial;
}

test("normCurve compares spellings of one curve as equal", () => {
	assert.equal(normCurve("0.16, 1, 0.3, 1"), "0.16,1,0.3,1");
	assert.equal(normCurve(" .4 ,0,0.2,1"), "0.4,0,0.2,1");
});

test("splitTop splits a transition list at top-level commas only", () => {
	assert.deepEqual(splitTop("opacity 1s cubic-bezier(0.1, 0.2, 0.3, 0.4), color 2s"), [
		"opacity 1s cubic-bezier(0.1, 0.2, 0.3, 0.4)",
		"color 2s",
	]);
});

test("timeLiterals reads ms and s literals and ignores custom-property names", () => {
	assert.deepEqual(
		timeLiterals("transform .3s, opacity 120ms, color var(--x-150ms)").map((t) => t.ms),
		[300, 120]
	);
});

test("parseCss tracks reduced-motion spans and the gate of each declaration", () => {
	configure("", TOKENS);
	const f = loadFileText(
		"/x/A.svelte",
		[
			"<style>",
			"@media (prefers-reduced-motion: no-preference) {",
			"  .a { transform: scale(1); transition: transform 150ms ease; }",
			"}",
			"@media (prefers-reduced-motion: reduce) { .a { transition: none; } }",
			".b { transition: opacity 300ms ease; }",
			"</style>",
		].join("\n")
	);
	const css = parseCss(f);
	assert.deepEqual(
		css.spans.map((s) => s.kind),
		["no-preference", "reduce"]
	);
	const gate = (needle) =>
		gateOf(css.decls.find((d) => d.prop === "transition" && d.value.includes(needle)).anc);
	assert.equal(gate("transform"), "gated");
	assert.equal(gate("opacity"), "ungated");
	assert.equal(gate("none"), "reduce");
});

test("scanMarkup finds inline style= motion and honours a reduce-aware branch", () => {
	configure("", TOKENS);
	const bare = loadFileText("/x/A.svelte", '<div style="transition: transform 200ms ease"></div>');
	const items = scanMarkup(bare, {}).items;
	assert.equal(items.length, 1);
	assert.equal(items[0].gated, false);
	const guarded = loadFileText(
		"/x/B.svelte",
		'{#if !reduce}<div style="transition: transform 200ms ease"></div>{/if}'
	);
	assert.equal(scanMarkup(guarded, {}).items[0].gated, true);
	const colour = loadFileText("/x/C.svelte", '<div style="transition: color 200ms ease"></div>');
	assert.equal(scanMarkup(colour, {}).items.length, 0, "colour-only transitions are exempt");
});

test("A1 counts uncommented off-token curves and accepts a justified one", () => {
	const off = fixtureRepo(
		"<style>.a { transition: opacity 150ms cubic-bezier(0.1, 0.2, 0.3, 0.4); }</style>"
	);
	assert.equal(off.axes.A1.score, 2);
	assert.match(off.axes.A1.note, /1 uncommented off-token/);
	const ok = fixtureRepo(
		"<style>/* off-token: matches the sibling card */\n.a { transition: opacity 150ms cubic-bezier(0.1, 0.2, 0.3, 0.4); }</style>"
	);
	assert.equal(ok.axes.A1.score, 3);
	const sameLine = fixtureRepo(
		"<style>.a { transition: opacity 150ms cubic-bezier(0.1, 0.2, 0.3, 0.4); } /* off-token: tuned */</style>"
	);
	assert.equal(sameLine.axes.A1.score, 3);
	const onToken = fixtureRepo(
		"<style>.a { transition: opacity 150ms cubic-bezier(0.16, 1, 0.3, 1); }</style>"
	);
	assert.equal(onToken.axes.A1.score, 3);
	// only an animation that runs forever is an ambient loop; a long finite
	// entrance keeps its (off-token) duration in the census
	const longEntrance = fixtureRepo("<style>.a { animation: enter 1200ms ease both; }</style>");
	assert.equal(longEntrance.axes.A1.score, 2);
	const shorthandLoop = fixtureRepo(
		"<style>.a { animation: spin 1200ms linear infinite; }</style>"
	);
	assert.equal(shorthandLoop.axes.A1.score, 3);
	const longhandLoop = fixtureRepo(
		"<style>.a { animation: spin 1200ms linear; animation-iteration-count: infinite; }</style>"
	);
	assert.equal(longhandLoop.axes.A1.score, 3);
});

test("A2 static: ungated transform motion scores 0, a gate or a blanket reduce override scores 3 (R9)", () => {
	const ungated = fixtureRepo("<style>.a { transition: transform 150ms ease; }</style>");
	assert.equal(ungated.axes.A2.score, 0);
	// longhands carry the same motion as the shorthand: not static, same A2
	const longhand = fixtureRepo(
		"<style>.a { transition-property: opacity; transition-duration: 150ms; transition-timing-function: ease; }</style>"
	);
	assert.notEqual(longhand.fields.motion_class, "static");
	assert.equal(longhand.axes.A2.score, 0);
	// the shorthand's property is found whatever the token order; absent = `all`
	assert.equal(transitionProperty("150ms ease transform"), "transform");
	assert.equal(transitionProperty("transform 150ms cubic-bezier(0.1, 0.2, 0.3, 0.4)"), "transform");
	assert.equal(transitionProperty("150ms ease"), "all");
	assert.equal(transitionProperty("color 150ms"), "color");
	assert.equal(
		fixtureRepo("<style>.a { transition: 150ms ease transform; }</style>").axes.A2.score,
		0
	);
	assert.equal(fixtureRepo("<style>.a { transition: 150ms ease; }</style>").axes.A2.score, 0);
	const gated = fixtureRepo(
		"<style>@media (prefers-reduced-motion: no-preference) { .a { transition: transform 150ms ease; } }</style>"
	);
	assert.equal(gated.axes.A2.score, 3);
	const r9 = fixtureRepo(
		[
			"<style>",
			".a { transition: transform 150ms ease; }",
			"@media (prefers-reduced-motion: reduce) { .a { transition: none; } }",
			"</style>",
		].join("\n")
	);
	assert.equal(r9.axes.A2.score, 3);
	assert.match(r9.axes.A2.note, /R9/);
	const inlineUncovered = fixtureRepo(
		[
			'<div style="transition: transform 150ms ease"></div>',
			"<style>@media (prefers-reduced-motion: reduce) { .a { transition: none; } }</style>",
		].join("\n")
	);
	assert.equal(
		inlineUncovered.axes.A2.score,
		0,
		"an inline style is not reached by a class override"
	);
});

test("a folder with no motion is static", () => {
	const p = fixtureRepo("<p>hello</p>");
	assert.equal(p.axes.A2.score, null);
	assert.equal(p.axes.A2.na_reason, "static");
	assert.equal(p.fields.motion_class, "static");
});

// --- lib: arguments, rubric, pixels, validation --------------------------------

test("parseArgs separates flags, options and positionals", () => {
	const a = parseArgs(["--only", "a,b", "--self-test", "--out", "x", "pos"], ["self-test"]);
	assert.equal(a.opts.only, "a,b");
	assert.equal(a.opts.out, "x");
	assert.ok(a.flags.has("self-test"));
	assert.deepEqual(a.rest, ["pos"]);
	assert.deepEqual([...parseList("a, b,,c")], ["a", "b", "c"]);
	assert.equal(parseList(undefined), null);
});

test("resolvePaths gives repo-relative defaults and honours overrides", () => {
	const d = resolvePaths({});
	assert.ok(d.out.endsWith(join(".audit-out", "audit")));
	assert.equal(d.bases.svelte, "http://localhost:5291");
	const o = resolvePaths({ repo: "/r", out: "/o", "base-react": "http://x:1" });
	assert.equal(o.repo, "/r");
	assert.equal(o.out, "/o");
	assert.equal(o.inventory, join("/o", "inventory.json"));
	assert.equal(o.bases.react, "http://x:1");
	assert.equal(
		stageUrl(o.bases, "svelte", "s", "light"),
		"http://localhost:5291/_parity/s?theme=light"
	);
	assert.equal(stageUrl(o.bases, "react", "s"), "http://x:1/?slug=s&theme=dark");
});

test("rubric priority: A2/A3/A8 = 0 is P0, A1/A4/A5 <= 1 or A6 = 0 is P1, else P2 or none", () => {
	const ok = Object.fromEntries(AXES.map((k) => [k, 3]));
	assert.equal(axisPriority(ok, 0), "none");
	assert.equal(axisPriority(ok, 1), "P2");
	assert.equal(axisPriority({ ...ok, A3: 0 }, 0), "P0");
	assert.equal(axisPriority({ ...ok, A4: 1 }, 0), "P1");
	assert.equal(axisPriority({ ...ok, A6: 0 }, 0), "P1");
	assert.equal(axisPriority({ ...ok, A7: 0 }, 0), "P2", "A7 never raises priority above P2");
	assert.equal(axisPriority({ ...ok, A4: null, A8: 1 }, 0), "P2", "A8 = 1 alone is P2");
	assert.deepEqual(priorityDrivers({ ...ok, A2: 0, A5: 1 }), [
		{ axis: "A2", priority: "P0" },
		{ axis: "A5", priority: "P1" },
	]);
});

test("record priority is the more severe of the axes and the live findings (R2)", () => {
	const ok = Object.fromEntries(AXES.map((k) => [k, 3]));
	const f = (priority, status = "open") => ({ priority, status });
	assert.equal(recordPriority(ok, [f("P1")]), "P1");
	assert.equal(recordPriority(ok, [f("P1", "wontfix")]), "P2");
	assert.equal(recordPriority(ok, [f("P0", "duplicate-of:a-01")]), "P2");
	assert.equal(recordPriority({ ...ok, A2: 0 }, [f("P1")]), "P0");
});

test("scores: A1 bands, record total, dynamic reduced-motion verdicts", () => {
	assert.deepEqual([0, 1, 2, 3, 5, 6, 40].map(scoreA1), [3, 2, 2, 1, 1, 0, 0]);
	assert.equal(scoreTotal({ A1: 3, A2: 3, A3: null }), 24);
	assert.equal(scoreTotal({ A1: 3, A2: 0 }), 12);
	assert.equal(scoreTotal({ A1: null }), 0);
	const calm = { motion_ratio: 0, end_check: "compared", end_ratio: 0 };
	assert.equal(scoreRmDynamic([calm]), 3);
	assert.equal(scoreRmDynamic([calm, { ...calm, motion_ratio: 0.1 }]), 0);
	assert.equal(scoreRmDynamic([{ ...calm, end_ratio: 0.5 }]), 1);
	assert.equal(
		scoreRmDynamic([{ motion_ratio: 0, end_check: "ambient-or-unsettled", end_ratio: 0.5 }]),
		null
	);
	assert.equal(scoreRmDynamic([]), null);
});

const img = (w, h, fill) => ({
	width: w,
	height: h,
	data: new Uint8ClampedArray(w * h * 4).fill(fill),
});

test("compareImageData: identical, fully different, below threshold, size mismatch", () => {
	assert.equal(compareImageData(img(10, 10, 5), img(10, 10, 5), 24, 4), 0);
	assert.equal(compareImageData(img(10, 10, 0), img(10, 10, 255), 24, 4), 1);
	assert.equal(
		compareImageData(img(10, 10, 0), img(10, 10, 24), 24, 4),
		0,
		"delta equal to the threshold is not a change"
	);
	assert.equal(compareImageData(img(10, 10, 0), img(10, 10, 25), 24, 4), 1);
	assert.equal(
		compareImageData(img(10, 10, 0), img(20, 10, 0), 24, 4),
		0.5,
		"missing pixels count as changed"
	);
});

test("regionRatios sees a small change the whole-image ratio hides", () => {
	const a = img(800, 500, 0);
	const b = img(800, 500, 0);
	// a 12x12 square: 144 of 400000 pixels
	for (let y = 100; y < 112; y++)
		for (let x = 100; x < 112; x++) b.data.fill(255, (y * 800 + x) * 4, (y * 800 + x) * 4 + 4);
	assert.ok(compareImageData(a, b, 24, 4) < 0.004, "whole-stage ratio is below the old gate");
	const r = regionRatios(a, b, 24, 16, 10);
	assert.equal(r.changed, 144);
	assert.ok(r.max > REGION_RATIO_MIN, `tile ratio ${r.max} clears the per-region gate`);
	assert.equal(regionRatios(a, a, 24, 16, 10).max, 0);
});

test("ambient verdict needs two later frames that differ", () => {
	assert.deepEqual(ambientVerdict([0.002, 0.03, 0.05]), { differing: 2, pass: true });
	assert.deepEqual(ambientVerdict([0, 0.03, null, 0.009]), { differing: 1, pass: false });
	assert.equal(ambientVerdict([]).pass, false);
});

const axisOk = (score, note = "n") => ({
	score,
	evidence: ["components/x/evidence/static.txt"],
	note,
});
function goodRecord(over = {}) {
	return {
		slug: "x",
		schema: 1,
		kind: "fancy",
		category: "fancy/cards",
		motion_class: "micro",
		render: ["dom"],
		sound: false,
		capturable: "full",
		na_reason: null,
		axes: Object.fromEntries(AXES.map((k) => [k, axisOk(3)])),
		raters: {},
		findings: [],
		score_total: 24,
		priority: "none",
		tool_versions: { capture: "abc" },
		filled_by: "t",
		reviewed_by: [],
		iteration: 1,
		uncertain_flags: [],
		...over,
	};
}

test("validateRecord accepts a coherent record and names each defect", () => {
	assert.deepEqual(validateRecord(goodRecord()), []);
	// a duplicate may point at a synthetic finding id
	const dupOfSynthetic = {
		id: "x-01",
		axis: "A2",
		priority: "P2",
		title: "duplicate of the synthetic finding",
		evidence: ["components/x/evidence/static.txt"],
		verification: "grep",
		verification_cmd: "grep x",
		expected_benefit: "b",
		frameworks: ["svelte"],
		status: "duplicate-of:x-A2-axis",
	};
	assert.deepEqual(validateRecord(goodRecord({ findings: [dupOfSynthetic], priority: "P2" })), []);
	assert.match(validateRecord(goodRecord({ slug: "Bad_Slug" })).join(), /bad slug/);
	assert.match(validateRecord(goodRecord({ extra: 1 })).join(), /unknown key extra/);
	const noReason = goodRecord();
	noReason.axes.A4 = { score: null, evidence: [], note: "x" };
	assert.match(validateRecord(noReason).join(), /A4: null score without na_reason/);
	const waiting = goodRecord();
	waiting.axes.A7 = { score: null, evidence: [], note: "awaiting rater" };
	assert.deepEqual(validateRecord(waiting), [], "awaiting rater is allowed on A6/A7");
	const wrongPriority = goodRecord({ priority: "P1" });
	assert.match(validateRecord(wrongPriority).join(), /priority P1 != recomputed none/);
	const finding = {
		id: "x-01",
		axis: "A3",
		priority: "P1",
		title: "hover-only reveal",
		evidence: ["a.txt"],
		verification: "manual",
		verification_cmd: "",
		expected_benefit: "b",
		frameworks: ["svelte"],
		status: "open",
	};
	const errs = validateRecord(goodRecord({ priority: "P1", findings: [finding] }), {
		exists: () => false,
	});
	assert.ok(errs.some((e) => /verification is manual/.test(e)));
	assert.ok(errs.some((e) => /empty verification_cmd/.test(e)));
	assert.ok(errs.some((e) => /no existing evidence path/.test(e)));
});

test("the JSON schema file and the validator agree on the required keys", () => {
	const schema = JSON.parse(readFileSync(join(here, "schema", "record.schema.json"), "utf8"));
	const ok = goodRecord();
	assert.deepEqual([...schema.required].sort(), Object.keys(ok).sort());
	assert.deepEqual(Object.keys(schema.properties.axes.properties), AXES);
	assert.equal(stripLineRef("src/a.svelte:L12-30"), "src/a.svelte");
	assert.equal(stripLineRef("evidence/static.txt#L8"), "evidence/static.txt");
});

// --- inventory ---------------------------------------------------------------

test("inventory reads slug, category, credits and tags from registry text", () => {
	const src = [
		"export const registry: Record<string, X> = {",
		'\t"a-b": {',
		'\t\tname: "AB",',
		'\t\tslug: "a-b",',
		'\t\tcategory: "cards",',
		'\t\tgroup: "fancy",',
		'\t\tstatus: "done",',
		'\t\tcredits: [{ source: "Alpha" }, { source: "Beta" }],',
		'\t\ttags: ["x", "y"],',
		"\t},",
		"};",
	].join("\n");
	const blocks = entryBlocks(src);
	assert.equal(blocks.length, 1);
	assert.equal(field(blocks[0].body, "category"), "cards");
	assert.deepEqual(creditSources(blocks[0].body), ["Alpha", "Beta"]);
	assert.deepEqual(tagList(blocks[0].body), ["x", "y"]);
	const inv = buildInventory(src);
	assert.equal(inv.count, 1);
	assert.deepEqual(inv.byCategory, { "fancy/cards": ["a-b"] });
});

// --- instruments: ratios and selection ----------------------------------------

test("rm-check: pre-paint is not motion, ambient references are not compared", () => {
	const pre = rmEntry({
		still: 0.05,
		r0_300: 0.05,
		r300_1500: 0,
		r1500_3000: 0,
		end: 0,
		settle: 0,
	});
	assert.equal(pre.pre_paint, true);
	assert.equal(pre.motion_ratio, 0);
	assert.equal(
		rmEntry({ still: 0, r300_1500: 0, end: 0.5, settle: 0.2 }).end_check,
		"ambient-or-unsettled"
	);
	assert.equal(rmEntry({ still: 0, end: null }).end_check, "no-reference");
	const moving = rmEntry({ still: 0.3, r300_1500: 0.3, end: 0, settle: 0 });
	const s = summariseSlug("x", { "svelte-dark": moving }, "micro");
	assert.equal(s.bucket, "a2_0");
	assert.equal(s.finding.priority, "P0");
	assert.equal(summariseSlug("x", {}, "micro").bucket, "missing");
	assert.equal(summariseSlug("x", { a: moving }, "static").axis.na_reason, "static");
});

test("rm-check: the compared moments follow what the capture produced", () => {
	assert.deepEqual(pickMoments([0, 300, 1500, 3000]), {
		first: 0,
		mid: 300,
		late: 1500,
		later: 3000,
	});
	// a hint such as tooltip's `[0, 800]` still yields a still-frame comparison
	assert.deepEqual(pickMoments([800, 0]), { first: 0, mid: null, late: 800, later: null });
	assert.deepEqual(pickMoments([0, 600, 1500, 2000, 4000]), {
		first: 0,
		mid: 600,
		late: 1500,
		later: 4000,
	});
	assert.equal(pickMoments([0]), null);
	assert.deepEqual(pickReference([0, 150, 300, 600, 1200, 2000, 4000]), { ref: 4000, prev: 2000 });
	// no witness from one second on: the end state cannot be called settled
	assert.deepEqual(pickReference([0, 800]), { ref: 800, prev: null });
	assert.equal(pickReference([]), null);
	// the pointer pass compares two frames past the open delays, or nothing
	assert.deepEqual(pickHoverPair([0, 300, 1500, 3000]), { a: 1500, b: 3000 });
	assert.equal(pickHoverPair([0, 800]), null);
	assert.equal(pickHoverPair([0, 1500]), null);
});

test("static findings carry a stable id per defect type across scans", () => {
	const interval = fixtureRepo("<script>\n\tsetInterval(() => {}, 100);\n</script>");
	const idsA = interval.findings.map((f) => f.id);
	assert.ok(idsA.includes("widget-06"), idsA.join());
	const both = fixtureRepo(
		"<script>\n\tsetInterval(() => {}, 100);\n\trequestAnimationFrame(() => {});\n</script>"
	);
	const idsB = both.findings.map((f) => f.id);
	assert.ok(idsB.includes("widget-06") && idsB.includes("widget-03"), idsB.join());
	const ids = Object.values(STATIC_FINDING_IDS);
	assert.equal(new Set(ids).size, ids.length);
	assert.ok(ids.every((n) => /^[01][0-9]$/.test(n)));
});

test("infinite iteration is decided per animation, not per shorthand", () => {
	const css =
		"<style>@keyframes halo { from { filter: blur(0) } to { filter: blur(4px) } }\n@keyframes breathe { from { opacity: .5 } to { opacity: 1 } }\n.a { animation: halo 360ms ease both, breathe 2s ease-in-out infinite; }</style>";
	const mixed = fixtureRepo(css);
	const filterFinding = mixed.findings.find((f) => f.id === "widget-11");
	assert.ok(filterFinding, "the filter animation is still reported");
	assert.equal(filterFinding.priority, "P2", "but not as an infinite one");
	const longhand = fixtureRepo(
		"<style>@keyframes halo { from { filter: blur(0) } to { filter: blur(4px) } }\n@keyframes breathe { from { opacity: .5 } to { opacity: 1 } }\n.a { animation-name: halo, breathe; animation-duration: 360ms, 2s; animation-iteration-count: 1, infinite; }</style>"
	);
	assert.equal(longhand.findings.find((f) => f.id === "widget-11")?.priority, "P2");
	const both = fixtureRepo(
		"<style>@keyframes halo { from { filter: blur(0) } to { filter: blur(4px) } }\n.a { animation: halo 2s ease infinite; }</style>"
	);
	assert.equal(both.findings.find((f) => f.id === "widget-11")?.priority, "P1");
});

test("a rAF callback is a loop only when its body schedules another frame", () => {
	const oneShot =
		"function flush() {\n\tid = null;\n\tpaint();\n}\nid = requestAnimationFrame(flush);";
	const loop =
		"function draw() {\n\tpaint();\n\tid = requestAnimationFrame(draw);\n}\nid = requestAnimationFrame(draw);";
	assert.equal(reschedulesItself(oneShot, "flush"), false);
	assert.equal(reschedulesItself(loop, "draw"), true);
	assert.equal(
		reschedulesItself("const tick = () => {\n\trequestAnimationFrame(tick);\n};", "tick"),
		true
	);
	assert.equal(reschedulesItself("", "nope"), false);
	const unproven = fixtureRepo(`<script>\n${oneShot}\n</script>`).findings.find(
		(f) => f.id === "widget-01"
	);
	assert.equal(unproven.priority, "P2");
	assert.match(unproven.title, /usage/);
	const proven = fixtureRepo(`<script>\n${loop}\n</script>`).findings.find(
		(f) => f.id === "widget-01"
	);
	assert.equal(proven.priority, "P1");
	assert.match(proven.title, /loop/);
});

test("micro-capture: default selection and the hover-only signal", () => {
	const inv = [
		{ slug: "core-a", group: "core", category: "actions" },
		{ slug: "txt", group: "fancy", category: "text" },
		{ slug: "card", group: "fancy", category: "cards" },
		{ slug: "hov", group: "fancy", category: "effects" },
	];
	const hov = { hov: { hoverRules: [{ motionProps: ["transform"] }] } };
	assert.deepEqual(selectSlugs(inv, hov), ["card", "core-a", "hov"]);
	assert.deepEqual(selectSlugs(inv, hov, new Set(["hov"])), ["hov"]);
	// --only is a request: a slug outside the default heuristic is captured too
	assert.deepEqual(selectSlugs(inv, {}, new Set(["txt", "nope"])), ["txt"]);
	assert.equal(
		microSignal({ rest_hover: 0.05, rest_focus: 0, rest_press: 0, noise: 0.001 }).hoverOnly,
		true
	);
	assert.equal(
		microSignal({ rest_hover: 0.05, rest_focus: 0.05, rest_press: null, noise: 0 }).hoverOnly,
		false
	);
	assert.equal(
		microSignal({ rest_hover: 0.003, rest_focus: 0, rest_press: 0, noise: 0.002 }).hover,
		false
	);
});

test("S4: A3 dynamic scores the hover-only defect and writes the P0 finding", () => {
	const hoverOnly = microSignal({ rest_hover: 0.05, rest_focus: 0, rest_press: 0, noise: 0.001 });
	const twin = microSignal({ rest_hover: 0.05, rest_focus: 0.05, rest_press: 0, noise: 0.001 });
	assert.equal(scoreA3Dynamic({ svelte: twin, react: hoverOnly }).score, 0);
	assert.equal(scoreA3Dynamic({ svelte: twin }).score, 3);
	assert.equal(scoreA3Dynamic({ svelte: null }).score, null);
	const p = s4Partial("x", {
		svelte: { status: "ok", ratio: { rest_hover: 0.05, rest_focus: 0 }, signal: hoverOnly },
		react: { status: "error", error: "boom" },
	});
	assert.equal(p.agent, "S4");
	assert.equal(p.axes.A3.score, 0);
	assert.equal(p.findings[0].id, "x-40");
	assert.equal(p.findings[0].priority, "P0");
	assert.deepEqual(p.findings[0].frameworks, ["svelte"]);
	assert.ok(p.uncertain_flags.some((f) => /react: error - boom/.test(f)));
	assert.equal(s4Partial("y", { svelte: { status: "ok", signal: twin } }).findings.length, 0);
});

test("S5: A4 bands on idle CPU, caps on long tasks and leaks, load clamp", () => {
	const rec = (over = {}) => ({
		idle: { cpuMsPerSec: 10, rafPerSec: 0, longTasks: 0 },
		lifecycle: { listenersDelta: 0, nodesDelta: 0, heapDeltaKB: 0 },
		loadAvgAtStart: [1],
		cores: 8,
		...over,
	});
	assert.equal(scoreA4(rec()).score, 3);
	assert.equal(scoreA4(rec({ idle: { cpuMsPerSec: 100, rafPerSec: 60, longTasks: 0 } })).score, 2);
	assert.equal(scoreA4(rec({ idle: { cpuMsPerSec: 10, rafPerSec: 0, longTasks: 1 } })).score, 2);
	assert.equal(scoreA4(rec({ idle: { cpuMsPerSec: 10, rafPerSec: 0, longTasks: 3 } })).score, 1);
	assert.equal(scoreA4(rec({ lifecycle: { listenersDelta: 30 } })).score, 1);
	assert.equal(scoreA4(rec({ idle: { cpuMsPerSec: 500, rafPerSec: 60, longTasks: 0 } })).score, 0);
	const loaded = scoreA4(rec({ idle: { cpuMsPerSec: 500, longTasks: 0 }, loadAvgAtStart: [20] }));
	assert.equal(loaded.score, 1);
	assert.ok(loaded.loaded);
	assert.match(loaded.note, /LOADED machine/);
	assert.equal(scoreA4({ slug: "x", error: "crashed" }).score, null);
	const p = s5Partial("x", rec({ idle: { cpuMsPerSec: 500, longTasks: 0 } }));
	assert.equal(p.findings[0].id, "x-50");
	assert.equal(p.findings[0].priority, "P1");
	assert.equal(s5Partial("x", rec()).findings.length, 0);
});

test("S6: A8 from serious, critical and moderate hits and the keyboard check", () => {
	const state = (sc = [], moderate = []) => ({ seriousCritical: sc, moderate, minor: 0 });
	const serious = { id: "color-contrast", impact: "serious", nodes: 1, summary: "s" };
	const critical = { id: "button-name", impact: "critical", nodes: 1, summary: "c" };
	const res = (dark, light = state(), keyboard = null, errors = []) => ({
		themes: { dark: { rest: dark, open: null }, light: { rest: light, open: null } },
		keyboard,
		errors,
	});
	assert.equal(scoreA8(res(state())).score, 3);
	assert.equal(scoreA8(res(state([], [{ id: "region" }]))).score, 2);
	assert.equal(scoreA8(res(state([serious]))).score, 1);
	assert.equal(scoreA8(res(state(), state([critical]))).score, 0);
	assert.equal(scoreA8(res(state(), state(), { pass: false })).score, 0);
	assert.equal(scoreA8({ themes: {}, errors: ["dark: timeout"] }).score, null);
	// portalled panels that carry no role are popup roots too
	for (const sel of [".ft-hover-card-panel", ".ft-date-picker-panel", ".ft-popover-content"])
		assert.ok(POPUP.split(",").includes(sel), sel);
	// opens only from the pointer: capped at 1; opens but traps focus: 0
	const pointerOnly = { pass: false, keyboardOpen: false, pointerPass: true };
	assert.equal(scoreA8(res(state(), state(), pointerOnly)).score, 1);
	assert.match(scoreA8(res(state(), state(), pointerOnly)).note, /does not open from the keyboard/);
	assert.equal(
		scoreA8(res(state(), state(), { pass: false, keyboardOpen: true, pointerPass: false })).score,
		0
	);
	// a broken probe scores nothing and is flagged, instead of a 0 for the component
	const broken = res(state(), state(), { pass: false, error: "locator timed out" });
	assert.equal(scoreA8(broken).score, 3);
	assert.match(scoreA8(broken).note, /probe unavailable/);
	assert.ok(
		s6Partial("x", broken).uncertain_flags.some((f) => /keyboard probe unavailable/.test(f))
	);
	assert.ok(looksLikeAxe(`/*! axe v4.10.2\n * Copyright */${"x".repeat(60_000)}`));
	assert.equal(looksLikeAxe("<html>503 Service Unavailable</html>"), false);
	const p = s6Partial("x", res(state([serious])));
	assert.equal(p.axes.A8.score, 1);
	assert.equal(p.findings[0].id, "x-60");
	assert.equal(p.findings[0].priority, "P1");
	assert.match(p.findings[0].title, /color-contrast/);
	assert.equal(s6Partial("x", res(state())).findings.length, 0);
});

test("S9: A5 from the parity ratios, settle drift ranks above intermediate drift", () => {
	const entry = (mid, settle) => ({
		dark: { 0: { react: 0, vue: 0 }, 600: { react: mid, vue: 0 }, 2000: { react: settle, vue: 0 } },
		light: { 0: { react: 0, vue: 0 }, 2000: { react: 0, vue: 0 } },
	});
	assert.equal(scoreA5(entry(0, 0)).score, 3);
	assert.equal(scoreA5(entry(0.02, 0)).score, 2);
	assert.equal(scoreA5(entry(0, 0.02)).score, 1);
	assert.equal(scoreA5(entry(0, 0.2)).score, 0);
	assert.equal(scoreA5(null).score, null);
	assert.deepEqual(scoreA5({ dark: { 0: { react: 0, vue: null } } }).missing, ["vue"]);
	// interaction-state keys (`<ms>@<state>`) form their own series: they neither
	// poison the rest settle moment nor hide a settled regression
	const withState = (restSettle, stateMid) => ({
		dark: {
			0: { react: 0, vue: 0 },
			4000: { react: restSettle, vue: 0 },
			"0@open": { react: stateMid, vue: 0 },
			"150@open": { react: 0, vue: 0 },
		},
	});
	assert.equal(scoreA5(withState(0.2, 0)).score, 0);
	assert.equal(scoreA5(withState(0, 0.02)).score, 2);
	assert.equal(scoreA5({ dark: { "150@open": { react: 0.02, vue: 0 } } }).score, 1);
	assert.equal(scoreA5({ dark: { junk: { react: 0.5, vue: 0.5 } } }).score, null);
	const p = s9Partial("x", entry(0, 0.02));
	assert.equal(p.findings[0].id, "x-90");
	assert.equal(p.findings[0].priority, "P1");
	assert.equal(s9Partial("x", entry(0.02, 0)).findings[0].priority, "P2");
	assert.equal(s9Partial("x", entry(0, 0)).findings.length, 0);
});

test("perf-sweep: medians, rates, frame p95, shards", () => {
	assert.equal(median([5, 1, 3]), 3);
	assert.equal(median([1, 2, 3, 4]), 2.5);
	assert.equal(median([]), null);
	assert.deepEqual(agg([{ a: 1 }, { a: 2 }, { a: 9 }]), { a: 2 });
	const r = rates(
		{ TaskDuration: 0, ScriptDuration: 0, LayoutDuration: 0, RecalcStyleDuration: 0 },
		{ TaskDuration: 0.5, ScriptDuration: 0.25, LayoutDuration: 0, RecalcStyleDuration: 0 },
		5000
	);
	assert.equal(Math.round(r.cpuMsPerSec), 100);
	assert.equal(Math.round(r.scriptMsPerSec), 50);
	assert.equal(p95FrameMs([0, 16, 32]), null);
	assert.equal(p95FrameMs(Array.from({ length: 30 }, (_, i) => i * 16)), 16);
	assert.deepEqual(parseShard("2/4"), [2, 4]);
	assert.throws(() => parseShard("4/4"));
	assert.deepEqual(pickTargets(["a", "b", "c", "d"], new Set(["a", "c", "d"]), [0, 1]), [
		"a",
		"c",
		"d",
	]);
	assert.deepEqual(pickTargets(["a", "b", "c", "d"], null, [1, 2]), ["b", "d"]);
});

test("sheet: components that react to input are not ambient loops", () => {
	for (const s of [
		"displacement-text",
		"hyper-text",
		"liquid-text",
		"text-roll",
		"frosted-glass",
		"liquid-glass",
	])
		assert.equal(AMBIENT.has(s), false, s);
	assert.equal(isAmbientCandidate("marquee", "layout"), true);
	assert.equal(isAmbientCandidate("anything", "backgrounds"), true);
	assert.equal(isAmbientCandidate("button", "actions"), false);
	const ok = (fw) => [`${fw}-1`, { fw, status: "ok" }];
	assert.equal(
		classifyCapturable({ slug: "s", entries: [ok("svelte")], hasHover: false, hasHint: false })
			.capturable,
		"full"
	);
	assert.equal(
		classifyCapturable({ slug: "s", entries: [], hasHover: false, hasHint: false }).capturable,
		"none"
	);
	assert.equal(
		classifyCapturable({ slug: "dock", entries: [ok("svelte")], hasHover: true, hasHint: true })
			.capturable,
		"pointer-pass"
	);
	assert.deepEqual(missingPorts([ok("svelte"), ok("vue")]), ["react"]);
});

test("axe-sweep: demo and transient nodes leave the component score", () => {
	const node = (demo, transient = false) => ({
		target: "#a",
		html: "<p>",
		summary: "",
		demo,
		demo_reason: demo ? "d" : null,
		transient,
	});
	const r = axeSplit({
		sc: [
			{
				id: "color-contrast",
				impact: "serious",
				help: "h",
				nodes: [node(false), node(true), node(false, true)],
			},
		],
		moderate: [],
		minor: 0,
		incomplete: 0,
	});
	assert.equal(r.comp.seriousCritical[0].nodes, 1);
	assert.equal(r.demo[0].nodes, 2);
	const result = {
		themes: { dark: { rest: r.comp, open: null }, light: { rest: r.comp, open: r.comp } },
	};
	assert.equal(countSeriousCritical(result, "dark"), 1);
	assert.equal(countSeriousCritical(result, "light"), 2);
});

// --- merge and matrix ------------------------------------------------------------

function partials(over = {}) {
	return {
		S1: {
			fields: { motion_class: "micro", render: ["dom"] },
			axes: { A1: axisOk(3), A2: axisOk(3) },
			findings: [],
		},
		S2: { fields: { capturable: "full" } },
		S3: { axes: { A2: axisOk(3) } },
		S4: { axes: { A3: axisOk(3) } },
		S5: { axes: { A4: axisOk(3) } },
		S9: { axes: { A5: axisOk(3) } },
		S6: { axes: { A8: axisOk(3) } },
		...over,
	};
}
const item = { slug: "x", group: "fancy", category: "cards" };

test("merge: A2 is the lower of static and dynamic; a 0 mints one synthetic P0 finding (R1)", () => {
	assert.equal(mergeA2(axisOk(3), axisOk(1)).score, 1);
	assert.equal(
		mergeA2(axisOk(2), { score: null, na_reason: "static", evidence: [], note: "s" }).score,
		2
	);
	assert.equal(mergeA2(null, null).score, null);
	const { record, missing } = mergeRecord({
		item,
		P: partials({ S3: { axes: { A2: axisOk(0) } } }),
		RP: [],
		old: null,
		exists: () => true,
	});
	assert.equal(record.axes.A2.score, 0);
	assert.equal(record.priority, "P0");
	const syn = record.findings.filter((f) => f.id === "x-A2-axis");
	assert.equal(syn.length, 1);
	assert.equal(syn[0].priority, "P0");
	assert.match(syn[0].verification_cmd, /scripts\/audit\/rm-check\.mjs --only x/);
	assert.deepEqual(
		missing,
		["S2", "S3", "S4", "S5", "S6", "S9", "S1"].filter((a) => !partials()[a])
	);
	assert.deepEqual(validateRecord(record, { exists: () => true }), []);
});

test("merge: re-merge keeps adversarial verdicts and does not duplicate the synthetic finding", () => {
	const P = partials({ S3: { axes: { A2: axisOk(0) } } });
	const first = mergeRecord({ item, P, RP: [], old: null, exists: () => true }).record;
	first.findings[0] = {
		...first.findings[0],
		adversarial: "DOWNGRADED",
		adversarial_note: "n",
		priority: "P1",
	};
	const again = mergeRecord({ item, P, RP: [], old: first, exists: () => true }).record;
	const syn = again.findings.filter((f) => f.id === "x-A2-axis");
	assert.equal(syn.length, 1);
	assert.equal(syn[0].adversarial, "DOWNGRADED");
	assert.equal(syn[0].priority, "P1");
});

test("merge: raters keep the lower score when they differ by more than 1", () => {
	const rp = [
		{ agent: "R-a", axes: { A6: axisOk(3), A7: axisOk(3) } },
		{ agent: "R-b", axes: { A6: axisOk(2), A7: axisOk(1) } },
	];
	assert.equal(rateAxis(rp, "A6").axis.score, 2);
	const a7 = rateAxis(rp, "A7");
	assert.equal(a7.axis.score, 1);
	assert.deepEqual(a7.flags, ["A7-disagreement"]);
	assert.equal(rateAxis([], "A6").axis.note, "awaiting rater");
	assert.equal(syntheticPriority("A8", 0), "P0");
	assert.equal(syntheticPriority("A4", 1), "P1");
	assert.equal(syntheticPriority("A7", 0), null);
});

test("matrix: assertions catch a stale priority and a finding without evidence", () => {
	const finding = {
		id: "x-A2-axis",
		axis: "A2",
		priority: "P0",
		title: "A2 score 0: moves under reduce",
		evidence: ["components/x/evidence/static.txt"],
		verification: "capture",
		verification_cmd: "node <REPO>/scripts/audit/rm-check.mjs --only x",
		expected_benefit: "b",
		frameworks: ["svelte"],
		status: "open",
	};
	const r = goodRecord({ priority: "P0", findings: [finding] });
	r.axes.A2 = axisOk(0);
	const rec = { rel: "components/x/record.json", r };
	assert.deepEqual(
		assertRecords([rec], () => true),
		[]
	);
	assert.ok(assertRecords([rec], () => false).some((v) => /no existing evidence/.test(v)));
	const stale = { rel: rec.rel, r: { ...r, priority: "P2" } };
	assert.ok(assertRecords([stale], () => true).some((v) => /priority P2 != recomputed P0/.test(v)));
	// the completion gate also validates the schema, which the cross-record rules skip
	assert.deepEqual(
		validateAll([rec], () => true),
		[]
	);
	const bad = { rel: rec.rel, r: { ...r, axes: { ...r.axes, A1: axisOk(99) } } };
	assert.deepEqual(
		assertRecords([bad], () => true),
		[]
	);
	assert.ok(
		validateAll([bad], () => true).some((v) => /A1: score must be null or an integer 0-3/.test(v))
	);
	assert.equal(driversCell(r), "A2=0");
	assert.equal(axisCell(r, "A2"), "0");
	assert.equal(deltaCell(r, { x: { priority: "P2", axes: { A2: 2 } } }), "new P0");
	const out = renderMatrix({
		recs: [rec],
		stamp: "t",
		sha: "s",
		iteration: 1,
		repo: "/r",
		out: "/o",
	});
	assert.equal(out.counts.p0p1, 1);
	assert.equal(out.pp[0].verification_cmd, "node /r/scripts/audit/rm-check.mjs --only x");
	assert.match(out.markdown, /## fancy\/cards/);
});
