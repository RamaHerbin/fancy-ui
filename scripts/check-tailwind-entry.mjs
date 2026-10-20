#!/usr/bin/env node
/**
 * Compiles each package's Tailwind entry the way a consumer's build would
 * (`@import "tailwindcss"; @import "<entry>";`) and asserts the semantic
 * colour utilities the components spend actually produce rules, and that the
 * default tokens are defined. Tailwind v4 emits nothing for an undeclared
 * colour name, so a missing token mapping is silent without this check.
 */
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { compile } from "tailwindcss";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);

const ENTRIES = ["src/lib/fancy-ui/tailwind.css", "react/tailwind.css", "vue/tailwind.css"];
const CANDIDATES = [
	"bg-primary",
	"text-primary-foreground",
	"border-border",
	"bg-popover",
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
	return compiler.build(CANDIDATES);
}

function selectorFor(candidate) {
	// Tailwind escapes ":" in class selectors as "\:".
	return "." + candidate.replace(/:/g, "\\:");
}

let failed = false;
for (const entry of ENTRIES) {
	const problems = [];
	try {
		const css = await buildCss(entry);
		for (const c of CANDIDATES) {
			if (!css.includes(selectorFor(c))) problems.push(`no rule for \`${c}\``);
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
if (failed) {
	console.error("\nA Tailwind entry does not ship a usable token base (see above).");
	process.exit(1);
}
