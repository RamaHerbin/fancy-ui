#!/usr/bin/env node
/**
 * Matrix generator: every `components/<slug>/record.json` -> one markdown matrix
 * plus the finding lists.
 *
 * Nothing in the matrix is typed by hand: a cell without a record behind it fails
 * the generator, and before writing anything it asserts the cross-record rules
 *
 *   - the recorded priority equals the one recomputed from the axes and findings
 *     (rubric amendment R1/R2, see lib.mjs `recordPriority`);
 *   - every live P0/P1 finding has at least one evidence path that exists, a
 *     verification kind other than `manual`, and a non-empty verification command.
 *
 * Outputs (in `--out`): COMPONENT_IMPROVEMENT_MATRIX.md (per category, sorted by
 * priority then score; appendices for live P0/P1 findings, wontfix findings and
 * duplicates), findings-all.json (live findings) and findings-p0p1.json.
 * `<REPO>` and `<AUDIT>` in a verification command expand to the repo root and the
 * `--out` folder.
 *
 * Usage:
 *   node scripts/audit/build-matrix.mjs [--repo <dir>] [--out <dir>] [--inventory <file>]
 *            [--iteration 1] [--stamp <iso>] [--sha <short sha>]
 *            [--baseline <scores.json>] [--reviews <dir>] [--self-test]
 *
 *   --baseline   JSON `{ "<slug>": { priority, axes: { A1: score|null, ... } } }` from an
 *                earlier iteration; fills the delta column (up / down / new P0)
 *   --reviews    folder of JSON arrays of `{ verdict }` rows (adversarial review
 *                output); only used to tally verdicts in the summary
 *
 * What this does NOT catch: whether a score is right (it renders the records it is
 * given) or whether an evidence file shows what its finding says; it only proves
 * the file exists.
 */

import fs from "node:fs";
import { join } from "node:path";
import {
	AXES,
	PRIORITY_RANK as PR,
	isLiveFinding as live,
	isMain,
	loadInventory,
	parseArgs,
	priorityDrivers,
	recordPriority,
	resolvePaths,
	axisPriority,
	stripLineRef,
} from "./lib.mjs";

const isDup = (f) => String(f.status).startsWith("duplicate-of:");
const esc = (s) =>
	String(s ?? "")
		.replace(/\|/g, "\\|")
		.replace(/\n/g, " ");
const scoresOf = (r) => Object.fromEntries(AXES.map((k) => [k, r.axes[k].score]));

/** Cross-record assertions. Returns violation strings (empty = pass). */
export function assertRecords(recs, exists) {
	const viol = [];
	for (const { r } of recs) {
		const want = recordPriority(scoresOf(r), r.findings);
		if (want !== r.priority) viol.push(`${r.slug}: priority ${r.priority} != recomputed ${want}`);
		for (const f of r.findings) {
			if (!live(f) || !(f.priority === "P0" || f.priority === "P1")) continue;
			if (!f.evidence?.some((p) => exists(stripLineRef(p))))
				viol.push(`${r.slug}/${f.id}: no existing evidence path`);
			if (f.verification === "manual" || !f.verification_cmd?.trim())
				viol.push(`${r.slug}/${f.id}: manual verification or empty verification_cmd`);
		}
	}
	return viol;
}

/** Cell text for one axis. */
export function axisCell(r, k) {
	const a = r.axes[k];
	if (!a) throw new Error("axis cell without record data");
	if (a.score === null) return a.note === "awaiting rater" ? "..." : "N/A";
	let s = String(a.score);
	if (k === "A4" && /LOADED machine/.test(a.note ?? "") && !/quiet/i.test(a.note ?? "")) s += "*";
	const raw = r.raters?.[`${k}_raw`];
	if ((k === "A6" || k === "A7") && raw?.length === 2 && Math.abs(raw[0] - raw[1]) === 1)
		s += ` (${raw[0]}/${raw[1]})`;
	return s;
}

const topFinding = (r) =>
	[...r.findings]
		.filter(live)
		.sort((a, b) => PR[a.priority] - PR[b.priority] || a.id.localeCompare(b.id))[0];

/** What set the record priority: the driving axes, or the live finding that outranks them. */
export function driversCell(r) {
	const d = priorityDrivers(scoresOf(r)).map((x) => `${x.axis}=${r.axes[x.axis].score}`);
	const ap = axisPriority(scoresOf(r), r.findings.length);
	if (PR[r.priority] < (PR[ap] ?? 9)) {
		const t = r.findings
			.filter((f) => live(f) && f.priority === r.priority)
			.sort((a, b) => a.id.localeCompare(b.id))[0];
		d.push(`finding:${t?.id}`);
	}
	return d.length ? d.join(",") : "-";
}

/** Delta against a baseline row: "new P0", an up or down arrow, or "". */
export function deltaCell(r, base) {
	const o = base?.[r.slug];
	if (!o) return "";
	if (r.priority === "P0" && o.priority !== "P0") return "new P0";
	let up = 0;
	let down = 0;
	for (const k of AXES) {
		const n = r.axes[k].score;
		const p = o.axes[k];
		if (n === null || p === null || p === undefined || n === p) continue;
		n > p ? up++ : down++;
	}
	const pa = PR[o.priority] ?? 9;
	const pb = PR[r.priority] ?? 9;
	if (pb < pa) down++;
	else if (pb > pa) up++;
	return down ? "↓" : up ? "↑" : "";
}

/**
 * Render the matrix.
 *
 * @param {{ recs: { rel: string, r: any }[], stamp: string, sha: string, iteration: number,
 *           baseline?: any, verdictRows?: { verdict: string }[]|null, repo: string, out: string }} x
 */
export function renderMatrix({
	recs,
	stamp,
	sha,
	iteration,
	baseline = null,
	verdictRows = null,
	repo,
	out,
}) {
	const expand = (s) =>
		String(s ?? "")
			.replaceAll("<REPO>", repo)
			.replaceAll("<AUDIT>", out);
	const by = (f) => recs.filter(f).length;
	const L = [];
	L.push(
		`# Component improvement matrix (iteration ${iteration})`,
		"",
		`Generated: ${stamp} | repo sha ${sha} | iteration ${iteration}`,
		`Source: ${recs.length} \`components/<slug>/record.json\` (generated by scripts/audit/build-matrix.mjs, nothing hand-typed). Findings with status \`wontfix\` are excluded from counts and from Appendix A (listed in appendix B); findings with status \`duplicate-of:*\` are excluded too (listed in appendix C).`,
		""
	);
	L.push(
		"## Legend",
		"",
		"- Scores 0-3 per axis (3 = fully meets, 0 = contract broken). `N/A` = not applicable (excluded from mean). `...` = awaiting rater (A6, A7).",
		"- A1 motion tokens | A2 reduced motion | A3 hover/pointer-only | A4 perf | A5 framework parity | A6 polish | A7 originality | A8 a11y baseline.",
		"- score = mean of non-null axes x 8 (0-24).",
		"- Axis-derived priority: 0 on A2/A3/A8 = P0; <=1 on A1/A4/A5 or 0 on A6 = P1; else P2; `none` = no findings and all axes >= 2.",
		"- Record priority (rubric amendment R2) = the MORE severe of the axis-derived priority and the highest priority among live non-duplicate findings. An axe serious/critical hit owned by the component is a P1 finding even though A8=1 alone leaves the axis-derived priority at P2.",
		"- Every priority-driving axis has a live P0/P1 finding behind it (R1): when no agent emitted one, the merge mints a synthetic finding `<slug>-<axis>-axis` (verdict `-` = not yet challenged).",
		"- `drivers` = axes (or the live finding) that set the record priority. `verdict` = adversarial verdict of the top finding (`-` = not yet challenged). `Δ` = change against the baseline file: `↑` improved, `↓` something got worse (or priority more severe), `new P0` = became P0 since the baseline, empty = unchanged or no baseline.",
		"- `*` on A4 = load-clamped measurement, indicative only (the A4 note carries `LOADED machine`). A6/A7 `n (a/b)` = the two raters disagreed by 1; the integer is the lower of the pair.",
		"- P3 = creative/polish suggestion from raters (A6/A7), never in the fix queue.",
		"- `wontfix` = refuted by adversarial review or ruled a capture-rig artefact. `duplicate-of:<id>` = same defect as the canonical finding.",
		"- `.parity-rm/` paths in evidence and commands are ephemeral capture output (untracked): never add them to git.",
		"- Evidence link = the record.json holding every axis evidence path.",
		""
	);
	L.push("## Summary", "", "| priority | records |", "|---|---|");
	for (const p of ["P0", "P1", "P2", "none"]) L.push(`| ${p} | ${by((x) => x.r.priority === p)} |`);
	L.push("", "| axis | mean (scored) | scored | N/A | awaiting |", "|---|---|---|---|---|");
	for (const k of AXES) {
		const sc = recs.map((x) => x.r.axes[k].score).filter((s) => s !== null);
		const aw = by((x) => x.r.axes[k].score === null && x.r.axes[k].note === "awaiting rater");
		const na = by((x) => x.r.axes[k].score === null) - aw;
		L.push(
			`| ${k} | ${sc.length ? (sc.reduce((a, b) => a + b, 0) / sc.length).toFixed(2) : "-"} | ${sc.length} | ${na} | ${aw} |`
		);
	}
	const every = recs.flatMap((x) => x.r.findings.map((f) => ({ slug: x.r.slug, ...f })));
	const all = every.filter(live);
	const refuted = every.filter((f) => f.status === "wontfix");
	const dups = every.filter(isDup);
	const pp = all
		.filter((f) => f.priority === "P0" || f.priority === "P1")
		.sort((a, b) => PR[a.priority] - PR[b.priority] || a.id.localeCompare(b.id));
	const cnt = (v) => pp.filter((f) => (v === "-" ? !f.adversarial : f.adversarial === v)).length;
	const n = (p) => all.filter((f) => f.priority === p).length;
	L.push(
		"",
		`Findings (live): ${all.length} (P0 ${n("P0")}, P1 ${n("P1")}, P2 ${n("P2")}, P3 ${n("P3")}); uncertain ${all.filter((f) => f.status === "uncertain").length}; wontfix ${refuted.length}; duplicates ${dups.length}.`
	);
	L.push(
		"",
		`Adversarial verdicts on live P0/P1 (${pp.length}): CONFIRMED ${cnt("CONFIRMED")}, DOWNGRADED ${cnt("DOWNGRADED")}, REFUTED ${cnt("REFUTED")}, not yet challenged ${cnt("-")}.`
	);
	if (verdictRows) {
		const c = (v) => verdictRows.filter((x) => x.verdict === v).length;
		L.push(
			"",
			`Review rows read (CONFIRMED/DOWNGRADED/REFUTED): ${c("CONFIRMED")}/${c("DOWNGRADED")}/${c("REFUTED")} of ${verdictRows.length}.`
		);
	}
	L.push("");
	const cats = [...new Set(recs.map((x) => x.r.category))].sort();
	for (const c of cats) {
		L.push(
			`## ${c}`,
			"",
			"| slug | A1 | A2 | A3 | A4 | A5 | A6 | A7 | A8 | score | priority | drivers | Δ | verdict | top finding | evidence |",
			"|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|"
		);
		const rows = recs
			.filter((x) => x.r.category === c)
			.sort(
				(a, b) =>
					(PR[a.r.priority] ?? 9) - (PR[b.r.priority] ?? 9) || a.r.score_total - b.r.score_total
			);
		for (const { r, rel } of rows) {
			const t = topFinding(r);
			L.push(
				`| ${r.slug} | ${AXES.map((k) => axisCell(r, k)).join(" | ")} | ${r.score_total} | ${r.priority} | ${driversCell(r)} | ${deltaCell(r, baseline)} | ${t ? (t.adversarial ?? "-") : ""} | ${t ? esc(`${t.id} ${t.title}`) : "-"} | [${rel}](${rel}) |`
			);
		}
		L.push("");
	}
	const ppOut = pp.map((f) => ({ ...f, verification_cmd: expand(f.verification_cmd) }));
	L.push(
		"## Appendix A: Live P0 and P1 findings (verdict '-' = not yet challenged)",
		"",
		`${pp.length} findings.`,
		"",
		"| id | slug | priority | axis | verdict | status | title | evidence | verification_cmd |",
		"|---|---|---|---|---|---|---|---|---|"
	);
	for (const f of ppOut)
		L.push(
			`| ${f.id} | ${f.slug} | ${f.priority} | ${f.axis} | ${f.adversarial ?? "-"} | ${f.status} | ${esc(f.title)} | ${esc(f.evidence.join(", "))} | \`${esc(f.verification_cmd)}\` |`
		);
	L.push("");
	const rp = [...refuted].sort((a, b) => a.slug.localeCompare(b.slug) || a.id.localeCompare(b.id));
	L.push(
		"## Appendix B: wontfix findings (kept for traceability, not in the fix queue)",
		"",
		`${rp.length} findings.`,
		"",
		"| id | slug | original priority | axis | source | title | reason |",
		"|---|---|---|---|---|---|---|"
	);
	for (const f of rp)
		L.push(
			`| ${f.id} | ${f.slug} | ${f.priority} | ${f.axis} | ${f.adversarial ? "adversarial" : "capture review"} | ${esc(f.title)} | ${esc((f.adversarial_note ?? f.note ?? "").slice(0, 220))} |`
		);
	L.push("");
	const dp = [...dups].sort((a, b) => a.slug.localeCompare(b.slug) || a.id.localeCompare(b.id));
	L.push(
		"## Appendix C: duplicates (same defect as a canonical finding, excluded from live counts)",
		"",
		`${dp.length} findings.`,
		"",
		"| id | slug | canonical | priority | axis | title |",
		"|---|---|---|---|---|---|"
	);
	for (const f of dp)
		L.push(
			`| ${f.id} | ${f.slug} | ${f.status.slice("duplicate-of:".length)} | ${f.priority} | ${f.axis} | ${esc(f.title)} |`
		);
	L.push("");
	return {
		markdown: L.join("\n"),
		all: all.map((f) => ({ ...f, verification_cmd: expand(f.verification_cmd) })),
		pp: ppOut,
		counts: {
			records: recs.length,
			live: all.length,
			p0p1: pp.length,
			dups: dups.length,
			wontfix: refuted.length,
		},
	};
}

export function selfTest() {
	const fail = (m) => {
		console.error(`build-matrix self-test FAILED: ${m}`);
		process.exit(1);
	};
	const axis = (score) => ({
		score,
		evidence: ["components/x/evidence/static.txt"],
		note: score === null ? "n/a" : "n",
	});
	const mk = (slug, scores, findings, priority) => ({
		rel: `components/${slug}/record.json`,
		r: {
			slug,
			category: "fancy/cards",
			score_total: 10,
			priority,
			findings,
			raters: {},
			axes: Object.fromEntries(AXES.map((k, i) => [k, axis(scores[i])])),
		},
	});
	const finding = {
		id: "x-A2-axis",
		axis: "A2",
		priority: "P0",
		title: "A2 score 0: moves under reduce",
		evidence: ["components/x/evidence/static.txt"],
		verification: "capture",
		verification_cmd: "node <REPO>/scripts/audit/rm-check.mjs --only x",
		status: "open",
	};
	const good = mk("x", [3, 0, 3, 3, 3, 3, 3, 3], [finding], "P0");
	if (assertRecords([good], () => true).length) fail("a coherent record passes");
	const wrongPriority = mk("y", [3, 3, 3, 3, 3, 3, 3, 3], [], "P1");
	if (!/priority P1 != recomputed none/.test(assertRecords([wrongPriority], () => true).join()))
		fail("priority mismatch");
	const noEvidence = mk("z", [3, 0, 3, 3, 3, 3, 3, 3], [{ ...finding, id: "z-A2-axis" }], "P0");
	if (!assertRecords([noEvidence], () => false).some((v) => /no existing evidence/.test(v)))
		fail("evidence assertion");
	const manual = mk(
		"w",
		[3, 0, 3, 3, 3, 3, 3, 3],
		[{ ...finding, id: "w-A2-axis", verification: "manual" }],
		"P0"
	);
	if (!assertRecords([manual], () => true).some((v) => /manual/.test(v)))
		fail("manual verification");
	if (driversCell(good.r) !== "A2=0") fail("drivers");
	if (axisCell(mk("n", [null, 3, 3, 3, 3, 3, 3, 3], [], "P2").r, "A1") !== "N/A") fail("N/A cell");
	const base = { x: { priority: "P1", axes: { A2: 1 } } };
	if (deltaCell(good.r, base) !== "new P0") fail("new P0 delta");
	const md = renderMatrix({
		recs: [good],
		stamp: "t",
		sha: "s",
		iteration: 1,
		repo: "/r",
		out: "/o",
	});
	if (
		!md.markdown.includes("| x | 3 | 0 |") ||
		md.pp[0].verification_cmd !== "node /r/scripts/audit/rm-check.mjs --only x"
	)
		fail("render");
	console.log("build-matrix self-test ok");
}

function main() {
	const { opts, flags } = parseArgs(process.argv.slice(2), ["self-test"]);
	if (flags.has("self-test")) return selfTest();
	const paths = resolvePaths(opts);
	const fail = (m) => {
		console.error(m);
		process.exit(1);
	};
	const recs = [];
	for (const it of loadInventory(paths.inventory)) {
		const rel = `components/${it.slug}/record.json`;
		if (!fs.existsSync(join(paths.out, rel))) fail(`no record behind cell: ${rel}`);
		recs.push({ rel, r: JSON.parse(fs.readFileSync(join(paths.out, rel), "utf8")) });
	}
	const exists = (q) => fs.existsSync(join(paths.out, q)) || fs.existsSync(join(paths.repo, q));
	const viol = assertRecords(recs, exists);
	if (viol.length) {
		console.error(viol.join("\n"));
		fail(`ASSERT FAIL: ${viol.length} violations`);
	}
	const baseline = opts.baseline ? JSON.parse(fs.readFileSync(opts.baseline, "utf8")) : null;
	let verdictRows = null;
	if (opts.reviews && fs.existsSync(opts.reviews)) {
		verdictRows = fs
			.readdirSync(opts.reviews)
			.filter((f) => f.endsWith(".json"))
			.flatMap((f) => {
				const d = JSON.parse(fs.readFileSync(join(opts.reviews, f), "utf8"));
				return Array.isArray(d) ? d.filter((x) => x.verdict) : [];
			});
	}
	const out = renderMatrix({
		recs,
		stamp: opts.stamp ?? new Date().toISOString(),
		sha: opts.sha ?? "unknown",
		iteration: Number(opts.iteration ?? 1),
		baseline,
		verdictRows,
		repo: paths.repo,
		out: paths.out,
	});
	fs.mkdirSync(paths.out, { recursive: true });
	fs.writeFileSync(join(paths.out, "COMPONENT_IMPROVEMENT_MATRIX.md"), out.markdown);
	fs.writeFileSync(join(paths.out, "findings-all.json"), JSON.stringify(out.all, null, 2) + "\n");
	fs.writeFileSync(join(paths.out, "findings-p0p1.json"), JSON.stringify(out.pp, null, 2) + "\n");
	const c = out.counts;
	console.log(
		`matrix: ${c.records} records, ${c.live} live findings, ${c.p0p1} P0/P1, ${c.dups} duplicates, ${c.wontfix} wontfix`
	);
}

if (isMain(process.argv[1], import.meta.url)) main();
