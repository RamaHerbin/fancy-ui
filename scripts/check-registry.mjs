#!/usr/bin/env node
/**
 * Registry parity check.
 *
 * Verifies that three sources of truth agree:
 *   1. Component folders under `src/lib/fancy-ui/`
 *   2. Entries in `src/lib/fancy-ui/registry.ts` (the `registry` object)
 *   3. Re-exports in `src/lib/fancy-ui/index.ts`
 *
 * Exits non-zero on any drift so CI can catch missing folders, dead registry
 * entries, or barrels that fail to re-export a component.
 *
 * The registry.ts parser accepts both quoted keys (`"book": { ... }`) and
 * bare-identifier keys (`book: { ... }`).
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");
const fancyUiDir = join(repoRoot, "src", "lib", "fancy-ui");
const registryPath = join(fancyUiDir, "registry.ts");
const indexPath = join(fancyUiDir, "index.ts");

// Non-component entries inside src/lib/fancy-ui/
const NON_COMPONENT_ENTRIES = new Set([
	"_template",
	"index.ts",
	"registry.ts",
	"tailwind.css",
]);

function listComponentFolders() {
	return readdirSync(fancyUiDir)
		.filter((name) => !NON_COMPONENT_ENTRIES.has(name))
		.filter((name) => {
			const stat = statSync(join(fancyUiDir, name));
			return stat.isDirectory();
		})
		.sort();
}

function parseRegistrySlugs() {
	const src = readFileSync(registryPath, "utf8");

	// Find the body of the `registry` object literal.
	const startMatch = src.match(/export\s+const\s+registry\s*:[^=]*=\s*\{/);
	if (!startMatch) {
		throw new Error("Could not locate `export const registry` in registry.ts");
	}
	const start = startMatch.index + startMatch[0].length;

	// Walk the registry body char-by-char with a small state machine. We need
	// to track strings, comments, and bracket depth simultaneously so we can
	// (a) find the matching closing `}` of the registry object and (b) only
	// recognize top-level `<key>: {` entries at depth 0.
	const slugs = new Set();
	let i = start;
	let depth = 1; // we are already inside the registry `{`
	let inLineComment = false;
	let inBlockComment = false;
	let stringQuote = null; // '"' | "'" | "`" | null
	let atKeyPosition = true; // true when we're at the start of a potential key (depth 0, just past whitespace/newline)
	// Top-level entry keys are written on their own line. We scan for either
	// `"slug-name":` (quoted) or `bareIdent:` (bare) followed by `{`, where the
	// match starts at depth 1 (i.e. directly inside the registry object).

	while (i < src.length && depth > 0) {
		const ch = src[i];
		const next = src[i + 1];

		// 1. Already inside a comment? Handle exit.
		if (inLineComment) {
			if (ch === "\n") inLineComment = false;
			i++;
			continue;
		}
		if (inBlockComment) {
			if (ch === "*" && next === "/") {
				inBlockComment = false;
				i += 2;
				continue;
			}
			i++;
			continue;
		}

		// 2. Already inside a string? Handle continuation/exit. This MUST come
		// before any comment-entering check, otherwise `//` inside a URL string
		// would be misread as a line comment.
		if (stringQuote) {
			if (ch === "\\") {
				i += 2;
				continue;
			}
			if (ch === stringQuote) {
				stringQuote = null;
			}
			i++;
			continue;
		}

		// 3. Outside both strings and comments: check for comment entry.
		if (ch === "/" && next === "/") {
			inLineComment = true;
			i += 2;
			continue;
		}
		if (ch === "/" && next === "*") {
			inBlockComment = true;
			i += 2;
			continue;
		}

		// 4. At depth 1, check for a top-level entry key. Must run BEFORE
		// string-entering so a quoted key isn't swallowed by string mode.
		if (depth === 1 && atKeyPosition) {
			const rest = src.slice(i, i + 80);
			let m = rest.match(/^"([a-zA-Z0-9_-]+)"\s*:\s*\{/);
			if (m) {
				slugs.add(m[1]);
				i += m[0].length;
				depth++;
				atKeyPosition = false;
				continue;
			}
			m = rest.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*:\s*\{/);
			if (m) {
				slugs.add(m[1]);
				i += m[0].length;
				depth++;
				atKeyPosition = false;
				continue;
			}
		}

		// 5. Entering a new string
		if (ch === '"' || ch === "'" || ch === "`") {
			stringQuote = ch;
			i++;
			continue;
		}

		// Track brace depth
		if (ch === "{" || ch === "[" || ch === "(") depth++;
		else if (ch === "}" || ch === "]" || ch === ")") depth--;

		// Reset atKeyPosition: a key is recognized only after a newline + whitespace
		// at depth 1. Once depth changes or we hit non-whitespace at depth 1 that
		// isn't a key, we wait for the next newline-at-depth-1.
		if (ch === "\n") {
			atKeyPosition = depth === 1;
		} else if (ch !== " " && ch !== "\t") {
			// Any non-whitespace already consumed above (key match, or unrelated)
			// implies we're past the key position until the next newline.
			if (!atKeyPosition || depth !== 1) {
				atKeyPosition = false;
			}
		}

		i++;
	}

	if (depth !== 0) {
		throw new Error("Unbalanced braces while parsing registry object literal");
	}

	return [...slugs].sort();
}

function parseIndexExports() {
	const src = readFileSync(indexPath, "utf8");
	const re = /export\s+\*\s+from\s+["']\.\/([^/"'\s]+)\/index\.js["']/g;
	const exports = new Set();
	let m;
	while ((m = re.exec(src)) !== null) {
		exports.add(m[1]);
	}
	return [...exports].sort();
}

function diff(label, expected, actual) {
	const expSet = new Set(expected);
	const actSet = new Set(actual);
	const missing = expected.filter((x) => !actSet.has(x));
	const extra = actual.filter((x) => !expSet.has(x));
	if (missing.length === 0 && extra.length === 0) return null;
	return { label, missing, extra };
}

function main() {
	const folders = listComponentFolders();
	const registrySlugs = parseRegistrySlugs();
	const indexExports = parseIndexExports();

	const issues = [];

	const regVsFolder = diff("registry vs folders", folders, registrySlugs);
	if (regVsFolder) issues.push(regVsFolder);

	const indexVsFolder = diff("index.ts vs folders", folders, indexExports);
	if (indexVsFolder) issues.push(indexVsFolder);

	if (issues.length === 0) {
		console.log(`Registry parity OK (${folders.length} components).`);
		process.exit(0);
	}

	console.error("Registry parity check FAILED.\n");
	for (const { label, missing, extra } of issues) {
		console.error(`  [${label}]`);
		if (missing.length) {
			console.error(`    missing: ${missing.join(", ")}`);
		}
		if (extra.length) {
			console.error(`    extra:   ${extra.join(", ")}`);
		}
	}
	console.error("");
	console.error(`  folder count:   ${folders.length}`);
	console.error(`  registry count: ${registrySlugs.length}`);
	console.error(`  index count:    ${indexExports.length}`);
	process.exit(1);
}

main();
