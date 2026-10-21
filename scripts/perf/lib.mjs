// Pure helpers of the performance protocol (scripts/perf/measure.mjs).
// No browser, no network: everything here is unit-tested in lib.test.mjs.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { extname, join } from "node:path";
import { brotliCompressSync, constants, gzipSync } from "node:zlib";

/** Raw, gzip (level 9) and brotli (quality 11) byte counts of a buffer. */
export function compressedSizes(buf) {
	return {
		raw: buf.length,
		gzip: gzipSync(buf, { level: 9 }).length,
		brotli: brotliCompressSync(buf, {
			params: {
				[constants.BROTLI_PARAM_QUALITY]: 11,
				[constants.BROTLI_PARAM_SIZE_HINT]: buf.length,
			},
		}).length,
	};
}

/** "js" | "css" for the assets that count towards page weight, null otherwise. */
export function classifyAsset(name) {
	const ext = extname(name);
	if (ext === ".js" || ext === ".mjs") return "js";
	if (ext === ".css") return "css";
	return null;
}

function walk(dir) {
	const out = [];
	for (const name of readdirSync(dir)) {
		const p = join(dir, name);
		if (statSync(p).isDirectory()) out.push(...walk(p));
		else out.push(p);
	}
	return out;
}

const empty = () => ({ files: 0, raw: 0, gzip: 0, brotli: 0 });

/**
 * Sizes of every JS and CSS file under `dir`, each compressed on its own the
 * way a CDN serves it, summed per kind. Source maps and fonts are ignored.
 */
export function measureAssets(dir) {
	const m = { js: empty(), css: empty(), total: empty() };
	for (const file of walk(dir)) {
		const kind = classifyAsset(file);
		if (!kind) continue;
		const s = compressedSizes(readFileSync(file));
		for (const bucket of [m[kind], m.total]) {
			bucket.files += 1;
			bucket.raw += s.raw;
			bucket.gzip += s.gzip;
			bucket.brotli += s.brotli;
		}
	}
	return m;
}

/** The scratch folder `KEEP_CONSUMER=1` makes scripts/consumers/_lib.sh print. */
export function parseKeptScratch(output) {
	const m = /scratch kept at (\S+)/.exec(output);
	return m ? m[1] : null;
}

export function median(values) {
	if (!values.length) return NaN;
	const s = [...values].sort((a, b) => a - b);
	const mid = s.length >> 1;
	return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/**
 * Two `Performance.getMetrics` samples (CDP, name -> value, durations in
 * seconds) taken `ms` apart, as rates and deltas.
 */
export function deltaMetrics(before, after, ms) {
	const secs = ms / 1000;
	return {
		cpuMsPerSec: ((after.TaskDuration - before.TaskDuration) * 1000) / secs,
		scriptMsPerSec: ((after.ScriptDuration - before.ScriptDuration) * 1000) / secs,
		heapDeltaBytes: after.JSHeapUsedSize - before.JSHeapUsedSize,
		listenersDelta: after.JSEventListeners - before.JSEventListeners,
		nodesDelta: after.Nodes - before.Nodes,
	};
}

export function markdownTable(headers, rows) {
	for (const r of rows) {
		if (r.length !== headers.length) {
			throw new Error(`row has ${r.length} cells, expected ${headers.length}: ${r.join(" | ")}`);
		}
	}
	const cells = [headers, ...rows].map((r) => r.map(String));
	const widths = headers.map((_, i) => Math.max(...cells.map((r) => r[i].length)));
	const line = (r) => `| ${r.map((c, i) => c.padEnd(widths[i])).join(" | ")} |`;
	return [
		line(cells[0]),
		`| ${widths.map((w) => "-".repeat(w)).join(" | ")} |`,
		...cells.slice(1).map(line),
	].join("\n");
}

/** measured * (1 + headroom), rounded up to a multiple of `step`. */
export function proposeBudget(measured, headroom, step) {
	if (measured <= 0) return 0;
	return Math.ceil((measured * (1 + headroom)) / step) * step;
}

export const kb = (bytes) => (bytes / 1024).toFixed(1);

/**
 * Repetitions and lifecycle cycles as stored in the results, so a report
 * rendered on its own never prints the command-line default instead.
 */
export function recordedSettings(effects, lifecycle) {
	const uniq = (values) => [...new Set(values.filter((v) => v !== undefined))].join(", ") || "n/a";
	return {
		reps: uniq(effects.flatMap((g) => g.rows.map((r) => r.reps))),
		cycles: uniq(lifecycle.flatMap((g) => g.rows.map((r) => r.cycles))),
	};
}

/** A consumer whose smoke failed has no trustworthy size: refuse to report one. */
export function assertSmokePassed(name, result) {
	if (result.status !== 0) {
		throw new Error(`${name}: consumer smoke exited with ${result.status}, no size is reported`);
	}
}

/** A section counts as measured on a quiet machine below this 1-minute load per core. */
export const QUIET_LOAD_PER_CORE = 0.5;

/** "quiet", "loaded", or "unrecorded" when the load or the core count was not stored. */
export function loadVerdict(load1, cores) {
	if (!Number.isFinite(load1) || !Number.isFinite(cores)) return "unrecorded";
	return load1 < cores * QUIET_LOAD_PER_CORE ? "quiet" : "loaded";
}

/**
 * Attach a run record (measured commit, tool commit, load, machine) to a stored
 * section: the object itself, or each group of a list. A record already there
 * is kept, so a backfill never rewrites what was measured.
 */
export function stampRun(data, run) {
	if (Array.isArray(data)) {
		for (const g of data) g.run ??= run;
	} else {
		data.run ??= run;
	}
	return data;
}

/**
 * One row per stored section (per group for the lists): library commit that was
 * measured, tool commit that measured it, load average at the end and whether
 * that counts as a quiet machine.
 */
export function runRows({ sizes, imports, effects, lifecycle }) {
	const rows = [];
	const row = (label, g) => {
		const load = g?.run?.loadAvgAtEnd ?? g?.loadAvgAtEnd;
		rows.push([
			label,
			g?.run?.measuredCommit ?? "unrecorded",
			g?.run?.toolCommit
				? `${g.run.toolCommit}${g.run.backfilled ? " (backfilled)" : ""}`
				: "unrecorded",
			load ? load.map((n) => n.toFixed(1)).join(" / ") : "unrecorded",
			loadVerdict(load?.[0], g?.run?.cores),
		]);
	};
	if (sizes) row("sizes", sizes);
	for (const g of imports ?? []) row(`imports (${g.consumer ?? g.pkg})`, g);
	for (const g of effects ?? []) row(`effects (${g.framework})`, g);
	for (const g of lifecycle ?? []) row(`lifecycle (${g.framework})`, g);
	return rows;
}
