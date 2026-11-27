#!/usr/bin/env node
/**
 * Merge per-instrument partials into one record.json per component.
 *
 * Every instrument writes a small `partial-<id>.json` next to the evidence it
 * produced; this script is the only place those become a record that
 * `schema/record.schema.json` validates and `build-matrix.mjs` reads:
 *
 *   S1 static.mjs        A1, A2 (static half), motion_class, render, sound
 *   S2 sheet.mjs         capturable, hover pass, ambient check
 *   S3 rm-check.mjs      A2 (dynamic half)
 *   S4 micro-capture     A3
 *   S5 perf-sweep        A4
 *   S6 axe-sweep         A8
 *   S9 parity            A5
 *   R-*-A / R-*-B        two independent rater partials for the subjective axes A6, A7
 *
 * Merge rules (rubric, "it2 amendment"):
 *   - A2 = the lower of the static and dynamic scores when both exist, else the
 *     one that exists, else null with a reason.
 *   - A6 / A7 = the lower of two raters when they differ by more than 1 (flagged
 *     `<axis>-disagreement`), else the median rounded down.
 *   - R1: an axis that drives priority (A2/A3/A8 = 0; A1/A4/A5 <= 1; A6 = 0) with no
 *     live P0/P1 finding on it gets a synthetic finding `<slug>-<axis>-axis`, with a
 *     real verification command. Ids are stable across re-merges.
 *   - R2: record priority = the more severe of the axis-derived priority and the
 *     highest live P0/P1 finding.
 *   - Re-merge keeps per finding id: adversarial verdicts, `wontfix` and
 *     `duplicate-of:*` statuses, downgraded priorities, and findings absent from
 *     the new partials. Fresh partials win otherwise.
 *
 * Usage:
 *   node scripts/audit/merge-records.mjs [--repo <dir>] [--out <dir>] [--inventory <file>]
 *            [--only slug,slug] [--overrides <file>] [--adjustments a.json,b.json]
 *            [--iteration 1] [--filled-by <name>] [--self-test]
 *
 *   --overrides    JSON `{ "duplicates": { "<finding id>": "<canonical id>" },
 *                  "axisNotes": { "<slug>/<axis>": "<text appended to the note>" } }`
 *   --adjustments  JSON arrays of `{ slug, axis, score, evidence?, note }` applied
 *                  after the merge (one file per review pass; the file name is the label)
 *
 * What this does NOT catch: a wrong score inside a partial (it merges what it is
 * given), or evidence that exists but does not show what the finding claims.
 * `build-matrix.mjs` asserts the cross-record rules; reviewers check the rest.
 */

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import { basename, join } from "node:path";
import {
	AXES,
	NA_REASONS,
	PRIORITY_RANK,
	isLiveFinding,
	isMain,
	loadInventory,
	parseArgs,
	parseList,
	recordPriority,
	resolvePaths,
	scoreTotal,
	stripLineRef,
} from "./lib.mjs";

export const AGENTS = ["S1", "S2", "S3", "S4", "S5", "S6", "S8", "S9"];
const AXIS_NA = new Set([...NA_REASONS, "not-applicable"]);
export const SYN_RE = /-A[1-8]-axis$/;

export const normNa = (s) => (AXIS_NA.has(s) ? s : "not-applicable");

/** One axis from a partial, normalised; null when the partial has none. */
export function axisOf(p, k) {
	const a = p?.axes?.[k];
	if (!a) return null;
	const o = { score: a.score ?? null, evidence: a.evidence ?? [], note: a.note ?? "" };
	if (o.score === null) o.na_reason = normNa(a.na_reason);
	return o;
}

const missAxis = (why) => ({ score: null, na_reason: "not-applicable", evidence: [], note: why });

/** A2 from the static (S1) and dynamic (S3) axes. */
export function mergeA2(s1, s3) {
	if (s1 && s3 && s1.score !== null && s3.score !== null) {
		return {
			score: Math.min(s1.score, s3.score),
			evidence: [...new Set([...s1.evidence, ...s3.evidence])],
			note: `static(S1)=${s1.score}: ${s1.note} | dynamic(S3)=${s3.score}: ${s3.note}`,
		};
	}
	const use = [s1, s3].find((x) => x && x.score !== null);
	if (use)
		return {
			score: use.score,
			evidence: use.evidence,
			note: (use === s1 ? "static only(S1): " : "dynamic only(S3): ") + use.note,
		};
	return {
		score: null,
		na_reason: normNa(s1?.na_reason ?? s3?.na_reason),
		evidence: [...(s1?.evidence ?? []), ...(s3?.evidence ?? [])],
		note: [s1?.note, s3?.note].filter(Boolean).join(" | ") || "S1 and S3 A2 data missing",
	};
}

/**
 * One subjective axis (A6 or A7) from the rater partials. Two raters that differ by
 * more than 1 keep the lower score and raise a disagreement flag.
 *
 * @param {{ agent?: string, axes?: Record<string, any> }[]} raterPartials
 * @param {string} k
 */
export function rateAxis(raterPartials, k) {
	const rows = raterPartials
		.map((p) => ({ ag: p.agent, a: p.axes?.[k] }))
		.filter((x) => x.a && x.a.score !== null && x.a.score !== undefined);
	if (!rows.length)
		return {
			axis: {
				score: null,
				na_reason: "not-applicable",
				evidence: [],
				note: raterPartials.length ? `rater ${k} null from all raters` : "awaiting rater",
			},
			raw: [],
			agents: [],
			flags: [],
		};
	const raw = rows.map((x) => x.a.score);
	const lo = Math.min(...raw);
	const hi = Math.max(...raw);
	let score = Math.floor((lo + hi) / 2); // median of two, rounded down (integer schema, conservative)
	const flags = [];
	let tag = "";
	if (raw.length === 2 && hi - lo > 1) {
		score = lo;
		flags.push(`${k}-disagreement`);
		tag = "DISAGREEMENT |a-b|>1, kept lower: ";
	}
	const note =
		tag +
		rows.map((x) => `${x.ag}=${x.a.score}: ${x.a.note ?? ""}`).join(" | ") +
		(raw.length === 2 && lo !== hi ? ` | median ${(lo + hi) / 2} -> ${score} (floor)` : "");
	return {
		axis: { score, evidence: [...new Set(rows.flatMap((x) => x.a.evidence ?? []))], note },
		raw,
		agents: rows.map((x) => x.ag),
		flags,
	};
}

/** Priority a synthetic finding for this axis score would carry (null = axis drives nothing). */
export function syntheticPriority(k, s) {
	if ((k === "A2" || k === "A3" || k === "A8") && s === 0) return "P0";
	if ((["A1", "A4", "A5"].includes(k) && s !== null && s <= 1) || (k === "A6" && s === 0))
		return "P1";
	return null;
}

/** Verification kind and command for a synthetic finding (commands run from the repo root). */
export function syntheticVerification(k, slug, note) {
	const st = `node scripts/audit/static.mjs --only ${slug}`;
	const staticHalf = /static\(S1\)=0|static only/.test(note);
	const verification =
		k === "A4"
			? "perf"
			: k === "A2"
				? staticHalf
					? "grep"
					: "capture"
				: k === "A1"
					? "grep"
					: k === "A3"
						? /dynamic/.test(note)
							? "capture"
							: "grep"
						: k === "A8"
							? "axe"
							: "capture";
	const cmd =
		k === "A4"
			? `node scripts/audit/perf-sweep.mjs --only ${slug}`
			: k === "A8"
				? `node scripts/audit/axe-sweep.mjs --only ${slug}`
				: k === "A2"
					? `${st} && node scripts/parity/capture.mjs --only ${slug} --reduced-motion reduce --moments 0,300,1500,3000 --out .parity-rm && node scripts/audit/rm-check.mjs --only ${slug}`
					: k === "A1" || k === "A3"
						? st
						: `node scripts/parity/capture.mjs --only ${slug} --moments 0,150,300,600,1200 --out .parity-recheck`;
	return { verification, cmd };
}

/**
 * Merge one component. Pure: all file access goes through the arguments.
 *
 * @param {object} x
 * @param {{ slug: string, group: string, category: string }} x.item
 * @param {Record<string, any>} x.P partials by agent id (null when absent)
 * @param {any[]} x.RP rater partials, sorted
 * @param {any|null} x.old the existing record.json, if any
 * @param {[string, any[]][]} [x.adjustments] review passes: [label, rows]
 * @param {{ duplicates?: Record<string,string>, axisNotes?: Record<string,string> }} [x.overrides]
 * @param {(p: string) => boolean} x.exists evidence-path resolver
 */
export function mergeRecord({
	item,
	P,
	RP,
	old,
	adjustments = [],
	overrides = {},
	exists,
	capSha = "unknown",
	iteration = 1,
	filledBy = "merge-records",
}) {
	const slug = item.slug;
	const carry = {
		adversarial: 0,
		status: 0,
		downgraded: 0,
		kept_absent: 0,
		synthetic_minted: 0,
		synthetic_carried: 0,
	};
	const missing = AGENTS.filter((a) => !P[a] && a !== "S8"); // S8 (docs gaps) exists only where there is a gap
	const kind = item.group;
	const category = `${kind}/${item.category}`;
	const f1 = P.S1?.fields ?? {};
	const f2 = P.S2?.fields ?? {};
	const motion_class = f1.motion_class ?? "static";
	const render = f1.render?.length ? f1.render : ["dom"];
	const capturable = f2.capturable ?? "none";
	let na_reason = null;
	if (motion_class === "static") na_reason = "static";
	else if (capturable === "rest-only") {
		if (render.includes("webgl") || render.includes("webgpu")) na_reason = "no-gpu-headless";
		else if (motion_class === "scroll") na_reason = "scroll-driven";
	} else if (capturable === "none") na_reason = "no-gpu-headless";

	const r6 = rateAxis(RP, "A6");
	const r7 = rateAxis(RP, "A7");
	const axes = {
		A1: axisOf(P.S1, "A1") ?? missAxis("S1 partial missing"),
		A2: mergeA2(axisOf(P.S1, "A2"), axisOf(P.S3, "A2")),
		A3: axisOf(P.S4, "A3") ?? missAxis("S4 partial missing"),
		A4: axisOf(P.S5, "A4") ?? missAxis("S5 partial missing"),
		A5: axisOf(P.S9, "A5") ?? missAxis("S9 partial missing"),
		A6: r6.axis,
		A7: r7.axis,
		A8: axisOf(P.S6, "A8") ?? missAxis("S6 partial missing"),
	};
	const raters = {};
	if (r6.raw.length) {
		raters.A6 = r6.agents;
		raters.A6_raw = r6.raw;
	}
	if (r7.raw.length) {
		raters.A7 = r7.agents;
		raters.A7_raw = r7.raw;
	}
	const extraFlags = [...r6.flags, ...r7.flags];

	// findings from every partial; rater partials may reuse an NN, renumber the later ones
	const seen = new Set();
	const findings = [];
	const SRC = [...AGENTS.map((a) => [a, P[a]]), ...RP.map((p) => [p.agent ?? "R", p])];
	for (const [a, pp] of SRC) {
		for (const f of pp?.findings ?? []) {
			const g = { ...f };
			if (seen.has(f.id)) {
				if (!String(a).startsWith("R-")) continue; // instrument duplicates stay dropped
				let nn = 99;
				while (seen.has(`${slug}-${String(nn).padStart(2, "0")}`) && nn > 10) nn--;
				g.id = `${slug}-${String(nn).padStart(2, "0")}`;
				g.note = [g.note, `renumbered from ${f.id} (id collision between rater partials)`]
					.filter(Boolean)
					.join(" | ");
			}
			seen.add(g.id);
			// evidence that is the ABSENCE of a file: keep only existing paths, note the absent ones
			const here = (g.evidence ?? []).filter((p) => exists(stripLineRef(p)));
			const gone = (g.evidence ?? []).filter((p) => !exists(stripLineRef(p)));
			if (gone.length && here.length) {
				g.evidence = here;
				g.note = [g.note, `evidence is the absence of: ${gone.join(", ")}`]
					.filter(Boolean)
					.join(" | ");
			}
			if (typeof g.expected_benefit !== "string") g.expected_benefit = `not stated by ${a}`;
			if (typeof g.verification_cmd !== "string") g.verification_cmd = "";
			findings.push(g);
		}
	}
	// re-merge: carry verdicts, statuses, downgrades; keep old ids absent from the new partials
	const oldSyn = new Map();
	if (old) {
		const byId = new Map(findings.map((g) => [g.id, g]));
		for (const of of old.findings ?? []) {
			const g = byId.get(of.id);
			if (SYN_RE.test(of.id)) {
				oldSyn.set(of.id, of);
				continue; // re-minted below, verdicts carried
			}
			if (!g) {
				findings.push({ ...of });
				carry.kept_absent++;
				continue;
			}
			if (of.adversarial) {
				g.adversarial = of.adversarial;
				g.adversarial_note = of.adversarial_note;
				carry.adversarial++;
				if (
					(of.adversarial === "DOWNGRADED" || of.adversarial === "REFUTED") &&
					of.priority !== g.priority
				) {
					g.priority = of.priority;
					carry.downgraded++;
				}
			}
			if (of.status === "wontfix") {
				g.status = "wontfix";
				if (of.note) g.note = of.note;
				carry.status++;
			} else if (String(of.status).startsWith("duplicate-of:")) {
				g.status = of.status;
				carry.status++;
			} else if (of.adversarial && of.status && of.status !== g.status) {
				g.status = of.status;
				if (!g.note && of.note) g.note = of.note;
				carry.status++;
			}
		}
	}
	for (const g of findings)
		if (overrides.duplicates?.[g.id]) g.status = `duplicate-of:${overrides.duplicates[g.id]}`;

	// review-pass adjustments
	const reviewed = new Set();
	for (const [label, list] of adjustments)
		for (const adj of list.filter((x) => x.slug === slug)) {
			const ax = axes[adj.axis];
			const was = ax.score;
			ax.score = adj.score;
			delete ax.na_reason;
			ax.evidence = [...new Set([...(ax.evidence ?? []), ...(adj.evidence ?? [])])];
			ax.note = [ax.note, `adjusted by ${label}: ${was}->${adj.score}. ${adj.note}`]
				.filter(Boolean)
				.join(" | ");
			reviewed.add(label);
		}
	for (const [k, ax] of Object.entries(axes)) {
		const add = overrides.axisNotes?.[`${slug}/${k}`];
		if (add && !ax.note.includes(add)) ax.note = `${ax.note} | ${add}`;
	}
	const scores = Object.fromEntries(AXES.map((k) => [k, axes[k].score]));

	// R1: synthetic findings for priority-driving axes with no live P0/P1 finding
	const staticTxt = `components/${slug}/evidence/static.txt`;
	for (const k of ["A1", "A2", "A3", "A4", "A5", "A6", "A8"]) {
		const pri = syntheticPriority(k, scores[k]);
		if (!pri) continue;
		if (
			findings.some(
				(f) =>
					f.axis === k &&
					isLiveFinding(f) &&
					(f.priority === "P0" || f.priority === "P1") &&
					!SYN_RE.test(f.id)
			)
		)
			continue;
		const ax = axes[k];
		let ev = (ax.evidence ?? []).filter((p) => exists(stripLineRef(p)));
		if (!ev.length) ev = [staticTxt];
		const { verification, cmd } = syntheticVerification(k, slug, ax.note ?? "");
		const g = {
			id: `${slug}-${k}-axis`,
			axis: k,
			priority: pri,
			title: `${k} score ${scores[k]}: ${(ax.note ?? "").slice(0, 90)}`,
			detail: ax.note ?? "",
			evidence: ev,
			verification,
			verification_cmd: cmd,
			expected_benefit: `axis ${k} rises to >=2`,
			frameworks: ["svelte", "react", "vue"],
			status: "open",
		};
		const of = oldSyn.get(g.id);
		if (of) {
			if (of.adversarial) {
				g.adversarial = of.adversarial;
				g.adversarial_note = of.adversarial_note;
				if (
					(of.adversarial === "DOWNGRADED" || of.adversarial === "REFUTED") &&
					of.priority !== g.priority
				)
					g.priority = of.priority;
			}
			if (
				of.status === "wontfix" ||
				String(of.status).startsWith("duplicate-of:") ||
				(of.adversarial && of.status)
			)
				g.status = of.status;
			if (of.note) g.note = of.note;
			carry.synthetic_carried++;
		}
		findings.push(g);
		carry.synthetic_minted++;
	}

	const priority = recordPriority(scores, findings);
	const uncertain_flags = [
		...new Set([
			...Object.values(P).flatMap((p) => p?.uncertain_flags ?? []),
			...RP.flatMap((p) => p.uncertain_flags ?? []),
			...extraFlags,
		]),
	];
	const record = {
		slug,
		schema: 1,
		kind,
		category,
		motion_class,
		render,
		sound: !!f1.sound,
		capturable,
		na_reason,
		axes,
		raters,
		findings,
		score_total: scoreTotal(scores),
		priority,
		tool_versions: { capture: capSha, static: "S1" },
		filled_by: filledBy,
		reviewed_by: [
			...new Set([
				...RP.map((p) => p.agent),
				...reviewed,
				...(old?.reviewed_by ?? []).filter((x) => x === "adversarial"),
			]),
		],
		iteration,
		uncertain_flags,
	};
	return { record, missing, carry };
}

export function selfTest() {
	const fail = (m) => {
		console.error(`merge-records self-test FAILED: ${m}`);
		process.exit(1);
	};
	const exists = () => true;
	const ax = (score, note = "n") => ({
		score,
		evidence: ["components/x/evidence/static.txt"],
		note,
	});
	const P = {
		S1: {
			fields: { motion_class: "micro", render: ["dom"] },
			axes: { A1: ax(3), A2: ax(3) },
			findings: [],
		},
		S2: { fields: { capturable: "full" } },
		S3: { axes: { A2: ax(0, "moves under reduce") } },
		S4: { axes: { A3: ax(3) } },
		S5: { axes: { A4: ax(3) } },
		S9: { axes: { A5: ax(3) } },
		S6: { axes: { A8: ax(3) } },
	};
	const item = { slug: "x", group: "fancy", category: "cards" };
	const out = mergeRecord({ item, P, RP: [], old: null, exists });
	if (out.record.axes.A2.score !== 0) fail("A2 is the lower of static and dynamic");
	if (out.record.priority !== "P0") fail("A2 = 0 drives P0");
	const syn = out.record.findings.find((f) => f.id === "x-A2-axis");
	if (!syn || syn.priority !== "P0" || syn.verification !== "capture") fail("R1 synthetic finding");
	if (!syn.verification_cmd.includes("rm-check.mjs --only x"))
		fail("synthetic command is runnable");
	if (
		out.missing.join() !==
		"S1,S2,S3,S4,S5,S6,S9"
			.split(",")
			.filter((a) => !P[a])
			.join()
	)
		fail("missing partials");
	// re-merge keeps the verdict on the synthetic finding
	const again = mergeRecord({
		item,
		P,
		RP: [],
		old: { findings: [{ ...syn, adversarial: "CONFIRMED", adversarial_note: "ok" }] },
		exists,
	});
	if (again.record.findings.find((f) => f.id === "x-A2-axis")?.adversarial !== "CONFIRMED")
		fail("verdict carried");
	// raters
	const rp = [
		{ agent: "R-a", axes: { A6: ax(3), A7: ax(1) } },
		{ agent: "R-b", axes: { A6: ax(2), A7: ax(3) } },
	];
	const a6 = rateAxis(rp, "A6");
	if (a6.axis.score !== 2 || a6.flags.length) fail("A6 median floor");
	const a7 = rateAxis(rp, "A7");
	if (a7.axis.score !== 1 || a7.flags[0] !== "A7-disagreement") fail("A7 disagreement keeps lower");
	if (rateAxis([], "A6").axis.note !== "awaiting rater") fail("awaiting rater");
	if (mergeA2(ax(2), { score: null, na_reason: "static", evidence: [], note: "s" }).score !== 2)
		fail("A2 static only");
	if (syntheticPriority("A5", 1) !== "P1" || syntheticPriority("A7", 0) !== null)
		fail("syntheticPriority");
	if (PRIORITY_RANK.P0 !== 0) fail("rank");
	console.log("merge-records self-test ok");
}

function gitSha(repo) {
	try {
		return execFileSync("git", ["log", "-1", "--format=%h", "--", "scripts/parity"], {
			cwd: repo,
			encoding: "utf8",
		}).trim();
	} catch {
		return "unknown";
	}
}

function main() {
	const { opts, flags } = parseArgs(process.argv.slice(2), ["self-test"]);
	if (flags.has("self-test")) return selfTest();
	const paths = resolvePaths(opts);
	const only = parseList(opts.only);
	const inv = loadInventory(paths.inventory).filter((i) => !only || only.has(i.slug));
	const overrides = opts.overrides ? JSON.parse(fs.readFileSync(opts.overrides, "utf8")) : {};
	const adjustments = (opts.adjustments ? opts.adjustments.split(",") : []).map((f) => [
		basename(f).replace(/\.json$/, ""),
		JSON.parse(fs.readFileSync(f, "utf8")),
	]);
	const exists = (q) =>
		fs.existsSync(join(paths.out, q)) ||
		fs.existsSync(join(paths.repo, q)) ||
		(q.startsWith("/") && fs.existsSync(q));
	const capSha = gitSha(paths.repo);
	const readJson = (f) => (fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, "utf8")) : null);
	const allMissing = {};
	const carryTotal = {};
	let n = 0;
	for (const item of inv) {
		const dir = join(paths.out, "components", item.slug);
		if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
		const P = Object.fromEntries(AGENTS.map((a) => [a, readJson(join(dir, `partial-${a}.json`))]));
		const RP = fs
			.readdirSync(dir)
			.filter((f) => /^partial-R-.*-[AB]\.json$/.test(f))
			.sort((a, b) => a.slice(-6).localeCompare(b.slice(-6)))
			.map((f) => readJson(join(dir, f)));
		const { record, missing, carry } = mergeRecord({
			item,
			P,
			RP,
			old: readJson(join(dir, "record.json")),
			adjustments,
			overrides,
			exists,
			capSha,
			iteration: Number(opts.iteration ?? 1),
			filledBy: opts["filled-by"] ?? "merge-records",
		});
		if (missing.length) allMissing[item.slug] = missing;
		for (const [k, v] of Object.entries(carry)) carryTotal[k] = (carryTotal[k] ?? 0) + v;
		fs.writeFileSync(join(dir, "record.json"), JSON.stringify(record, null, 2) + "\n");
		n++;
	}
	fs.mkdirSync(join(paths.out, "logs"), { recursive: true });
	fs.writeFileSync(
		join(paths.out, "logs", "missing-partials.json"),
		JSON.stringify(allMissing, null, 2)
	);
	console.log("carry", JSON.stringify(carryTotal));
	console.log(
		`merged ${n} records; slugs with missing partials: ${Object.keys(allMissing).length}`
	);
}

if (isMain(process.argv[1], import.meta.url)) main();
