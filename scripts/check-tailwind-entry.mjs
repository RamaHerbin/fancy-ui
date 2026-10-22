#!/usr/bin/env node
/**
 * Compiles each package's Tailwind entry the way a consumer's build would
 * (`@import "tailwindcss"; @import "<entry>";`) and asserts the semantic
 * colour utilities the components spend actually produce rules, and that the
 * default tokens are defined. Tailwind v4 emits nothing for an undeclared
 * colour name, so a missing token mapping is silent without this check.
 */
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { compile } from "tailwindcss";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);

// Entries can be passed as arguments (used to prove the check fails on a bare stub).
const ENTRIES = process.argv.slice(2).length
	? process.argv.slice(2)
	: ["src/lib/fancy-ui/tailwind.css", "react/tailwind.css", "vue/tailwind.css"];
const COLOURS = [
	"background",
	"foreground",
	"card",
	"card-foreground",
	"popover",
	"popover-foreground",
	"primary",
	"primary-foreground",
	"secondary",
	"secondary-foreground",
	"muted",
	"muted-foreground",
	"accent",
	"accent-foreground",
	"destructive",
	"border",
	"input",
	"ring",
];
const CANDIDATES = [
	...COLOURS.map((name) => `bg-${name}`),
	"text-primary-foreground",
	"border-border",
	"dark:bg-primary",
];

function resolveImport(id, base) {
	if (id === "tailwindcss") return require.resolve("tailwindcss/index.css", { paths: [root] });
	if (id.startsWith(".") || id.startsWith("/")) return resolve(base, id);
	return require.resolve(id, { paths: [base] });
}

async function loadStylesheet(id, base) {
	const path = resolveImport(id, base);
	return { path, base: dirname(path), content: await readFile(path, "utf8") };
}

async function buildCss(entry) {
	const abs = resolve(root, entry);
	const source = `@import "tailwindcss";\n@import ${JSON.stringify(abs)};`;
	const compiler = await compile(source, { base: root, loadStylesheet });
	return { css: compiler.build(CANDIDATES), sources: compiler.sources };
}

function selectorFor(candidate) {
	// Tailwind escapes ":" in class selectors as "\:".
	return "." + candidate.replace(/:/g, "\\:");
}

let failed = false;
for (const entry of ENTRIES) {
	const problems = [];
	try {
		const { css, sources } = await buildCss(entry);
		for (const c of CANDIDATES) {
			if (!css.includes(selectorFor(c))) problems.push(`no rule for \`${c}\``);
		}
		// The entry's custom `dark` variant must be compiled in, not Tailwind's built-in one.
		if (!css.includes(":where(.dark, .dark *)"))
			problems.push("the custom dark variant is not compiled");
		for (const source of sources) {
			if (source.negated || existsSync(source.base)) continue;
			if (!entry.startsWith("src/") && source.base.endsWith("/dist")) {
				console.log(`note ${entry}: ${source.base} is missing (package not built), skipped`);
				continue;
			}
			problems.push(`@source base does not exist on disk: ${source.base}`);
		}
		if (!/--primary:/.test(css)) problems.push("`--primary:` is not defined");
	} catch (error) {
		problems.push(`compile failed: ${error.message}`);
	}
	if (problems.length) {
		failed = true;
		console.error(`FAIL ${entry}`);
		for (const p of problems) console.error(`  - ${p}`);
	} else {
		console.log(`ok   ${entry}`);
	}
}
// The three shipped entries differ only in their header and `@source` lines.
// Everything after the last `@source` (dark variant, token mapping, defaults
// and the comments explaining them) is one body, kept byte-identical so a
// wording fix or a token change can never land in one package only.
if (process.argv.slice(2).length === 0) {
	const bodyOf = async (entry) => {
		const text = await readFile(resolve(root, entry), "utf8");
		const lines = text.split("\n");
		let last = -1;
		lines.forEach((line, i) => {
			if (/^@source\s/.test(line)) last = i;
		});
		return last === -1
			? null
			: lines
					.slice(last + 1)
					.join("\n")
					.trim();
	};
	const [reference, ...others] = ENTRIES;
	const expected = await bodyOf(reference);
	for (const entry of others) {
		const body = await bodyOf(entry);
		if (body === null || expected === null) {
			failed = true;
			console.error(`FAIL ${entry}: no @source line to split the header from the body`);
			continue;
		}
		if (body !== expected) {
			failed = true;
			const a = expected.split("\n");
			const b = body.split("\n");
			const at = a.findIndex((line, i) => line !== b[i]);
			console.error(`FAIL ${entry}: body differs from ${reference} after its @source lines`);
			console.error(`  first difference at body line ${at + 1}:`);
			console.error(`    ${reference}: ${JSON.stringify(a[at] ?? "<end>")}`);
			console.error(`    ${entry}: ${JSON.stringify(b[at] ?? "<end>")}`);
		} else {
			console.log(`ok   ${entry} body matches ${reference}`);
		}
	}
}

if (failed) {
	console.error("\nA Tailwind entry is unusable or has drifted from the others (see above).");
	process.exit(1);
}
