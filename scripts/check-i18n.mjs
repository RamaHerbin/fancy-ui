#!/usr/bin/env node
/**
 * i18n parity check.
 *
 * Verifies that the sources of truth agree:
 *   1. Locale entries in `src/lib/i18n/locales.ts` (the `locales` array)
 *   2. Message catalogs in `src/lib/i18n/messages/<code>.ts`
 *   3. The key set of every catalog vs `en.ts` (the source of truth), with
 *      plural messages (`<base>.<category>`) checked against the CLDR
 *      categories each locale needs instead of against English's two
 *   4. The pre-paint maps in `src/app.html` (supported locales, RTL locales)
 *      vs `locales.ts`
 *   5. `messages/context.json` is the current output of scripts/i18n-context.mjs
 *
 * Also requires every non-en catalog to carry `satisfies Catalog`, which is
 * what gives svelte-check compile-time key checking — this script guards the
 * guard. Exits non-zero on any drift. Quality (placeholders, markup,
 * punctuation, length, review manifests) is src/lib/i18n/catalog-quality.test.ts.
 */

import { readFileSync } from "node:fs";
import { isCurrent } from "./i18n-context.mjs";
import {
	PLURAL_CATEGORIES,
	REQUIRED_PLURALS,
	OPTIONAL_PLURALS,
	appHtmlPath,
	contextPath,
	listCatalogFiles,
	parseCatalog,
	parseLocales,
	pluralBasesOf,
	splitPluralKey,
} from "./lib/i18n-parse.mjs";

/** Keys of the object literal assigned to `var <name> = { ... }` in app.html. */
function parseAppHtmlMap(name) {
	const src = readFileSync(appHtmlPath, "utf8");
	const m = src.match(new RegExp(`var\\s+${name}\\s*=\\s*\\{([^}]*)\\}`));
	if (!m) throw new Error(`Could not locate \`var ${name} = {...}\` in src/app.html`);
	return [...m[1].matchAll(/(?:^|,)\s*(?:"([^"]+)"|([A-Za-z][\w-]*))\s*:/g)]
		.map((x) => x[1] ?? x[2])
		.sort();
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

	// 2. Key parity + plural categories + duplicates + `satisfies Catalog`
	const enParsed = parseCatalog("en");
	const bases = pluralBasesOf(enParsed.entries);
	const enKeys = enParsed.entries.map((e) => e.key);
	const enFlat = enKeys.filter((k) => !splitPluralKey(k, bases));
	const enDupes = [...new Set(enKeys.filter((k, i) => enKeys.indexOf(k) !== i))];
	if (enDupes.length) issues.push(`[en.ts] duplicate keys: ${enDupes.join(", ")}`);
	for (const base of bases) {
		for (const c of ["one", "other"]) {
			if (!enKeys.includes(`${base}.${c}`)) {
				issues.push(`[en.ts] plural message "${base}" has no ".${c}" variant`);
			}
		}
	}

	for (const code of catalogFiles) {
		if (code === "en") continue;
		const { entries, src } = parseCatalog(code);
		const keys = entries.map((e) => e.key);
		const dupes = [...new Set(keys.filter((k, i) => keys.indexOf(k) !== i))];
		if (dupes.length) issues.push(`[${code}.ts] duplicate keys: ${dupes.join(", ")}`);

		const flat = keys.filter((k) => !splitPluralKey(k, bases));
		const keyDiff = diff(enFlat, flat);
		if (keyDiff) {
			issues.push(
				`[${code}.ts vs en.ts]\n    missing: ${keyDiff.missing.join(", ") || "-"}\n    extra:   ${keyDiff.extra.join(", ") || "-"}`
			);
		}

		const required = REQUIRED_PLURALS[code];
		if (!required) {
			issues.push(
				`[${code}.ts] no CLDR plural categories pinned for this locale (scripts/lib/i18n-parse.mjs)`
			);
		} else {
			const optional = OPTIONAL_PLURALS[code] ?? [];
			for (const base of bases) {
				const have = PLURAL_CATEGORIES.filter((c) => keys.includes(`${base}.${c}`));
				const missing = required.filter((c) => !have.includes(c));
				const extra = have.filter((c) => !required.includes(c) && !optional.includes(c));
				if (missing.length || extra.length) {
					issues.push(
						`[${code}.ts plural "${base}"]\n    missing categories: ${missing.join(", ") || "-"}\n    not in ${code}: ${extra.join(", ") || "-"} (CLDR: ${required.join("/")})`
					);
				}
			}
		}

		if (!src.includes("satisfies Catalog")) {
			issues.push(`[${code}.ts] catalog does not end with \`satisfies Catalog\``);
		}
	}

	// 3. app.html pre-paint maps <-> locales.ts
	const rtlFromLocales = locales
		.filter((l) => l.dir === "rtl")
		.map((l) => l.code)
		.sort();
	const rtlDiff = diff(rtlFromLocales, parseAppHtmlMap("RTL"));
	if (rtlDiff) {
		issues.push(
			`[app.html RTL map vs locales.ts]\n    missing in app.html: ${rtlDiff.missing.join(", ") || "-"}\n    extra in app.html:   ${rtlDiff.extra.join(", ") || "-"}`
		);
	}
	const localeDiff = diff(codes, parseAppHtmlMap("LOCALES"));
	if (localeDiff) {
		issues.push(
			`[app.html LOCALES map vs locales.ts]\n    missing in app.html: ${localeDiff.missing.join(", ") || "-"}\n    extra in app.html:   ${localeDiff.extra.join(", ") || "-"}`
		);
	}

	// 4. translator context export is current
	let onDisk = "";
	try {
		onDisk = readFileSync(contextPath, "utf8");
	} catch {
		/* missing counts as stale */
	}
	if (!isCurrent(onDisk)) {
		issues.push("[messages/context.json] out of date. Run: node scripts/i18n-context.mjs");
	}

	if (issues.length === 0) {
		console.log(
			`i18n parity OK (${catalogFiles.length} locales x ${enFlat.length} messages, ${bases.size} plural).`
		);
		process.exit(0);
	}

	console.error("i18n parity check FAILED.\n");
	for (const issue of issues) console.error(`  ${issue}\n`);
	process.exit(1);
}

main();
