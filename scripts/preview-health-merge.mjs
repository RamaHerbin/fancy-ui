#!/usr/bin/env node
// Merges the preview-health summaries written by sharded CI runs into one
// test-results/preview-health.json, the shape a single run produces (see
// tests/e2e/preview-health.reporter.ts) plus a `shards` count, and prints the
// same summary grouped by failure class.
//
//   node scripts/preview-health-merge.mjs [--expect N] <dir>   # every preview-health.json under <dir>
//   node scripts/preview-health-merge.mjs --self-test
//
// Exit 1 when a shard is missing (--expect), when a page fails or when a test
// ended without a failure list (a harness error) — the merged report is still
// written in those cases, so the artifact carries what went wrong.
import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const REPORT_PATH = "test-results/preview-health.json";

/** Every preview-health.json below `dir`, shallow or one artifact folder deep. */
export function findSummaries(dir) {
	const found = [];
	const walk = (d, depth) => {
		for (const name of readdirSync(d).sort()) {
			const p = join(d, name);
			if (statSync(p).isDirectory()) {
				if (depth < 3) walk(p, depth + 1);
			} else if (name === "preview-health.json") found.push(p);
		}
	};
	walk(dir, 0);
	return found;
}

/** One summary out of many: counts added up, lists concatenated and sorted. */
export function merge(summaries) {
	const projects = {};
	const counts = {};
	const harness = [];
	const notes = [];
	const failures = [];
	let status = "passed";
	for (const s of summaries) {
		for (const [p, v] of Object.entries(s.projects ?? {})) {
			const t = (projects[p] ??= { pages: 0, healthy: 0, failing: 0, harness: 0 });
			for (const k of Object.keys(t)) t[k] += v[k] ?? 0;
		}
		for (const [cls, n] of Object.entries(s.counts ?? {})) counts[cls] = (counts[cls] ?? 0) + n;
		harness.push(...(s.harness ?? []));
		notes.push(...(s.notes ?? []));
		failures.push(...(s.failures ?? []));
		if (s.status && s.status !== "passed") status = s.status;
	}
	const byProjectSlug = (a, b) =>
		a.project.localeCompare(b.project) || a.slug.localeCompare(b.slug);
	failures.sort(byProjectSlug);
	harness.sort();
	notes.sort();
	const failing = Object.values(projects).reduce((n, p) => n + p.failing + p.harness, 0);
	if (failing > 0 && status === "passed") status = "failed";
	return {
		generatedAt: new Date().toISOString(),
		status,
		shards: summaries.length,
		projects,
		counts,
		harness,
		notes,
		failures,
	};
}

/** The reporter's console summary, from the merged file. */
export function render(summary) {
	const lines = ["", "Preview health", "=============="];
	for (const [p, s] of Object.entries(summary.projects)) {
		lines.push(
			`${p}: ${s.healthy}/${s.pages} healthy, ${s.failing} failing, ${s.harness} harness errors`
		);
	}
	for (const [cls, n] of Object.entries(summary.counts)) {
		if (n === 0) continue;
		lines.push("", `${cls} (${n})`);
		for (const e of summary.failures) {
			for (const f of e.failures) {
				if (f.class !== cls) continue;
				lines.push(
					`  ${e.project} ${e.slug} ${f.stage === null ? "page" : `s${f.stage}`}: ${f.detail}`
				);
			}
		}
	}
	if (summary.notes.length) {
		lines.push("", `Notes, not failures (${summary.notes.length})`);
		for (const line of summary.notes) lines.push(`  ${line}`);
	}
	if (summary.harness.length) {
		lines.push("", `HARNESS (${summary.harness.length})`);
		for (const line of summary.harness) lines.push(`  ${line}`);
	}
	lines.push("", `${summary.shards} shard(s), written to ${REPORT_PATH}`);
	return lines.join("\n");
}

function selfTest() {
	const a = {
		status: "passed",
		projects: { gpu: { pages: 76, healthy: 76, failing: 0, harness: 0 } },
		counts: { RESOLVE: 0, INVISIBLE: 0 },
		harness: [],
		notes: ["gpu sparkles: hero spinner cleared after 9.1 s"],
		failures: [],
	};
	const b = {
		status: "failed",
		projects: {
			gpu: { pages: 76, healthy: 75, failing: 1, harness: 0 },
			"gpu-light-rm": { pages: 152, healthy: 151, failing: 0, harness: 1 },
		},
		counts: { RESOLVE: 0, INVISIBLE: 1 },
		harness: ["gpu-light-rm badge: Test timeout of 180000ms exceeded."],
		notes: [],
		failures: [
			{
				project: "gpu",
				slug: "bg-stars",
				failures: [{ class: "INVISIBLE", stage: 0, detail: "0.1 % ink" }],
			},
		],
	};
	const m = merge([a, b]);
	const assert = (ok, what) => {
		if (!ok) {
			console.error(`self-test failed: ${what}`);
			process.exit(1);
		}
	};
	assert(m.shards === 2, "shard count");
	assert(m.projects.gpu.pages === 152 && m.projects.gpu.healthy === 151, "gpu totals");
	assert(m.projects["gpu-light-rm"].harness === 1, "harness total");
	assert(m.counts.INVISIBLE === 1 && m.counts.RESOLVE === 0, "class counts");
	assert(m.status === "failed", "status follows the failing shard");
	assert(merge([a]).status === "passed", "a green shard stays green");
	const quiet = merge([{ ...b, status: "passed" }]);
	assert(quiet.status === "failed", "a failing page fails even when the shard says passed");
	assert(render(m).includes("INVISIBLE (1)") && render(m).includes("HARNESS (1)"), "render");
	console.log("preview-health-merge self-test passed");
}

function main(argv) {
	if (argv.includes("--self-test")) return selfTest();
	let expect = null;
	const rest = [];
	for (let i = 0; i < argv.length; i++) {
		if (argv[i] === "--expect") expect = Number(argv[++i]);
		else rest.push(argv[i]);
	}
	const dir = rest[0];
	if (!dir) {
		console.error("usage: preview-health-merge.mjs [--expect N] <dir> | --self-test");
		process.exit(2);
	}
	const files = findSummaries(dir);
	const summaries = files.map((f) => JSON.parse(readFileSync(f, "utf8")));
	const merged = merge(summaries);
	mkdirSync(dirname(REPORT_PATH), { recursive: true });
	writeFileSync(REPORT_PATH, `${JSON.stringify(merged, null, "\t")}\n`);
	console.log(files.map((f) => `  ${f}`).join("\n"));
	console.log(render(merged));
	if (expect !== null && files.length !== expect) {
		console.error(`expected ${expect} shard summaries, found ${files.length}`);
		process.exit(1);
	}
	if (merged.status !== "passed") process.exit(1);
}

main(process.argv.slice(2));
