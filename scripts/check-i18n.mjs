#!/usr/bin/env node
/**
 * i18n parity check.
 *
 * Verifies that four sources of truth agree:
 *   1. Locale entries in `src/lib/i18n/locales.ts` (the `locales` array)
 *   2. Message catalogs in `src/lib/i18n/messages/<code>.ts`
 *   3. The key set of every catalog vs `en.ts` (the source of truth)
 *   4. The pre-paint RTL map in `src/app.html` vs `dir: "rtl"` locales
 *
 * Also requires every non-en catalog to carry `satisfies Catalog`, which is
 * what gives svelte-check compile-time key checking — this script guards the
 * guard. Exits non-zero on any drift.
 */

import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");
const localesPath = join(repoRoot, "src", "lib", "i18n", "locales.ts");
const messagesDir = join(repoRoot, "src", "lib", "i18n", "messages");
const appHtmlPath = join(repoRoot, "src", "app.html");

function parseLocales() {
	const src = readFileSync(localesPath, "utf8");
	const bodyMatch = src.match(/export\s+const\s+locales[^=]*=\s*\[([\s\S]*?)^\];/m);
	if (!bodyMatch) throw new Error("Could not locate `export const locales` in locales.ts");
	const entries = [];
	const re = /\{\s*code:\s*"([^"]+)"[^}]*?dir:\s*"(ltr|rtl)"[^}]*\}/g;
	let m;
	while ((m = re.exec(bodyMatch[1])) !== null) {
		entries.push({ code: m[1], dir: m[2] });
	}
	if (entries.length === 0) throw new Error("Parsed zero locale entries from locales.ts");
	return entries;
}

function listCatalogFiles() {
	return readdirSync(messagesDir)
		.filter((name) => name.endsWith(".ts") && name !== "index.ts")
		.map((name) => name.replace(/\.ts$/, ""))
		.sort();
}

function parseCatalogKeys(code) {
	const src = readFileSync(join(messagesDir, `${code}.ts`), "utf8");
	const keys = [];
	const re = /^[\t ]*"([^"]+)"\s*:/gm;
	let m;
	while ((m = re.exec(src)) !== null) keys.push(m[1]);
	return { keys, src };
}

function parseAppHtmlRtl() {
	const src = readFileSync(appHtmlPath, "utf8");
	const mapMatch = src.match(/var\s+RTL\s*=\s*\{([^}]*)\}/);
	if (!mapMatch) throw new Error("Could not locate `var RTL = {...}` in src/app.html");
	return [...mapMatch[1].matchAll(/([a-zA-Z-]+)\s*:/g)].map((m) => m[1]).sort();
}

function diff(expected, actual) {
	const expSet = new Set(expected);
	const actSet = new Set(actual);
	const missing = expected.filter((x) => !actSet.has(x));
	const extra = actual.filter((x) => !expSet.has(x));
	return missing.length || extra.length ? { missing, extra } : null;
}

function main() {
	const locales = parseLocales();
	const codes = locales.map((l) => l.code).sort();
	const catalogFiles = listCatalogFiles();
	const issues = [];

	// 1. locales.ts <-> catalog files
	const fileDiff = diff(codes, catalogFiles);
	if (fileDiff) {
		issues.push(
			`[locales.ts vs messages/*.ts]\n    missing catalog: ${fileDiff.missing.join(", ") || "-"}\n    orphan catalog:  ${fileDiff.extra.join(", ") || "-"}`
		);
	}

	// 2. Key parity + duplicates + `satisfies Catalog`
	const { keys: enKeys } = parseCatalogKeys("en");
	for (const code of catalogFiles) {
		const { keys, src } = parseCatalogKeys(code);
		const dupes = [...new Set(keys.filter((k, i) => keys.indexOf(k) !== i))];
		if (dupes.length) issues.push(`[${code}.ts] duplicate keys: ${dupes.join(", ")}`);
		if (code === "en") continue;
		const keyDiff = diff(enKeys, keys);
		if (keyDiff) {
			issues.push(
				`[${code}.ts vs en.ts]\n    missing: ${keyDiff.missing.join(", ") || "-"}\n    extra:   ${keyDiff.extra.join(", ") || "-"}`
			);
		}
		if (!src.includes("satisfies Catalog")) {
			issues.push(`[${code}.ts] catalog does not end with \`satisfies Catalog\``);
		}
	}

	// 3. app.html pre-paint RTL map <-> locales.ts dir fields
	const rtlFromLocales = locales
		.filter((l) => l.dir === "rtl")
		.map((l) => l.code)
		.sort();
	const rtlFromHtml = parseAppHtmlRtl();
	const rtlDiff = diff(rtlFromLocales, rtlFromHtml);
	if (rtlDiff) {
		issues.push(
			`[app.html RTL map vs locales.ts]\n    missing in app.html: ${rtlDiff.missing.join(", ") || "-"}\n    extra in app.html:   ${rtlDiff.extra.join(", ") || "-"}`
		);
	}

	if (issues.length === 0) {
		console.log(`i18n parity OK (${catalogFiles.length} locales x ${enKeys.length} keys).`);
		process.exit(0);
	}

	console.error("i18n parity check FAILED.\n");
	for (const issue of issues) console.error(`  ${issue}\n`);
	process.exit(1);
}

main();
