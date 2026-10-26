/**
 * Shared helpers for the design & motion audit instruments in scripts/audit/.
 *
 * Everything here is either pure (argument parsing, pixel maths, rubric
 * scoring, record validation) or a thin path helper. Nothing opens a browser,
 * so `node --test scripts/audit/audit.test.mjs` runs without a dev server.
 *
 * What this does NOT do: it never decides whether a score is "good enough" to
 * merge. The rubric turns evidence into a 0-3 score per axis; what to fix first
 * is a separate decision (see README.md).
 */

import { existsSync, readFileSync } from "node:fs";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/** Repository root, resolved from this file (scripts/audit/lib.mjs -> ../..). */
export const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export const FRAMEWORKS = ["svelte", "react", "vue"];
export const THEMES = ["light", "dark"];
export const AXES = ["A1", "A2", "A3", "A4", "A5", "A6", "A7", "A8"];
export const DEFAULT_BASES = {
	svelte: "http://localhost:5291",
	react: "http://localhost:5292",
	vue: "http://localhost:5293",
};

// --- arguments ---------------------------------------------------------------

/**
 * Minimal `--name value` / `--flag` parser.
 *
 * @param {string[]} argv arguments after the script name
 * @param {string[]} [flags] option names that take no value
 * @returns {{ opts: Record<string, string>, flags: Set<string>, rest: string[] }}
 */
export function parseArgs(argv, flags = []) {
	const opts = {};
	const seen = new Set();
	const rest = [];
	for (let i = 0; i < argv.length; i++) {
		const a = argv[i];
		if (!a.startsWith("--")) {
			rest.push(a);
			continue;
		}
		const name = a.slice(2);
		if (flags.includes(name)) seen.add(name);
		else opts[name] = argv[++i];
	}
	return { opts, flags: seen, rest };
}

/** `--only a,b` -> Set, or null when absent. */
export function parseList(value) {
	if (value === undefined || value === null || value === "") return null;
	return new Set(
		String(value)
			.split(",")
			.map((s) => s.trim())
			.filter(Boolean)
	);
}

/**
 * Resolve the paths every instrument shares. `--repo` defaults to the checkout
 * the script lives in; `--out` (where evidence and logs are written) defaults to
 * `<repo>/.audit-out/audit`, a folder git never tracks (`.gitignore` lists `.audit-out/`).
 *
 * @param {Record<string, string>} opts
 */
export function resolvePaths(opts) {
	const repo = resolve(opts.repo ?? REPO_ROOT);
	const out = opts.out ? resolve(repo, opts.out) : join(repo, ".audit-out", "audit");
	return {
		repo,
		out,
		src: join(repo, "src", "lib", "fancy-ui"),
		inventory: resolve(repo, opts.inventory ?? join(out, "inventory.json")),
		parity: resolve(repo, opts.parity ?? join(repo, ".parity")),
		parityRm: resolve(repo, opts["parity-rm"] ?? join(repo, ".parity-rm")),
		bases: {
			svelte: opts["base-svelte"] ?? DEFAULT_BASES.svelte,
			react: opts["base-react"] ?? DEFAULT_BASES.react,
			vue: opts["base-vue"] ?? DEFAULT_BASES.vue,
		},
	};
}

/** Stage URL of one slug in one framework's parity app. */
export function stageUrl(bases, fw, slug, theme = "dark") {
	if (fw === "svelte") return `${bases.svelte}/_parity/${slug}?theme=${theme}`;
	return `${bases[fw]}/?slug=${slug}&theme=${theme}`;
}

/** The inventory items (slug/name/category/group/credits/...), sorted by slug. */
export function loadInventory(path) {
	if (!existsSync(path)) {
		throw new Error(
			`inventory not found at ${path}; run: node scripts/audit/inventory.mjs [--out <dir>]`
		);
	}
	const inv = JSON.parse(readFileSync(path, "utf8"));
	const items = inv.items ?? inv;
	return [...items].sort((a, b) => (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0));
}

export function absFrom(base, p) {
	return isAbsolute(p) ? p : resolve(base, p);
}

/** True when `argvPath` (process.argv[1]) is the module at `metaUrl`. */
export function isMain(argvPath, metaUrl) {
	return !!argvPath && resolve(argvPath) === fileURLToPath(metaUrl);
}

// --- pixel maths -------------------------------------------------------------
// These two functions are injected into a blank Chromium page as source text
// (`fn.toString()`), so they must stay self-contained: no imports, no closure
// over module state.

/**
 * Share of pixels whose largest channel delta exceeds `threshold`. A pixel that
 * exists in only one image counts as changed. `A`/`B` are ImageData-like
 * `{ data, width, height }`.
 */
export function compareImageData(A, B, threshold, channels) {
	const nc = channels || 4;
	const w = Math.max(A.width, B.width);
	const h = Math.max(A.height, B.height);
	if (!w || !h) return 0;
	let cnt = 0;
	for (let y = 0; y < h; y++) {
		for (let x = 0; x < w; x++) {
			if (x >= A.width || y >= A.height || x >= B.width || y >= B.height) {
				cnt++;
				continue;
			}
			const i = (y * A.width + x) * 4;
			const j = (y * B.width + x) * 4;
			let m = 0;
			for (let c = 0; c < nc; c++) {
				const d = Math.abs(A.data[i + c] - B.data[j + c]);
				if (d > m) m = d;
			}
			if (m > threshold) cnt++;
		}
	}
	return cnt / (w * h);
}

/**
 * Changed-pixel share per tile of a `cols` x `rows` grid laid over the overlap of
 * the two images. A small loop (three dots, a thin streak) moves a handful of
 * pixels: over the whole stage that is a ratio far below any sane gate, inside the
 * tile that holds it the ratio is large. `max` is the number the ambient check
 * reads.
 */
export function regionRatios(A, B, threshold, cols, rows) {
	const gc = cols || 16;
	const gr = rows || 10;
	const w = Math.min(A.width, B.width);
	const h = Math.min(A.height, B.height);
	const tiles = new Array(gc * gr).fill(0);
	const area = new Array(gc * gr).fill(0);
	let changed = 0;
	for (let y = 0; y < h; y++) {
		const ty = Math.min(gr - 1, Math.floor((y * gr) / h));
		for (let x = 0; x < w; x++) {
			const t = ty * gc + Math.min(gc - 1, Math.floor((x * gc) / w));
			area[t]++;
			const i = (y * A.width + x) * 4;
			const j = (y * B.width + x) * 4;
			let m = 0;
			for (let c = 0; c < 4; c++) {
				const d = Math.abs(A.data[i + c] - B.data[j + c]);
				if (d > m) m = d;
			}
			if (m > threshold) {
				tiles[t]++;
				changed++;
			}
		}
	}
	const ratios = tiles.map((n, k) => (area[k] ? n / area[k] : 0));
	return { ratios, max: ratios.length ? Math.max(...ratios) : 0, changed, pixels: w * h };
}

/**
 * Source of a script that, once evaluated in a blank page, defines
 * `window.__px = { decode, pix, ratio, regions }` on top of the two functions
 * above. `decode` takes base64 PNG data.
 */
export function pixelToolkitSource() {
	return `
window.__cmp = ${compareImageData.toString()};
window.__regions = ${regionRatios.toString()};
window.__px = {
	async decode(d) {
		const img = new Image();
		img.src = "data:image/png;base64," + d;
		await img.decode();
		return img;
	},
	async pix(d) {
		const img = await window.__px.decode(d);
		const c = document.createElement("canvas");
		c.width = img.naturalWidth;
		c.height = img.naturalHeight;
		const x = c.getContext("2d", { willReadFrequently: true });
		x.drawImage(img, 0, 0);
		return x.getImageData(0, 0, c.width, c.height);
	},
	async ratio(a, b, threshold, channels) {
		if (!a || !b) return null;
		return window.__cmp(await window.__px.pix(a), await window.__px.pix(b), threshold, channels);
	},
	async regions(a, b, threshold, cols, rows) {
		if (!a || !b) return null;
		return window.__regions(await window.__px.pix(a), await window.__px.pix(b), threshold, cols, rows);
	},
};`;
}

/** Install the pixel toolkit in a page (any blank page works). */
export async function installPixelToolkit(page) {
	await page.setContent("<!doctype html><canvas></canvas>");
	await page.addScriptTag({ content: pixelToolkitSource() });
}

// --- rubric ------------------------------------------------------------------

/** Pixel threshold shared with scripts/parity/diff.mjs. */
export const PIXEL_THRESHOLD = 24;
/** Whole-image ratio under which two frames count as identical. */
export const STILL_RATIO = 0.004;
/** End-state ratio under which reduced motion counts as reaching the same end. */
export const END_RATIO = 0.01;
/** Per-tile ratio over which a tile counts as having changed (ambient check). */
export const REGION_RATIO_MIN = 0.01;

/**
 * Axis-derived priority (rubric): a 0 on A2/A3/A8 is P0; a score <= 1 on A1/A4/A5
 * or a 0 on A6 is P1; everything else is P2; `none` only when there are no
 * findings and every applicable axis scores >= 2. A7 never drives priority.
 *
 * @param {Record<string, number|null>} scores axis -> score (null = not applicable)
 * @param {number} findingCount
 */
export function axisPriority(scores, findingCount = 0) {
	const s = (k) => scores[k] ?? null;
	if (["A2", "A3", "A8"].some((k) => s(k) === 0)) return "P0";
	if (["A1", "A4", "A5"].some((k) => s(k) !== null && s(k) <= 1) || s("A6") === 0) return "P1";
	const sc = Object.values(scores).filter((x) => x !== null && x !== undefined);
	return !findingCount && sc.every((x) => x >= 2) ? "none" : "P2";
}

/** Axes whose score sets the axis-derived priority, with the priority each sets. */
export function priorityDrivers(scores) {
	const out = [];
	for (const k of ["A2", "A3", "A8"]) if (scores[k] === 0) out.push({ axis: k, priority: "P0" });
	for (const k of ["A1", "A4", "A5"])
		if (scores[k] !== null && scores[k] !== undefined && scores[k] <= 1)
			out.push({ axis: k, priority: "P1" });
	if (scores.A6 === 0) out.push({ axis: "A6", priority: "P1" });
	return out;
}

export const PRIORITY_RANK = { P0: 0, P1: 1, P2: 2, P3: 3 };

/** A finding that still counts: not wontfix, not a duplicate. */
export function isLiveFinding(f) {
	return f.status !== "wontfix" && !String(f.status).startsWith("duplicate-of:");
}

/**
 * Record priority = the more severe of the axis-derived priority and the highest
 * priority among live P0/P1 findings (rubric amendment R2).
 */
export function recordPriority(scores, findings = []) {
	let p = axisPriority(scores, findings.length);
	for (const f of findings) {
		if (
			isLiveFinding(f) &&
			(f.priority === "P0" || f.priority === "P1") &&
			PRIORITY_RANK[f.priority] < (PRIORITY_RANK[p] ?? 9)
		)
			p = f.priority;
	}
	return p;
}

/** Record score: mean of the applicable axes x 8, two decimals (0-24). */
export function scoreTotal(scores) {
	const sc = Object.values(scores).filter((x) => x !== null && x !== undefined);
	return sc.length ? Math.round((sc.reduce((s, x) => s + x, 0) / sc.length) * 8 * 100) / 100 : 0;
}

/** A1 score from the count of uncommented off-token literals (3 = 0, 2 = 1-2, 1 = 3-5, 0 = 6+). */
export function scoreA1(offTokenCount) {
	return offTokenCount === 0 ? 3 : offTokenCount <= 2 ? 2 : offTokenCount <= 5 ? 1 : 0;
}

/**
 * Dynamic reduced-motion A2 score for one framework x theme capture set.
 * `still` = frames under `reduce` do not move; `endOk` = the reduce end state
 * matches the settled no-preference state (null = not comparable).
 *
 * @param {{ motion_ratio: number, hover_still_ratio?: number|null, end_check?: string, end_ratio?: number|null }[]} entries
 */
export function scoreRmDynamic(entries) {
	if (!entries.length) return null;
	const still = (e) =>
		e.motion_ratio < STILL_RATIO &&
		(e.hover_still_ratio == null || e.hover_still_ratio < STILL_RATIO);
	const endOk = (e) =>
		e.end_check !== "compared" || e.end_ratio == null ? null : e.end_ratio < END_RATIO;
	if (entries.some((e) => !still(e))) return 0;
	if (entries.some((e) => endOk(e) === false)) return 1;
	return entries.some((e) => endOk(e) === true) ? 3 : null;
}

/**
 * Ambient invariant: a loop must visibly differ from its first frame in at least
 * two later frames. `maxRegionRatios` holds, per later frame, the largest tile
 * ratio (see `regionRatios`); `null` entries (missing frames) are ignored.
 */
export function ambientVerdict(maxRegionRatios, min = REGION_RATIO_MIN) {
	const differing = maxRegionRatios.filter((r) => r !== null && r !== undefined && r > min).length;
	return { differing, pass: differing >= 2 };
}

// --- record validation -------------------------------------------------------

export const NA_REASONS = ["static", "no-gpu-headless", "scroll-driven", "hdr-only", "audio-only"];
const AXIS_NA = [...NA_REASONS, "not-applicable"];
const RECORD_KEYS = [
	"slug",
	"schema",
	"kind",
	"category",
	"motion_class",
	"render",
	"sound",
	"capturable",
	"na_reason",
	"axes",
	"raters",
	"findings",
	"score_total",
	"priority",
	"tool_versions",
	"filled_by",
	"reviewed_by",
	"iteration",
	"uncertain_flags",
];
const FINDING_KEYS = [
	"id",
	"axis",
	"priority",
	"title",
	"detail",
	"evidence",
	"verification",
	"verification_cmd",
	"expected_benefit",
	"frameworks",
	"status",
	"adversarial",
	"adversarial_note",
	"note",
];

/**
 * Hand-rolled mirror of `schema/record.schema.json` (no validator dependency),
 * plus the cross-field rules the schema cannot express. Returns error strings;
 * an empty list means valid.
 *
 * @param {any} r a parsed record.json
 * @param {{ exists?: (path: string) => boolean }} [ctx] evidence-path resolver
 */
export function validateRecord(r, ctx = {}) {
	const errs = [];
	const e = (m) => errs.push(m);
	if (!r || typeof r !== "object") return ["record is not an object"];
	for (const k of Object.keys(r)) if (!RECORD_KEYS.includes(k)) e(`unknown key ${k}`);
	for (const k of RECORD_KEYS) if (!(k in r)) e(`missing key ${k}`);
	if (typeof r.slug !== "string" || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(r.slug)) e("bad slug");
	if (r.schema !== 1) e("schema must be 1");
	if (!["core", "fancy"].includes(r.kind)) e("bad kind");
	if (
		!["static", "enter", "micro", "ambient", "pointer", "scroll", "mixed"].includes(r.motion_class)
	)
		e("bad motion_class");
	if (!Array.isArray(r.render) || !r.render.length) e("render must be a non-empty array");
	else
		for (const x of r.render)
			if (!["dom", "svg", "canvas2d", "webgl", "webgpu", "audio"].includes(x)) e(`bad render ${x}`);
	if (typeof r.sound !== "boolean") e("sound must be boolean");
	if (!["full", "rest-only", "pointer-pass", "state-pass", "none"].includes(r.capturable))
		e("bad capturable");
	if (r.na_reason !== null && !NA_REASONS.includes(r.na_reason)) e("bad na_reason");
	if (r.axes && typeof r.axes === "object") {
		for (const k of Object.keys(r.axes)) if (!AXES.includes(k)) e(`unknown axis ${k}`);
		for (const k of AXES) {
			const a = r.axes[k];
			if (!a) {
				e(`missing axis ${k}`);
				continue;
			}
			if (a.score !== null && !(Number.isInteger(a.score) && a.score >= 0 && a.score <= 3))
				e(`${k}: score must be null or an integer 0-3`);
			if (!Array.isArray(a.evidence)) e(`${k}: evidence must be an array`);
			if (typeof a.note !== "string") e(`${k}: note must be a string`);
			if (a.na_reason !== undefined && !AXIS_NA.includes(a.na_reason)) e(`${k}: bad na_reason`);
			if (
				a.score === null &&
				!a.na_reason &&
				!(["A6", "A7"].includes(k) && a.note === "awaiting rater")
			)
				e(`${k}: null score without na_reason`);
		}
	}
	if (!Array.isArray(r.findings)) e("findings must be an array");
	else
		for (const f of r.findings) {
			const w = `finding ${f?.id}`;
			for (const k of Object.keys(f)) if (!FINDING_KEYS.includes(k)) e(`${w}: unknown key ${k}`);
			for (const k of [
				"id",
				"axis",
				"priority",
				"title",
				"evidence",
				"verification",
				"verification_cmd",
				"frameworks",
				"status",
				"expected_benefit",
			])
				if (!(k in f)) e(`${w}: missing ${k}`);
			if (!/^[a-z0-9-]+-([0-9]{2}|A[1-8]-axis)$/.test(String(f.id))) e(`${w}: bad id`);
			if (!AXES.includes(f.axis)) e(`${w}: bad axis`);
			if (!["P0", "P1", "P2", "P3"].includes(f.priority)) e(`${w}: bad priority`);
			if (typeof f.title !== "string" || f.title.length < 8) e(`${w}: title too short`);
			if (!Array.isArray(f.evidence) || !f.evidence.length) e(`${w}: evidence must be non-empty`);
			if (!["capture", "grep", "perf", "axe", "unit-test", "manual"].includes(f.verification))
				e(`${w}: bad verification`);
			if (!/^(open|uncertain|wontfix|duplicate-of:[a-z0-9-]+)$/.test(String(f.status)))
				e(`${w}: bad status`);
			if (f.status === "uncertain" && !String(f.note ?? "").trim())
				e(`${w}: uncertain without note`);
			if (["P0", "P1"].includes(f.priority) && isLiveFinding(f)) {
				if (f.verification === "manual") e(`${w}: ${f.priority} verification is manual`);
				if (!String(f.verification_cmd ?? "").trim())
					e(`${w}: ${f.priority} empty verification_cmd`);
				if (ctx.exists && !(f.evidence ?? []).some((p) => ctx.exists(stripLineRef(p))))
					e(`${w}: no existing evidence path`);
			}
		}
	if (typeof r.score_total !== "number" || r.score_total < 0 || r.score_total > 24)
		e("score_total must be 0-24");
	if (!["P0", "P1", "P2", "none"].includes(r.priority)) e("bad priority");
	if (r.axes && Array.isArray(r.findings)) {
		const scores = Object.fromEntries(AXES.map((k) => [k, r.axes[k]?.score ?? null]));
		const want = recordPriority(scores, r.findings);
		if (want !== r.priority) e(`priority ${r.priority} != recomputed ${want}`);
	}
	return errs;
}

/** Strip a trailing `:12`, `#L12` or `:L12-30` line reference from an evidence path. */
export function stripLineRef(p) {
	return String(p).replace(/[:#]L?\d+(-L?\d+)?$/, "");
}
