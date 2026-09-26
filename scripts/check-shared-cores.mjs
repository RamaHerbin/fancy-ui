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
 *      any framework and from the server: no framework import specifier
 *      (`svelte`, `react`, `vue`, their companion packages such as
 *      `react-dom` / `vue-router` / `@sveltejs/kit` / `@vue/*`, `$lib`,
 *      `$app`, `$env`, or a `.svelte` / `.vue` module), no `import.meta.env`
 *      (not even for dev-only diagnostics), and no `window` / `document` /
 *      `navigator` reference evaluated at import time — a top-level statement
 *      or a module-scope initializer such as `const w = window.innerWidth`.
 *      References inside function bodies are fine, and so are those on the
 *      side of a `typeof` guard that proves the global exists (the `else` of
 *      `typeof window === "undefined"`, the right of `typeof document !==
 *      "undefined" &&`). `--self-test` runs the cases that pin these rules.
 *   3. Completeness — every engine-shaped file under `src/lib/fancy-ui`
 *      (`core.ts`, `shared.ts`, `engine.ts`, `renderer.ts`, bare or as a
 *      `-`-suffix such as `*-engine.ts`; tests excluded) must appear in the
 *      manifest, shared or not, so the ledger can never silently miss a new
 *      core.
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
 *   --self-test     run the built-in purity cases (what each rule must reject
 *                   and accept) instead of checking the manifest
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
import ts from "typescript";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");
const fancyUiDir = join(repoRoot, "src", "lib", "fancy-ui");

const TREES = ["svelte", "react", "vue"];

// Files that must be listed in the manifest (shared or not): the bare names
// (`sound/engine.ts`) as well as the suffixed ones (`fluid-cursor-core.ts`).
const CORE_FILE_RE = /(?:^|-)(?:core|shared|engine|renderer)\.ts$/;
const TEST_FILE_RE = /\.(test|spec)\.[cm]?tsx?$/;

// Only source files are linted for purity; CSS carries no imports.
const LINTABLE_RE = /\.[cm]?[jt]sx?$/;

// A framework package, one of its companion packages (`react-dom`,
// `vue-router`, `svelte-motion`...), a framework scope (`@sveltejs/kit`,
// `@vue/reactivity`, `@vueuse/core`), a SvelteKit alias, or a component module.
// A `./x.svelte.js` runes-module import is NOT rejected: it is a per-tree seam
// (`sound/sound-feedback.ts` imports `./sound.svelte.js`, which each tree
// provides in its own shape), so the specifier stays identical across trees.
const FRAMEWORK_IMPORT_RE =
	/^(?:(?:svelte|react|vue)(?:-[^/]+)?(?:\/|$)|@(?:sveltejs|vue|vueuse)\/|\$(?:lib|app|env)(?:\/|$))|\.(?:svelte|vue)$/;

// Browser globals a shared core may only touch once running, never on import.
const DOM_GLOBALS = new Set(["window", "document", "navigator"]);

const MAX_DIFF_LINES = 200;

function parseArgs(argv) {
	const opts = { diff: true, requireReact: false, requireVue: false, selfTest: false };
	for (const arg of argv) {
		if (arg === "--diff") opts.diff = true;
		else if (arg === "--no-diff") opts.diff = false;
		else if (arg === "--require-react") opts.requireReact = true;
		else if (arg === "--require-vue") opts.requireVue = true;
		else if (arg === "--self-test") opts.selfTest = true;
		else {
			console.error(`Unknown flag: ${arg}`);
			console.error(
				"Usage: node scripts/check-shared-cores.mjs [--diff|--no-diff] [--require-react] [--require-vue] [--self-test]"
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
	return lintPuritySource(relPath, readFileSync(absPath, "utf8"));
}

/** Purity violations of one file's source text, as `{ file, line, message }`. */
function lintPuritySource(relPath, raw) {
	const violations = [];
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

	// 3. DOM globals evaluated at import time.
	for (const hit of importTimeDomReads(relPath, raw)) {
		violations.push({
			line: hit.line,
			message: `module-scope \`${hit.name}\` read — a shared core must be safe to import on the server`,
		});
	}

	return violations.map((v) => ({ ...v, file: relPath }));
}

/**
 * Every `window` / `document` / `navigator` reference that runs when the
 * module is imported, as `{ line, name }`. Walks the TypeScript AST from the
 * top-level statements and stops at anything whose body runs later: function
 * and arrow bodies, methods, accessors, constructors and instance fields (an
 * immediately invoked function or arrow is walked, since it runs now). Types
 * are skipped (they are erased), and so is the operand of `typeof`.
 *
 * A read is allowed only where a `typeof` guard proves that global exists,
 * and the guard's polarity decides which side that is (see `guardFacts`):
 * the `then` / `whenTrue` side of `typeof window !== "undefined"`, the `else`
 * / `whenFalse` side of `typeof window === "undefined"`, the right operand of
 * `&&` when the left one proves it true and of `||` when it proves it false.
 * Each global needs its own guard. Static fields and static blocks run when
 * the class is defined, so they are walked.
 */
function importTimeDomReads(fileName, source) {
	const sf = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
	const hits = [];
	const deferred = (node) =>
		ts.isFunctionLike(node) ||
		(ts.isPropertyDeclaration(node) &&
			!(ts.getCombinedModifierFlags(node) & ts.ModifierFlags.Static));
	const withFacts = (safe, facts) => (facts.size === 0 ? safe : new Set([...safe, ...facts]));
	const visit = (node, safe) => {
		if (ts.isTypeNode(node) || ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node)) {
			return;
		}
		if (ts.isTypeOfExpression(node) && ts.isIdentifier(node.expression)) return;
		if (ts.isIfStatement(node)) {
			const facts = guardFacts(node.expression);
			visit(node.expression, safe);
			visit(node.thenStatement, withFacts(safe, facts.whenTrue));
			if (node.elseStatement) visit(node.elseStatement, withFacts(safe, facts.whenFalse));
			return;
		}
		if (ts.isConditionalExpression(node)) {
			const facts = guardFacts(node.condition);
			visit(node.condition, safe);
			visit(node.whenTrue, withFacts(safe, facts.whenTrue));
			visit(node.whenFalse, withFacts(safe, facts.whenFalse));
			return;
		}
		if (ts.isBinaryExpression(node) && isLogical(node.operatorToken.kind)) {
			const facts = guardFacts(node.left);
			const and = node.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken;
			visit(node.left, safe);
			// `??` only runs its right side when the left is nullish: no fact.
			const known =
				node.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken
					? new Set()
					: and
						? facts.whenTrue
						: facts.whenFalse;
			visit(node.right, withFacts(safe, known));
			return;
		}
		if (ts.isIdentifier(node) && DOM_GLOBALS.has(node.text) && isReference(node)) {
			if (safe.has(node.text)) return;
			const { line } = sf.getLineAndCharacterOfPosition(node.getStart(sf));
			hits.push({ line: line + 1, name: node.text });
			return;
		}
		if (ts.isCallExpression(node)) {
			const callee = skipParens(node.expression);
			if (ts.isFunctionExpression(callee) || ts.isArrowFunction(callee)) {
				// An IIFE runs at import: its parameters and body are walked.
				for (const p of callee.parameters) visit(p, safe);
				visit(callee.body, safe);
				for (const a of node.arguments) visit(a, safe);
				return;
			}
		}
		if (deferred(node)) {
			// Parameter defaults and bodies run on call; a computed method name
			// or a static field is still evaluated with the class.
			if (node.name && ts.isComputedPropertyName(node.name)) visit(node.name, safe);
			return;
		}
		ts.forEachChild(node, (child) => visit(child, safe));
	};
	ts.forEachChild(sf, (child) => visit(child, new Set()));
	return hits;
}

function isLogical(kind) {
	return (
		kind === ts.SyntaxKind.AmpersandAmpersandToken ||
		kind === ts.SyntaxKind.BarBarToken ||
		kind === ts.SyntaxKind.QuestionQuestionToken
	);
}

function skipParens(node) {
	let n = node;
	while (ts.isParenthesizedExpression(n)) n = n.expression;
	return n;
}

const NO_FACTS = { whenTrue: new Set(), whenFalse: new Set() };

/**
 * Which DOM globals an expression proves defined when it is truthy
 * (`whenTrue`) and when it is falsy (`whenFalse`). `typeof X !== "undefined"`
 * (or `== "object"`, `"undefined" != typeof X`...) proves X when true;
 * `typeof X === "undefined"` proves X when false; `!` swaps the two; `a && b`
 * is true only when both are, `a || b` false only when both are. Anything
 * else proves nothing, so an unrecognised guard never allows a read.
 */
function guardFacts(expr) {
	const e = skipParens(expr);
	if (ts.isPrefixUnaryExpression(e) && e.operator === ts.SyntaxKind.ExclamationToken) {
		const inner = guardFacts(e.operand);
		return { whenTrue: inner.whenFalse, whenFalse: inner.whenTrue };
	}
	if (!ts.isBinaryExpression(e)) return NO_FACTS;
	const op = e.operatorToken.kind;
	if (op === ts.SyntaxKind.AmpersandAmpersandToken || op === ts.SyntaxKind.BarBarToken) {
		const l = guardFacts(e.left);
		const r = guardFacts(e.right);
		const union = (a, b) => new Set([...a, ...b]);
		const inter = (a, b) => new Set([...a].filter((x) => b.has(x)));
		return op === ts.SyntaxKind.AmpersandAmpersandToken
			? { whenTrue: union(l.whenTrue, r.whenTrue), whenFalse: inter(l.whenFalse, r.whenFalse) }
			: { whenTrue: inter(l.whenTrue, r.whenTrue), whenFalse: union(l.whenFalse, r.whenFalse) };
	}
	const equal =
		op === ts.SyntaxKind.EqualsEqualsEqualsToken || op === ts.SyntaxKind.EqualsEqualsToken;
	const notEqual =
		op === ts.SyntaxKind.ExclamationEqualsEqualsToken ||
		op === ts.SyntaxKind.ExclamationEqualsToken;
	if (!equal && !notEqual) return NO_FACTS;
	const typeofName = (n) => {
		const s = skipParens(n);
		return ts.isTypeOfExpression(s) &&
			ts.isIdentifier(s.expression) &&
			DOM_GLOBALS.has(s.expression.text)
			? s.expression.text
			: null;
	};
	const literal = (n) => {
		const s = skipParens(n);
		return ts.isStringLiteralLike(s) ? s.text : null;
	};
	const name = typeofName(e.left) ?? typeofName(e.right);
	const text = typeofName(e.left) ? literal(e.right) : literal(e.left);
	if (name === null || text === null) return NO_FACTS;
	// `typeof X === "undefined"` is true when X is absent; any other type
	// string (`"object"`, `"function"`) is true only when X exists.
	const provedWhenEqual = text !== "undefined";
	const onEqual = provedWhenEqual ? new Set([name]) : new Set();
	const onDiffer = provedWhenEqual ? new Set() : new Set([name]);
	return equal
		? { whenTrue: onEqual, whenFalse: onDiffer }
		: { whenTrue: onDiffer, whenFalse: onEqual };
}

/** Is this identifier a value read (not a declared name or a property key)? */
function isReference(id) {
	const p = id.parent;
	if (!p) return false;
	if ((ts.isPropertyAccessExpression(p) || ts.isQualifiedName(p)) && p.name === id) return false;
	if (ts.isPropertyAssignment(p) && p.name === id) return false;
	if (ts.isBindingElement(p) && p.propertyName === id) return false;
	if (
		(ts.isVariableDeclaration(p) ||
			ts.isParameter(p) ||
			ts.isBindingElement(p) ||
			ts.isFunctionDeclaration(p) ||
			ts.isClassDeclaration(p) ||
			ts.isEnumMember(p) ||
			ts.isPropertyDeclaration(p) ||
			ts.isMethodDeclaration(p) ||
			ts.isPropertySignature(p) ||
			ts.isGetAccessor(p) ||
			ts.isSetAccessor(p)) &&
		p.name === id
	) {
		return false;
	}
	if (ts.isImportSpecifier(p) || ts.isImportClause(p) || ts.isNamespaceImport(p)) return false;
	if (ts.isExportSpecifier(p)) return false;
	if (ts.isLabeledStatement(p) || ts.isBreakOrContinueStatement(p)) return false;
	return true;
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

/** Every engine-shaped file (see CORE_FILE_RE) under src/lib/fancy-ui. */
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

// --- self-test ----------------------------------------------------------------
// The purity rules are regexes and an AST walk; these cases pin what they must
// reject and accept, so a rule that stops biting fails CI instead of passing
// silently. `bad` must report at least one violation, `ok` none.
const PURITY_CASES = [
	// module-scope DOM reads
	["bad", "const w = window.innerWidth;"],
	["bad", "export const ua = navigator.userAgent;"],
	["bad", "window.addEventListener('resize', () => {});"],
	["bad", "class A { static t = document.title; }"],
	["bad", "const { innerWidth } = window;"],
	["bad", "f(document);"],
	["bad", "enum E { A = window.length }"],
	["bad", "const xs = [document.body];"],
	["bad", "const w = (() => window.innerWidth)();"],
	["bad", "const w = (function () { return window.innerWidth; })();"],
	["bad", 'if (typeof window === "undefined") { window.x = 1; }'],
	["bad", 'const h = typeof document === "undefined" && document.hidden;'],
	["bad", 'const h = typeof document !== "undefined" || document.hidden;'],
	["bad", 'const w = typeof window !== "undefined" ? 0 : window.innerWidth;'],
	["bad", 'const d = typeof window !== "undefined" && document.title;'],
	["bad", "const w = typeof window ? window.innerWidth : 0;"],
	["ok", 'const w = typeof window === "undefined" ? 0 : window.innerWidth;'],
	["ok", 'const w = typeof window !== "undefined" ? window.innerWidth : 0;'],
	["ok", 'if (typeof window === "undefined") { f(); } else { g(window.innerWidth); }'],
	["ok", 'if (typeof window !== "undefined") { g(window.innerWidth); }'],
	["ok", 'if (!(typeof window === "undefined")) { g(window.innerWidth); }'],
	["ok", 'const h = typeof document === "undefined" || document.hidden;'],
	["ok", 'const h = typeof document !== "undefined" && document.hidden;'],
	["ok", 'const h = "undefined" != typeof document && document.hidden;'],
	["ok", 'const o = typeof window === "object" && window.innerWidth;'],
	[
		"ok",
		'const b = typeof window !== "undefined" && typeof document !== "undefined" && document.body;',
	],
	["ok", "export function w() { return window.innerWidth; }"],
	["ok", "export const w = () => window.innerWidth;"],
	["ok", "class A { m() { return document.title; } x = window.innerWidth; }"],
	["ok", "type W = typeof window; interface I { d: Document }"],
	["ok", "const o = { window: 1, document: 2 }; o.navigator;"],
	// framework imports
	...[
		"react",
		"react-dom/client",
		"vue",
		"vue-router",
		"svelte",
		"svelte/store",
		"svelte-motion",
		"@sveltejs/kit",
		"@vue/reactivity",
		"@vueuse/core",
		"$lib/x",
		"$app/environment",
		"$env/dynamic/public",
		"./Foo.svelte",
		"./Bar.vue",
	].map((spec) => ["bad", `import x from "${spec}";`]),
	["bad", 'export { y } from "vue";'],
	["bad", 'const m = import("svelte/store");'],
	["ok", 'import x from "reactive-thing";'],
	["ok", 'import x from "./vue-bridge-core";'],
	["ok", 'import x from "./svelte-helpers-core.js";'],
	// per-tree seam, see FRAMEWORK_IMPORT_RE
	["ok", 'import { sound } from "./sound.svelte.js";'],
	// import.meta.env
	["bad", "const dev = import.meta.env.DEV;"],
];

function selfTest() {
	let failed = 0;
	for (const [expect, src] of PURITY_CASES) {
		const got = lintPuritySource("self-test.ts", src).length > 0 ? "bad" : "ok";
		if (got === expect) continue;
		failed++;
		console.error(`  expected ${expect}, got ${got}: ${src}`);
	}
	if (failed > 0) {
		console.error(`Shared-core purity self-test FAILED (${failed}/${PURITY_CASES.length}).`);
		process.exit(1);
	}
	console.log(`Shared-core purity self-test OK (${PURITY_CASES.length} cases).`);
	process.exit(0);
}

function main() {
	const opts = parseArgs(process.argv.slice(2));
	if (opts.selfTest) selfTest();
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
		const present =
			svelteAbs === null ? [] : [{ tree: "svelte", rel: paths.svelte, abs: svelteAbs }];
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
