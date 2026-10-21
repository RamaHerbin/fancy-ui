#!/usr/bin/env node
/**
 * Write a locale's review manifest.
 *
 *   node scripts/i18n-manifest.mjs <code>            write messages/reviewed/<code>.json
 *   node scripts/i18n-manifest.mjs <code> --check    verify it, change nothing
 *
 * The manifest is `{ "<key>": sha1(English source) }` for every key the
 * catalog has. A reviewer runs it once the whole catalog has been read against
 * the current English: from then on the quality test fails when English changes
 * under a key (stale hash) or a key is added without being reviewed. A plural
 * group hashes every English variant together, so editing any of them marks the
 * whole group stale.
 *
 * Refuses to write while the catalog still carries the "machine-translated
 * draft" header: remove it first, that is the reviewer's signature.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import {
	expectedManifest,
	hasDraftHeader,
	listCatalogFiles,
	manifestPath,
	parseCatalog,
	readManifest,
} from "./lib/i18n-parse.mjs";

const args = process.argv.slice(2);
const code = args.find((a) => !a.startsWith("--"));
const check = args.includes("--check");

if (!code) {
	console.error("usage: node scripts/i18n-manifest.mjs <locale-code> [--check]");
	process.exit(2);
}
if (code === "en" || !listCatalogFiles().includes(code)) {
	console.error(
		`"${code}" is not a translated catalog (known: ${listCatalogFiles()
			.filter((c) => c !== "en")
			.join(", ")})`
	);
	process.exit(2);
}

const en = parseCatalog("en").entries;
const cat = parseCatalog(code);
const expected = expectedManifest(code, en, cat.entries);

if (check) {
	const current = readManifest(code);
	if (current === null) {
		console.error(`messages/reviewed/${code}.json does not exist.`);
		process.exit(1);
	}
	const missing = Object.keys(expected).filter((k) => !(k in current));
	const stale = Object.keys(expected).filter((k) => k in current && current[k] !== expected[k]);
	const extra = Object.keys(current).filter((k) => !(k in expected));
	if (missing.length || stale.length || extra.length || hasDraftHeader(cat.header)) {
		if (hasDraftHeader(cat.header)) console.error("catalog still has the draft header");
		if (missing.length) console.error(`not reviewed: ${missing.join(", ")}`);
		if (stale.length) console.error(`English changed: ${stale.join(", ")}`);
		if (extra.length) console.error(`no longer in the catalog: ${extra.join(", ")}`);
		process.exit(1);
	}
	console.log(`${code}: manifest complete (${Object.keys(expected).length} keys).`);
	process.exit(0);
}

if (hasDraftHeader(cat.header)) {
	console.error(
		`${code}.ts still carries the "machine-translated draft" header. Remove it once you have reviewed the catalog, then run this again.`
	);
	process.exit(1);
}

const previous = readManifest(code);
if (previous) {
	const changed = Object.keys(expected).filter((k) => previous[k] !== expected[k]);
	if (changed.length) {
		console.log(
			`Marking ${changed.length} key(s) as reviewed that were new or stale. Make sure you re-read them:\n  ${changed.join("\n  ")}`
		);
	}
}

const file = manifestPath(code);
mkdirSync(dirname(file), { recursive: true });
writeFileSync(file, JSON.stringify(expected, null, "\t") + "\n");
console.log(`Wrote ${file} (${Object.keys(expected).length} keys).`);
