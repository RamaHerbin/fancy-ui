#!/usr/bin/env node
/**
 * Motion token gate.
 *
 * `src/lib/fancy-ui/_internals/motion/tokens.ts` is the one place the motion
 * vocabulary (durations, curves, stagger steps) is written as values. Components
 * cannot read it from CSS, so each one retypes the same number as the fallback of
 * a `var(--ft-*, <fallback>)` or as a bare literal. Nothing used to check that the
 * copy matches the source. This script does, in three rules over the Svelte,
 * React and Vue component sources:
 *
 *   1. HARD FAILURE: a `var(--ft-duration-X, ...)`, `var(--ft-ease-X, ...)` or
 *      `var(--ft-stagger-X, ...)` whose fallback differs from the token X in
 *      tokens.ts (`150ms` and `0.15s` are the same value; a curve is compared
 *      number by number). The same failure applies when the token NAME is not
 *      declared in tokens.ts (a misspelling such as `--ft-duration-fsat`); only
 *      these three prefixes are checked, other `--ft-*` vars are out of scope.
 *   2. RATCHET: bare literals that equal a token value (`150ms`, a token curve
 *      written out) and off-token literals with no `off-token:` comment on the same
 *      or the previous line are counted per tree and compared with
 *      `scripts/motion-tokens-pins.json`. The gate fails only when a count rises.
 *      A count that fell passes and says so; `--update-pins` writes the new numbers.
 *   3. IGNORE LIST: `scripts/motion-tokens-ignore.json` lists path prefixes that are
 *      not visual motion (the sound family's audio envelope milliseconds).
 *
 * What counts as a literal: every `cubic-bezier()`, and a duration written in a
 * `transition` / `animation` declaration (including a multi-line value), in a
 * Tailwind `duration-` / `delay-` class, or in a style string on such a line.
 * Anything inside `var(...)` is skipped (rule 1 owns var fallbacks), as are
 * durations of an `infinite` animation (an ambient loop is not a transition) and
 * values of 1 ms or less (reduced-motion overrides).
 *
 * Scope: `src/lib/fancy-ui/**\/*.svelte`, `react/src/components/**\/*.{css,tsx}`,
 * `vue/src/components/**\/*.vue`; tests, stories and declaration files are skipped.
 *
 * Usage:
 *   node scripts/check-motion-tokens.mjs [--self-test] [--update-pins] [--list]
 *
 *   --self-test     run the built-in cases and exit
 *   --update-pins   rewrite the pins file from the measured counts (never while a
 *                   hard failure stands)
 *   --list          print the per-file counts of every tree and exit 0
 *
 * What this does NOT catch: a JS option such as `duration: 300` (a number, not a
 * CSS literal), a transition written across several template-literal lines in JS,
 * a literal built by arithmetic (`calc(var(--i) * 40ms)` counts the `40ms`), and
 * whether a token is the right choice for the interaction. It proves the copies
 * agree with the source and that the number of unexplained literals never grows.
 */

import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const TOKENS_PATH = join(repoRoot, "src", "lib", "fancy-ui", "_internals", "motion", "tokens.ts");
const PINS_PATH = join(dirname(fileURLToPath(import.meta.url)), "motion-tokens-pins.json");
const IGNORE_PATH = join(dirname(fileURLToPath(import.meta.url)), "motion-tokens-ignore.json");

/** Trees checked: root folder and the extensions read inside it. */
export const TREES = {
	svelte: { root: "src/lib/fancy-ui", exts: [".svelte"] },
	react: { root: "react/src/components", exts: [".css", ".tsx"] },
	vue: { root: "vue/src/components", exts: [".vue"] },
};
const SKIP_FILE = /\.(test|spec|stories)\.|\.test\.svelte$|\.d\.ts$/;
const SKIP_DIR = new Set(["node_modules", "dist", ".svelte-kit"]);

// --- tokens ------------------------------------------------------------------

/** Normalise "0.16, 1, .3, 1" to "0.16,1,0.3,1". */
export function normCurve(s) {
	return s
		.split(",")
		.map((x) => String(parseFloat(x.trim())))
		.join(",");
}

/** A CSS time ("150ms", ".15s", "0.15s") in milliseconds, or null. */
export function toMs(s) {
	const m = /^\s*(\d*\.?\d+)(ms|s)\s*$/.exec(s);
	return m ? Math.round(parseFloat(m[1]) * (m[2] === "s" ? 1000 : 1) * 1000) / 1000 : null;
}

/**
 * Read DURATIONS, EASINGS, STAGGERS and STAGGER_CAPS out of tokens.ts.
 *
 * @param {string} src
 */
export function parseTokens(src) {
	const block = (name) => {
		const m = new RegExp(`export const ${name}\\s*=\\s*\\{([\\s\\S]*?)\\}\\s*as const`).exec(src);
		return m ? m[1] : "";
	};
	const nums = (name) =>
		Object.fromEntries(
			[...block(name).matchAll(/(\w+)\s*:\s*(\d+(?:\.\d+)?)/g)].map((m) => [m[1], Number(m[2])])
		);
	const durations = nums("DURATIONS");
	const staggers = nums("STAGGERS");
	const caps = nums("STAGGER_CAPS");
	const easings = Object.fromEntries(
		[...block("EASINGS").matchAll(/(\w+)\s*:\s*"cubic-bezier\(([^)]*)\)"/g)].map((m) => [
			m[1],
			normCurve(m[2]),
		])
	);
	return {
		durations,
		staggers,
		caps,
		easings,
		msSet: new Set([
			...Object.values(durations),
			...Object.values(staggers),
			...Object.values(caps),
		]),
		curveSet: new Set(Object.values(easings)),
	};
}

// --- text scanning -------------------------------------------------------------

/** Blank block comments, HTML comments and `//` line comments, keeping line numbers. */
export function stripComments(text) {
	const blank = (m) => m.replace(/[^\n]/g, " ");
	return text
		.replace(/\/\*[\s\S]*?\*\//g, blank)
		.replace(/<!--[\s\S]*?-->/g, blank)
		.split("\n")
		.map((l) => l.replace(/(^|[\s;{}(,])\/\/(?!\/).*$/, "$1"))
		.join("\n");
}

/** Index just past the `)` closing the `(` at `open`, or -1. */
function closeParen(s, open) {
	let d = 0;
	for (let i = open; i < s.length; i++) {
		if (s[i] === "(") d++;
		else if (s[i] === ")" && --d === 0) return i + 1;
	}
	return -1;
}

/** `var(...)` expressions are blanked (same length) so literal scans skip their fallbacks. */
export function stripVars(s) {
	let out = s;
	for (;;) {
		const i = out.search(/var\(/);
		if (i === -1) return out;
		const end = closeParen(out, i + 3);
		const stop = end === -1 ? out.length : end;
		out = out.slice(0, i) + " ".repeat(stop - i) + out.slice(stop);
	}
}

/**
 * Every `var(--ft-<family>-<name>, <fallback>)` in `s` whose family is a token
 * family, including ones nested inside another var's fallback.
 */
export function tokenVars(s) {
	const found = [];
	for (const m of s.matchAll(/var\(\s*--ft-(duration|ease|stagger)-([a-zA-Z0-9]+)\s*,/g)) {
		const open = m.index + 3;
		const end = closeParen(s, open);
		if (end === -1) continue;
		const inner = s.slice(open + 1, end - 1);
		const comma = inner.indexOf(",");
		found.push({
			family: m[1],
			name: m[2],
			fallback: inner.slice(comma + 1).trim(),
			index: m.index,
		});
	}
	return found;
}

/**
 * Compare one fallback with its token. Returns null when it agrees (or when there
 * is nothing to compare: a non-literal fallback). A token name that tokens.ts does
 * not declare is reported as `unknown`.
 *
 * @returns {null | { expected: string, got: string, unknown?: boolean }}
 */
export function fallbackMismatch(v, tokens) {
	const fb = v.fallback;
	const table =
		v.family === "ease"
			? tokens.easings
			: v.family === "duration"
				? tokens.durations
				: tokens.staggers;
	if (table[v.name] === undefined)
		return {
			expected: "a token declared in tokens.ts",
			got: `unknown name (fallback ${fb})`,
			unknown: true,
		};
	if (/^var\(/.test(fb)) return null;
	if (v.family === "ease") {
		const want = tokens.easings[v.name];
		const m = /^cubic-bezier\(([^)]*)\)$/.exec(fb);
		return m && normCurve(m[1]) === want ? null : { expected: want, got: fb };
	}
	const want = table[v.name];
	return toMs(fb) === want ? null : { expected: `${want}ms`, got: fb };
}

const DECL = /(transition|animation)[\w-]*\s*[:=]/;
const TW_TIME = /(?<![\w-])(?:[a-z0-9-]+:)*(?:duration|delay)-(\[)?(\d*\.?\d+)(ms|s)?\]?/g;
const TIME = /(?<![\w.-])(\d*\.?\d+)(ms|s)\b/g;

/**
 * Scan one file's text.
 *
 * @param {string} text
 * @param {ReturnType<typeof parseTokens>} tokens
 * @returns {{ mismatches: { line: number, name: string, expected: string, got: string }[],
 *             bare: { line: number, kind: string, raw: string }[],
 *             off: { line: number, kind: string, raw: string }[] }}
 */
export function scanText(text, tokens) {
	const original = text.split("\n");
	const clean = stripComments(text);
	const lines = clean.split("\n");
	const mismatches = [];
	const bare = [];
	const off = [];
	// rule 1 runs on the whole text: a var() may span lines
	const lineStarts = [0];
	for (const l of lines) lineStarts.push(lineStarts.at(-1) + l.length + 1);
	const lineOf = (pos) => {
		let lo = 0;
		let hi = lines.length - 1;
		while (lo < hi) {
			const mid = (lo + hi + 1) >> 1;
			if (lineStarts[mid] <= pos) lo = mid;
			else hi = mid - 1;
		}
		return lo + 1;
	};
	for (const v of tokenVars(clean)) {
		const mm = fallbackMismatch(v, tokens);
		if (mm) mismatches.push({ line: lineOf(v.index), name: `--ft-${v.family}-${v.name}`, ...mm });
	}
	const excused = (i) =>
		/off-token:/.test(original[i] ?? "") || /off-token:/.test(original[i - 1] ?? "");
	let open = false; // inside a multi-line transition / animation value
	for (let i = 0; i < lines.length; i++) {
		const line = stripVars(lines[i]);
		const starts = DECL.test(line);
		const inDecl = starts || open;
		if (starts)
			open =
				!/[;}]\s*$/.test(line.slice(line.search(DECL))) && !/;/.test(line.slice(line.search(DECL)));
		else if (open && /[;}]/.test(line)) open = false;
		const note = (kind, raw, onToken) => {
			if (onToken) bare.push({ line: i + 1, kind, raw });
			else if (!excused(i)) off.push({ line: i + 1, kind, raw });
		};
		for (const m of line.matchAll(/cubic-bezier\(([^)]*)\)/g))
			note("curve", m[0].replace(/\s+/g, ""), tokens.curveSet.has(normCurve(m[1])));
		const ambient = /\binfinite\b/.test(line);
		const times = [];
		if (inDecl && !ambient) for (const m of line.matchAll(TIME)) times.push([m[0], toMs(m[0])]);
		for (const m of line.matchAll(TW_TIME)) {
			const n = parseFloat(m[2]);
			times.push([m[0], m[3] === "s" ? n * 1000 : n]);
		}
		for (const [raw, ms] of times) {
			if (ms === null || ms <= 1) continue;
			note("duration", raw, tokens.msSet.has(ms));
		}
	}
	return { mismatches, bare, off };
}

// --- tree walk -----------------------------------------------------------------

function walk(dir, exts, out = []) {
	if (!existsSync(dir)) return out;
	for (const e of readdirSync(dir, { withFileTypes: true }).sort((a, b) =>
		a.name < b.name ? -1 : 1
	)) {
		const p = join(dir, e.name);
		if (e.isDirectory()) {
			if (!SKIP_DIR.has(e.name)) walk(p, exts, out);
		} else if (exts.some((x) => e.name.endsWith(x)) && !SKIP_FILE.test(e.name)) out.push(p);
	}
	return out;
}

/** True when `rel` (repo-relative, forward slashes) starts with an ignored prefix. */
export function isIgnored(rel, ignore) {
	return ignore.some((x) => rel.startsWith(x.path));
}

/** Per-tree totals and per-file detail. */
export function measure(root, tokens, ignore) {
	const trees = {};
	const mismatches = [];
	for (const [name, { root: dir, exts }] of Object.entries(TREES)) {
		const t = { bare: 0, offToken: 0, files: {} };
		for (const abs of walk(join(root, dir), exts)) {
			const rel = relative(root, abs).split("\\").join("/");
			if (isIgnored(rel, ignore)) continue;
			const r = scanText(readFileSync(abs, "utf8"), tokens);
			for (const m of r.mismatches) mismatches.push({ file: rel, tree: name, ...m });
			if (r.bare.length || r.off.length)
				t.files[rel] = { bare: r.bare.length, offToken: r.off.length };
			t.bare += r.bare.length;
			t.offToken += r.off.length;
		}
		trees[name] = t;
	}
	return { trees, mismatches };
}

/**
 * Compare measured totals with the pins. A count above its pin is a failure; a
 * count below is a pass that says the pin can be lowered.
 *
 * @returns {{ failures: string[], lowered: string[] }}
 */
export function comparePins(trees, pins) {
	const failures = [];
	const lowered = [];
	for (const [name, t] of Object.entries(trees)) {
		for (const key of ["bare", "offToken"]) {
			const pin = pins?.[name]?.[key];
			if (pin === undefined) {
				failures.push(`${name}.${key}: no pin (run with --update-pins)`);
				continue;
			}
			if (t[key] > pin) {
				const worst = Object.entries(t.files)
					.filter(([, c]) => c[key] > 0)
					.sort((a, b) => b[1][key] - a[1][key])
					.slice(0, 3)
					.map(([f, c]) => `${f} (${c[key]})`)
					.join(", ");
				failures.push(`${name}.${key}: ${t[key]} > pinned ${pin}. Largest: ${worst}`);
			} else if (t[key] < pin) lowered.push(`${name}.${key}: ${t[key]} < pinned ${pin}`);
		}
	}
	return { failures, lowered };
}

// --- self test -----------------------------------------------------------------

const FIXTURE_TOKENS = `export const DURATIONS = { micro: 80, fast: 150, base: 300, exit: 200, entrance: 600 } as const;
export const EASINGS = {
	out: "cubic-bezier(0.16, 1, 0.3, 1)",
	inout: "cubic-bezier(0.4, 0, 0.2, 1)",
} as const;
export const STAGGERS = { char: 15, item: 50 } as const;
export const STAGGER_CAPS = { text: 200, item: 600 } as const;`;

export function selfTest() {
	const fail = (m) => {
		console.error(`check-motion-tokens self-test FAILED: ${m}`);
		process.exit(1);
	};
	const eq = (a, b, m) => {
		if (JSON.stringify(a) !== JSON.stringify(b))
			fail(`${m}: got ${JSON.stringify(a)}, want ${JSON.stringify(b)}`);
	};
	const tk = parseTokens(FIXTURE_TOKENS);
	eq(tk.durations.fast, 150, "parse durations");
	eq(tk.easings.out, "0.16,1,0.3,1", "parse easings");
	eq(
		[...tk.msSet].sort((a, b) => a - b),
		[15, 50, 80, 150, 200, 300, 600],
		"ms set"
	);
	eq(toMs(".15s"), 150, "toMs seconds");
	eq(toMs("150ms"), 150, "toMs ms");
	eq(toMs("auto"), null, "toMs junk");
	const scan = (t) => scanText(t, tk);
	// rule 1: fallbacks
	eq(
		scan("a{transition: opacity var(--ft-duration-fast, 150ms)}").mismatches,
		[],
		"matching fallback"
	);
	eq(
		scan("a{transition: opacity var(--ft-duration-fast, 0.15s)}").mismatches,
		[],
		"seconds fallback equal"
	);
	eq(
		scan("a{transition: opacity var(--ft-duration-fast, 160ms)}").mismatches.length,
		1,
		"wrong duration fallback"
	);
	eq(
		scan("a{transition: x var(--ft-ease-out, cubic-bezier(0.16,1,0.3,1))}").mismatches,
		[],
		"matching curve"
	);
	eq(
		scan("a{transition: x var(--ft-ease-out, cubic-bezier(0.2, 1, 0.3, 1))}").mismatches.length,
		1,
		"wrong curve fallback"
	);
	eq(
		scan("a{width: var(--ft-sidebar-signal-duration, 999ms)}").mismatches,
		[],
		"component vars are not tokens"
	);
	eq(
		scan("a{transition: x var(--ft-duration-fsat, 150ms)}").mismatches.map((m) => m.unknown),
		[true],
		"misspelled token name fails"
	);
	eq(
		scan("a{transition: x var(--ft-ease-ot, cubic-bezier(0.16,1,0.3,1))}").mismatches.length,
		1,
		"misspelled curve name fails"
	);
	eq(
		scan("a{transition: x var(--ft-duration-exit, 200ms)}").mismatches,
		[],
		"declared token name passes"
	);
	eq(
		scan("a{x: var(--ft-sidebar-d, var(--ft-duration-fast, 151ms))}").mismatches.length,
		1,
		"nested token var is checked"
	);
	eq(scan("/* var(--ft-duration-fast, 1ms) */ a{}").mismatches, [], "comments are not scanned");
	eq(
		scan("a{x:\n var(--ft-duration-base,\n 301ms)}").mismatches[0]?.line,
		2,
		"multi-line var reports its line"
	);
	// rule 2: literals
	eq(scan("a{transition: opacity 150ms ease}").bare.length, 1, "bare token duration");
	eq(scan("a{transition: opacity 151ms ease}").off.length, 1, "off-token duration");
	eq(
		scan("a{transition: opacity 151ms ease /* off-token: matches the tooltip */}").off.length,
		0,
		"same-line comment excuses"
	);
	eq(
		scan("/* off-token: tuned */\na{transition: opacity 151ms ease}").off.length,
		0,
		"previous-line comment excuses"
	);
	eq(
		scan("/* off-token: tuned */\n\na{transition: opacity 151ms ease}").off.length,
		1,
		"comment two lines up does not"
	);
	eq(
		scan("a{transition: x 1s cubic-bezier(0.1, 0.2, 0.3, 0.4)}").off.length,
		2,
		"off-token curve and duration"
	);
	eq(scan("a{transition: x var(--d, 151ms)}").off.length, 0, "var fallback is not a literal");
	eq(
		scan("a{animation: spin 1.6s linear infinite}").off.length,
		0,
		"infinite loop duration skipped"
	);
	eq(scan("a{animation-duration: 0.01ms}").off.length, 0, "reduced-motion override skipped");
	eq(scan("a{width: 151ms}").off.length, 0, "not a transition declaration");
	eq(scan('<div class="duration-[250ms] delay-150">').off.length, 1, "tailwind off-token");
	eq(scan('<div class="duration-[250ms] delay-150">').bare.length, 1, "tailwind bare");
	eq(
		scan("a{transition:\n  opacity 151ms ease,\n  color 300ms ease;\n}").off.length,
		1,
		"multi-line transition"
	);
	eq(
		scan("a{transition: opacity 150ms;}\nb{margin: 0 300ms}").bare.length,
		1,
		"multi-line state closes at semicolon"
	);
	eq(scan("x = cubic-bezier(0.16, 1, 0.3, 1)").bare.length, 1, "bare token curve anywhere");
	// ignore list and pins
	eq(
		isIgnored("src/lib/fancy-ui/sound/SoundToggle.svelte", [{ path: "src/lib/fancy-ui/sound/" }]),
		true,
		"ignored prefix"
	);
	eq(
		isIgnored("src/lib/fancy-ui/soundtrack/X.svelte", [{ path: "src/lib/fancy-ui/sound/" }]),
		false,
		"prefix is exact"
	);
	const trees = {
		svelte: { bare: 5, offToken: 2, files: { "a.svelte": { bare: 5, offToken: 2 } } },
	};
	eq(
		comparePins(trees, { svelte: { bare: 5, offToken: 2 } }),
		{ failures: [], lowered: [] },
		"pins equal"
	);
	eq(comparePins(trees, { svelte: { bare: 4, offToken: 2 } }).failures.length, 1, "a rise fails");
	eq(
		comparePins(trees, { svelte: { bare: 9, offToken: 2 } }).lowered.length,
		1,
		"a fall passes and is reported"
	);
	eq(comparePins(trees, {}).failures.length, 2, "missing pins fail");
	console.log("check-motion-tokens self-test ok");
}

// --- main ----------------------------------------------------------------------

function main() {
	const argv = process.argv.slice(2);
	if (argv.includes("--self-test")) return selfTest();
	const tokens = parseTokens(readFileSync(TOKENS_PATH, "utf8"));
	if (!Object.keys(tokens.durations).length || !Object.keys(tokens.easings).length)
		throw new Error("Could not read DURATIONS / EASINGS from tokens.ts");
	const ignore = existsSync(IGNORE_PATH)
		? JSON.parse(readFileSync(IGNORE_PATH, "utf8")).ignore
		: [];
	const { trees, mismatches } = measure(repoRoot, tokens, ignore);
	if (argv.includes("--list")) {
		for (const [name, t] of Object.entries(trees)) {
			console.log(`${name}: bare ${t.bare}, off-token ${t.offToken}`);
			for (const [f, c] of Object.entries(t.files))
				console.log(`  ${f}: bare ${c.bare}, off-token ${c.offToken}`);
		}
		return;
	}
	if (mismatches.length) {
		for (const m of mismatches)
			console.error(
				m.unknown
					? `${m.file}:${m.line}: ${m.name} is not a token declared in tokens.ts (${m.got})`
					: `${m.file}:${m.line}: ${m.name} fallback ${m.got} != token ${m.expected} (tokens.ts)`
			);
		console.error(`FAIL: ${mismatches.length} var(--ft-*) fallback(s) differ from tokens.ts`);
		process.exit(1);
	}
	if (argv.includes("--update-pins")) {
		const pins = Object.fromEntries(
			Object.entries(trees).map(([name, t]) => [name, { bare: t.bare, offToken: t.offToken }])
		);
		writeFileSync(PINS_PATH, JSON.stringify(pins, null, "\t") + "\n");
		console.log(`pins written: ${JSON.stringify(pins)}`);
		return;
	}
	const pins = existsSync(PINS_PATH) ? JSON.parse(readFileSync(PINS_PATH, "utf8")) : {};
	const { failures, lowered } = comparePins(trees, pins);
	for (const l of lowered) console.log(`note: ${l}; lower the pin with --update-pins`);
	if (failures.length) {
		for (const f of failures) console.error(f);
		console.error(
			"FAIL: motion literals rose above the pins. Use a token (var(--ft-*, <token value>)) or add an `off-token: <reason>` comment."
		);
		process.exit(1);
	}
	const totals = Object.entries(trees)
		.map(([n, t]) => `${n} ${t.bare}/${t.offToken}`)
		.join(", ");
	console.log(`motion tokens ok (bare/off-token): ${totals}`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
