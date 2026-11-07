#!/usr/bin/env node
/**
 * Writes the `--ft-*` motion custom properties into the `:root { … }` of the
 * `@layer base` block of each package's Tailwind entry, from the pure-data
 * module `_internals/motion/token-values.ts`.
 *
 *   node scripts/gen-motion-tokens.mjs              write (idempotent)
 *   node scripts/gen-motion-tokens.mjs --check      exit 1 if a file is stale (CI)
 *   node scripts/gen-motion-tokens.mjs --self-test  run the inline cases
 *
 * Why the block lives in `tailwind.css`: the entry is already the one file a
 * consumer imports, so no new package export is needed. It sits in
 * `@layer base`, so a consumer's unlayered `:root { --ft-duration-fast: 120ms }`
 * wins over it. Components keep their `var(--ft-*, fallback)` literals, so
 * importing a component without the entry still works.
 *
 * The three entries share one body (`check-tailwind-entry.mjs` keeps it
 * byte-identical), so the identical block is written into all three.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadTokenValues, motionTokenDeclarations } from "./lib/motion-token-values.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ENTRIES = ["src/lib/fancy-ui/tailwind.css", "react/tailwind.css", "vue/tailwind.css"];

const INDENT = "\t\t";
const START = `${INDENT}/* @generated motion-tokens:start — from _internals/motion/token-values.ts; \`pnpm gen:motion-tokens\` */`;
const END = `${INDENT}/* @generated motion-tokens:end */`;
const START_RE = /^[ \t]*\/\* @generated motion-tokens:start[^\n]*\*\/[ \t]*$/m;
const END_RE = /^[ \t]*\/\* @generated motion-tokens:end \*\/[ \t]*$/m;

/** The marked block (no trailing newline) for a list of declarations. */
export function renderBlock(declarations) {
	return [START, ...declarations.map(([n, v]) => `${INDENT}${n}: ${v};`), END].join("\n");
}

/** Replace the existing block, or insert one right after the `--ring:` line. */
export function applyBlock(css, block) {
	const start = css.match(START_RE);
	if (start) {
		const end = css.slice(start.index).match(END_RE);
		if (!end) throw new Error("found `motion-tokens:start` without a matching `:end` marker");
		const from = start.index;
		const to = start.index + end.index + end[0].length;
		return css.slice(0, from) + block + css.slice(to);
	}
	const ring = css.match(/^[ \t]*--ring:[^\n]*\n/m);
	if (!ring) throw new Error("no `--ring:` declaration to anchor the block after");
	const at = ring.index + ring[0].length;
	return css.slice(0, at) + block + "\n" + css.slice(at);
}

function selfTest() {
	const assert = (cond, msg) => {
		if (!cond) {
			console.error(`FAIL self-test: ${msg}`);
			process.exit(1);
		}
	};
	const values = {
		DURATIONS: { micro: 80, fast: 150, exit: 200 },
		EASINGS: { out: "cubic-bezier(0.16, 1, 0.3, 1)", in: "cubic-bezier(0.7, 0, 0.84, 0)" },
		STAGGERS: { char: 15, item: 50 },
		STAGGER_CAP: { floor: 200, ceil: 600, fromPx: 48, toPx: 448 },
		HOVER: {
			in: { duration: "fast", easing: "out" },
			out: { duration: "exit", easing: "out" },
		},
	};
	const decls = motionTokenDeclarations(values);
	assert(
		JSON.stringify(decls.map(([n]) => n)) ===
			JSON.stringify([
				"--ft-duration-micro",
				"--ft-duration-fast",
				"--ft-duration-exit",
				"--ft-ease-out",
				"--ft-ease-in",
				"--ft-stagger-char",
				"--ft-stagger-item",
				"--ft-hover-in",
				"--ft-hover-out",
			]),
		"declaration order"
	);
	assert(decls[0][1] === "80ms", "duration shape");
	assert(decls[5][1] === "15ms", "stagger shape");
	assert(decls[7][1] === "150ms cubic-bezier(0.16, 1, 0.3, 1)", "hover-in shape");
	assert(decls[8][1] === "200ms cubic-bezier(0.16, 1, 0.3, 1)", "hover-out shape");
	assert(!decls.some(([n]) => n.includes("cap")), "STAGGER_CAP is not emitted");

	const fixture = "@layer base {\n\t:root {\n\t\t--ring: red;\n\t}\n}\n";
	const block = renderBlock(decls);
	const inserted = applyBlock(fixture, block);
	assert(
		inserted.startsWith("@layer base {\n\t:root {\n\t\t--ring: red;\n\t\t/* @generated"),
		"inserted right after --ring"
	);
	assert(inserted.endsWith("motion-tokens:end */\n\t}\n}\n"), "closing braces kept");
	assert(applyBlock(inserted, block) === inserted, "second apply is a no-op");

	const changed = renderBlock([["--ft-duration-fast", "99ms"]]);
	const replaced = applyBlock(inserted, changed);
	assert(replaced.includes("--ft-duration-fast: 99ms;"), "block replaced");
	assert(!replaced.includes("--ft-duration-micro"), "old declarations removed");
	assert(replaced.split("motion-tokens:start").length === 2, "exactly one block");
	assert(replaced !== inserted, "check-style comparison: unequal when stale");
	console.log("ok   gen-motion-tokens self-test");
}

async function main() {
	const args = process.argv.slice(2);
	if (args.includes("--self-test")) return selfTest();
	const check = args.includes("--check");
	const block = renderBlock(motionTokenDeclarations(await loadTokenValues()));
	let stale = 0;
	for (const entry of ENTRIES) {
		const path = resolve(root, entry);
		const current = readFileSync(path, "utf8");
		const next = applyBlock(current, block);
		if (next === current) {
			console.log(`ok   ${entry}`);
		} else if (check) {
			stale++;
			console.error(
				`FAIL ${entry}: the generated --ft-* block is missing or stale; run \`pnpm gen:motion-tokens\``
			);
		} else {
			writeFileSync(path, next);
			console.log(`wrote ${entry}`);
		}
	}
	if (stale) process.exit(1);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
