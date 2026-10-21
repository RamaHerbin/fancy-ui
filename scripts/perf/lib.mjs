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
