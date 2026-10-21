#!/usr/bin/env node
/**
 * README count gate.
 *
 * The component count quoted in README.md, react/README.md, vue/README.md and
 * the root package.json description must equal the number of registry entries in
 * src/lib/fancy-ui/registry.ts that are component folders (the `sound` family
 * is excluded, as in the parity matrices). Counts that describe a sub-kit (for example
 * "18 components" of one subpath) do not match the patterns below and are
 * left alone.
 *
 *   node scripts/check-readme-count.mjs            check the repository
 *   node scripts/check-readme-count.mjs --self-test  run the built-in checks
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const FILES = ["README.md", "react/README.md", "vue/README.md", "package.json"];

// One regex per way the repository quotes the total.
const PATTERNS = [
	/badge\/Components-(\d+)-/g,
	/\*\*(\d+) components\*\*/g,
	/\bAll (\d+) components\b/g,
	/\b(\d+) components and counting/g,
	/"description":\s*"(\d+) UI components/g,
];

/**
 * Registry slugs that are not component folders. Mirrors `isComponentDir` in
 * react/scripts/check-matrix.mjs: `sound` is a family shipped from src/sound/.
 */
const NON_COMPONENT = new Set(["sound"]);

/** Slugs of the top-level entries of the `registry` object in `src`. */
export function registrySlugs(src) {
	const start = src.search(/export\s+const\s+registry\s*:/);
	if (start === -1) throw new Error("Could not locate `export const registry` in registry.ts");
	const body = src.slice(start);
	const end = body.search(/^\};/m);
	const entries = body.slice(0, end === -1 ? undefined : end).match(/^\t"?[A-Za-z0-9_-]+"?: \{$/gm);
	return (entries ?? []).map((e) => e.trim().replace(/^"|"?: \{$/g, ""));
}

/** Components counted the way the parity matrices count them. */
export function countComponents(slugs) {
	return slugs.filter((s) => !NON_COMPONENT.has(s)).length;
}

export function registrySize() {
	const src = readFileSync(join(repoRoot, "src/lib/fancy-ui/registry.ts"), "utf8");
	return countComponents(registrySlugs(src));
}

/** Every quoted total in `text`, with its 1-based line. */
export function findCounts(text) {
	const found = [];
	for (const re of PATTERNS) {
		for (const m of text.matchAll(re)) {
			const line = text.slice(0, m.index).split("\n").length;
			found.push({ value: Number(m[1]), line });
		}
	}
	return found.sort((a, b) => a.line - b.line);
}

/** Mismatch messages for one file's text. */
export function checkText(file, text, expected) {
	return findCounts(text)
		.filter((c) => c.value !== expected)
		.map((c) => `${file}:${c.line} says ${c.value}, registry has ${expected}`);
}

function selfTest() {
	const ok = checkText("a", "**3 components**\nComponents-3-x", 3).length === 0;
	const bad = checkText("a", "**4 components**", 3).length === 1;
	const sub = findCounts("a subpath (18 components, kit)").length === 0;
	const fake =
		'export const registry: R = {\n\t"a-b": {\n\t},\n\tsound: {\n\t},\n\tc: {\n\t},\n};\n';
	const slugs = registrySlugs(fake);
	const excl = slugs.join() === "a-b,sound,c" && countComponents(slugs) === 2;
	if (!(ok && bad && sub && excl)) {
		console.error("check-readme-count: self-test failed");
		process.exit(1);
	}
	console.log("check-readme-count: self-test ok");
}

function main() {
	if (process.argv.includes("--self-test")) selfTest();
	const expected = registrySize();
	const problems = [];
	for (const file of FILES) {
		const text = readFileSync(join(repoRoot, file), "utf8");
		if (findCounts(text).length === 0) problems.push(`${file}: no component count found`);
		problems.push(...checkText(file, text, expected));
	}
	if (problems.length) {
		console.error(
			`check-readme-count: registry has ${expected} components\n` + problems.join("\n")
		);
		process.exit(1);
	}
	console.log(`check-readme-count: ${FILES.length} files agree with the registry (${expected})`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
