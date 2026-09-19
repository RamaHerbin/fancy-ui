#!/usr/bin/env node
/**
 * Shared-core identity gate.
 *
 * `shared-cores.json` (repo root) is the ledger of every framework-free file
 * that more than one package tree is supposed to carry **byte for byte**: the
 * Svelte source is the reference, the React (and later Vue) trees hold copies.
 * This script is what makes "copy" mean something:
 *
 *   1. Identity — for every entry with `"shared": true`, the sha256 of each
 *      tree's copy that exists must be equal. No formatter normalisation, no
 *      stored-patch fallback: byte identity, as decided. A mismatch prints a
 *      unified diff (via `diff -u`) so the drift is readable in CI.
 *   2. Purity — every present copy of a shared file must be importable from
 *      any framework and from the server: no `svelte` / `react` / `vue` /
 *      `$lib` / `$app` import specifier, no `import.meta.env` (not even for
 *      dev-only diagnostics), no module-level `window.` / `document.` /
 *      `navigator.` statement.
 *   3. Completeness — every engine-shaped file under `src/lib/fancy-ui`
 *      (`*-core.ts`, `*-shared.ts`, `*-engine.ts`, `*-renderer.ts`, tests
 *      excluded) must appear in the manifest, shared or not, so the ledger
 *      can never silently miss a new core.
 *   4. Manifest sanity — an entry's Svelte path must exist, and an entry that
 *      is not shared must say why.
 *
 * Exits non-zero on any failure so CI catches drift the moment it lands.
 *
 * Usage:
 *   node scripts/check-shared-cores.mjs [--diff|--no-diff] [--require-react] [--require-vue]
 *
 *   --diff          print a unified diff for each mismatching pair (default on)
 *   --no-diff       hashes only, no diff bodies
 *   --require-react every shared entry must have a React copy present
 *   --require-vue   every shared entry must have a Vue copy present
 *
 * The React and Vue copies are optional by default: the React tree does not
 * carry every shared file yet and the Vue package does not exist at all. The
 * two `--require-*` flags are the switch to flip once a tree has converged;
 * an entry whose path for that tree is `null` is a deliberate exclusion and is
 * skipped by them.
 *
 * Test hook: set `SHARED_CORES_MANIFEST=/abs/path/to/manifest.json` to run the
 * gate against a manifest copy outside the repo (paths inside it are still
 * resolved against the repo root). Used to exercise the failure paths without
 * writing throwaway files into the repo.
 */

import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");
const fancyUiDir = join(repoRoot, "src", "lib", "fancy-ui");

const TREES = ["svelte", "react", "vue"];

// Files that must be listed in the manifest (shared or not).
const CORE_FILE_RE = /-(core|shared|engine|renderer)\.ts$/;
const TEST_FILE_RE = /\.(test|spec)\.[cm]?tsx?$/;

// Only source files are linted for purity; CSS carries no imports.
const LINTABLE_RE = /\.[cm]?[jt]sx?$/;

const FRAMEWORK_IMPORT_RE = /^(svelte|react|vue|\$lib|\$app)(\/|$)/;

const MAX_DIFF_LINES = 200;

function parseArgs(argv) {
	const opts = { diff: true, requireReact: false, requireVue: false };
	for (const arg of argv) {
		if (arg === "--diff") opts.diff = true;
		else if (arg === "--no-diff") opts.diff = false;
		else if (arg === "--require-react") opts.requireReact = true;
		else if (arg === "--require-vue") opts.requireVue = true;
		else {
			console.error(`Unknown flag: ${arg}`);
			console.error(
				"Usage: node scripts/check-shared-cores.mjs [--diff|--no-diff] [--require-react] [--require-vue]"
			);
			process.exit(2);
		}
	}
	return opts;
}

function manifestPath() {
	const override = process.env.SHARED_CORES_MANIFEST;
	if (override) return isAbsolute(override) ? override : resolve(repoRoot, override);
	return join(repoRoot, "shared-cores.json");
}

function loadManifest(file) {
	let raw;
	try {
		raw = readFileSync(file, "utf8");
	} catch {
		throw new Error(`Cannot read manifest ${file}`);
	}
	let parsed;
	try {
		parsed = JSON.parse(raw);
	} catch (err) {
		throw new Error(`Manifest ${file} is not valid JSON: ${err.message}`);
	}
	if (!Array.isArray(parsed)) {
		throw new Error(`Manifest ${file} must be an array of entries`);
	}
	return parsed;
}

function sha256(absPath) {
	return createHash("sha256").update(readFileSync(absPath)).digest("hex");
}

/**
 * Blank out comments so the purity lint never trips on prose. Comment bytes
 * become spaces and newlines are preserved, so reported line numbers stay
 * true to the file. Strings and template literals are respected (a `//`
 * inside a URL or a GLSL shader string is not a comment).
 */
function stripComments(src) {
	let out = "";
	let i = 0;
	let quote = null; // '"' | "'" | "`" | null
	while (i < src.length) {
		const ch = src[i];
		const next = src[i + 1];

		if (quote) {
			if (ch === "\\") {
				out += src.slice(i, i + 2);
				i += 2;
				continue;
			}
			if (ch === quote) quote = null;
			out += ch;
			i++;
			continue;
		}

		if (ch === "/" && next === "/") {
			while (i < src.length && src[i] !== "\n") {
				out += " ";
				i++;
			}
			continue;
		}
		if (ch === "/" && next === "*") {
			out += "  ";
			i += 2;
			while (i < src.length && !(src[i] === "*" && src[i + 1] === "/")) {
				out += src[i] === "\n" ? "\n" : " ";
				i++;
			}
			out += "  ";
			i += 2;
			continue;
		}
		if (ch === '"' || ch === "'" || ch === "`") {
			quote = ch;
			out += ch;
			i++;
			continue;
		}

		out += ch;
		i++;
	}
	return out;
}

function lineOf(src, index) {
	let line = 1;
	for (let i = 0; i < index && i < src.length; i++) {
		if (src[i] === "\n") line++;
	}
	return line;
}

/** Purity violations of one file, as `{ line, message }`. */
function lintPurity(relPath, absPath) {
	const violations = [];
	const raw = readFileSync(absPath, "utf8");
	const code = stripComments(raw);

	// 1. Framework / SvelteKit import specifiers.
	const specRe =
		/(?:\bimport\s+(?:type\s+)?(?:[^"'()]*?\sfrom\s+)?|\bexport\s+(?:type\s+)?[^"'()]*?\sfrom\s+|\bimport\s*\(\s*)(["'])([^"']+)\1/g;
	let m;
	while ((m = specRe.exec(code)) !== null) {
		const spec = m[2];
		if (FRAMEWORK_IMPORT_RE.test(spec)) {
			violations.push({
				line: lineOf(code, m.index),
				message: `framework import "${spec}" — a shared core must import no framework`,
			});
		}
	}

	// 2. import.meta.env (ruling 6: no diagnostics in cores, not even a DEV const).
	const envRe = /import\.meta\.env/g;
	while ((m = envRe.exec(code)) !== null) {
		violations.push({
			line: lineOf(code, m.index),
			message: "`import.meta.env` — bundler-specific, forbidden in a shared core",
		});
	}

	// 3. Module-level DOM access (a statement starting at column 0).
	const lines = code.split("\n");
	for (let i = 0; i < lines.length; i++) {
		if (/^(window|document|navigator)\./.test(lines[i])) {
			violations.push({
				line: i + 1,
				message: `module-level \`${lines[i].slice(0, 24).trim()}…\` — a shared core must be safe to import on the server`,
			});
		}
	}

	return violations.map((v) => ({ ...v, file: relPath }));
}

function unifiedDiff(refRel, otherRel) {
	// Run from the repo root so the diff header shows repo-relative paths.
	const res = spawnSync("diff", ["-u", refRel, otherRel], {
		cwd: repoRoot,
		encoding: "utf8",
	});
	if (res.error) return `    (diff unavailable: ${res.error.message})`;
	const lines = (res.stdout || "").split("\n");
	const shown = lines.slice(0, MAX_DIFF_LINES);
	if (lines.length > MAX_DIFF_LINES) {
		shown.push(`… ${lines.length - MAX_DIFF_LINES} more diff lines elided`);
	}
	return shown.map((l) => `    ${l}`).join("\n");
}

/** Every `*-core.ts` / `*-shared.ts` / `*-engine.ts` / `*-renderer.ts` under src/lib/fancy-ui. */
function listCoreFiles(dir, acc = []) {
	for (const name of readdirSync(dir).sort()) {
		const abs = join(dir, name);
		if (statSync(abs).isDirectory()) {
			listCoreFiles(abs, acc);
			continue;
		}
		if (!CORE_FILE_RE.test(name) || TEST_FILE_RE.test(name)) continue;
		acc.push(relative(repoRoot, abs).split(sep).join("/"));
	}
	return acc;
}

function main() {
	const opts = parseArgs(process.argv.slice(2));
	const file = manifestPath();
	const manifest = loadManifest(file);

	const failures = []; // { label, detail, diff? }
	const fail = (label, detail, diff) => failures.push({ label, detail, diff });

	const seen = new Set();
	let sharedCount = 0;
	let threeWay = 0;
	let comparedPairs = 0;

	for (const [index, entry] of manifest.entries()) {
		const where = entry && entry.id ? entry.id : `entry #${index}`;

		// --- manifest sanity ---------------------------------------------------
		if (!entry || typeof entry !== "object" || typeof entry.id !== "string") {
			fail("manifest", `${where}: not an object with a string "id"`);
			continue;
		}
		if (typeof entry.kind !== "string") {
			fail("manifest", `${where}: missing "kind"`);
		}
		if (typeof entry.shared !== "boolean") {
			fail("manifest", `${where}: "shared" must be a boolean`);
			continue;
		}
		if (!entry.shared && !entry.reason) {
			fail("manifest", `${where}: shared:false needs a "reason"`);
		}
		if (seen.has(entry.id)) {
			fail("manifest", `${where}: duplicate id`);
		}
		seen.add(entry.id);

		const paths = entry.paths ?? {};
		for (const tree of TREES) {
			const p = paths[tree];
			if (p !== null && p !== undefined && typeof p !== "string") {
				fail("manifest", `${where}: paths.${tree} must be a string or null`);
			}
		}
		// The Svelte tree is the reference implementation, so it is the anchor
		// whenever the file exists there. A core that only the framework ports
		// share (a presence state machine, a transition sampler, the test stubs)
		// declares `svelte: null` and is anchored on the first tree present.
		if (paths.svelte !== null && (typeof paths.svelte !== "string" || paths.svelte.length === 0)) {
			fail("manifest", `${where}: paths.svelte must be a non-empty string or null`);
			continue;
		}
		if (paths.svelte === null && !paths.react && !paths.vue) {
			fail("manifest", `${where}: svelte is null and no other tree is declared`);
			continue;
		}

		const svelteAbs = paths.svelte === null ? null : join(repoRoot, paths.svelte);
		if (svelteAbs !== null && !existsSync(svelteAbs)) {
			fail("manifest", `${where}: paths.svelte does not exist (${paths.svelte})`);
			continue;
		}

		if (!entry.shared) continue;
		sharedCount++;

		// --- identity ----------------------------------------------------------
		const present = svelteAbs === null ? [] : [{ tree: "svelte", rel: paths.svelte, abs: svelteAbs }];
		for (const tree of ["react", "vue"]) {
			const rel = paths[tree];
			const required = tree === "react" ? opts.requireReact : opts.requireVue;
			// `null` is a deliberate exclusion (the tree carries its own shape), so
			// the --require-* flags only insist that every DECLARED copy exists.
			if (!rel) continue;
			const abs = join(repoRoot, rel);
			if (!existsSync(abs)) {
				if (required) {
					fail("required-copy", `${where}: missing ${tree} copy (${rel})`);
				}
				continue;
			}
			present.push({ tree, rel, abs });
		}
		if (present.length === 3) threeWay++;
		if (present.length === 0) {
			fail("required-copy", `${where}: no copy of this core exists in any tree`);
			continue;
		}

		const anchor = present[0];
		const refHash = sha256(anchor.abs);
		for (const copy of present.slice(1)) {
			comparedPairs++;
			if (sha256(copy.abs) === refHash) continue;
			fail(
				"identity",
				`${where}: ${copy.rel} differs from ${anchor.rel}`,
				opts.diff ? unifiedDiff(anchor.rel, copy.rel) : undefined
			);
		}

		// --- purity ------------------------------------------------------------
		for (const copy of present) {
			if (!LINTABLE_RE.test(copy.rel)) continue;
			for (const v of lintPurity(copy.rel, copy.abs)) {
				fail("purity", `${where}: ${v.file}:${v.line} — ${v.message}`);
			}
		}
	}

	// --- completeness ---------------------------------------------------------
	const listed = new Set(
		manifest
			.filter((e) => e && e.paths && typeof e.paths.svelte === "string")
			.map((e) => e.paths.svelte)
	);
	const coreFiles = existsSync(fancyUiDir) ? listCoreFiles(fancyUiDir) : [];
	for (const rel of coreFiles) {
		if (!listed.has(rel)) {
			fail("completeness", `${rel} is not listed in the manifest`);
		}
	}

	if (failures.length === 0) {
		console.log(
			`Shared cores OK (${sharedCount} files, ${threeWay} three-way, ${comparedPairs} pairs compared).`
		);
		process.exit(0);
	}

	console.error("Shared-core identity check FAILED.\n");
	const byLabel = new Map();
	for (const f of failures) {
		if (!byLabel.has(f.label)) byLabel.set(f.label, []);
		byLabel.get(f.label).push(f);
	}
	for (const [label, items] of byLabel) {
		console.error(`  [${label}]`);
		for (const item of items) {
			console.error(`    ${item.detail}`);
			if (item.diff) console.error(`${item.diff}\n`);
		}
		console.error("");
	}
	console.error(`  manifest:      ${relative(repoRoot, file) || file}`);
	console.error(`  entries:       ${manifest.length} (${sharedCount} shared)`);
	console.error(`  core files:    ${coreFiles.length} under src/lib/fancy-ui`);
	console.error(`  failures:      ${failures.length}`);
	process.exit(1);
}

main();
