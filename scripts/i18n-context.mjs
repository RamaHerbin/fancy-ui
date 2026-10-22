#!/usr/bin/env node
/**
 * Export translator context for the docs UI strings.
 *
 * Reads the English catalog (values and `/** @context ... *\/` comments) and the
 * application sources, and writes `src/lib/i18n/messages/context.json`:
 *
 *   { "<key>": { en, context, maxLen, render } }
 *
 * - en      the English text
 * - context the `@context` comment above the key (null when it has none)
 * - maxLen  length budget for a short label (see scripts/lib/i18n-budget.mjs), or null
 * - render  first `file:line` where the key (or its dynamic prefix) is used, or null
 *
 * `node scripts/i18n-context.mjs`          regenerate the file
 * `node scripts/i18n-context.mjs --check`  exit 1 when it is out of date
 */

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { budgetFor } from "./lib/i18n-budget.mjs";
import {
	contextPath,
	findUsage,
	parseCatalog,
	pluralBasesOf,
	scanKeyUsage,
	splitPluralKey,
} from "./lib/i18n-parse.mjs";

/** Build the context map. Keys keep the order of the English catalog. */
export function buildContext() {
	const { entries } = parseCatalog("en");
	const bases = pluralBasesOf(entries);
	const usage = scanKeyUsage();
	const byKey = new Map(entries.map((e) => [e.key, e]));
	const out = {};
	for (const { key, value, context } of entries) {
		const plural = splitPluralKey(key, bases);
		// A plural variant without its own comment shares the group's.
		const inherited = plural
			? (byKey.get(`${plural.base}.other`)?.context ?? byKey.get(`${plural.base}.one`)?.context)
			: null;
		out[key] = {
			en: value,
			context: context ?? inherited ?? null,
			maxLen: plural ? null : budgetFor(key, value),
			render: findUsage(key, usage, bases),
		};
	}
	return out;
}

export const serialize = (ctx) => JSON.stringify(ctx, null, "\t") + "\n";

/**
 * The part of the export that must match en.ts. `render` points into
 * application sources and shifts whenever an unrelated edit moves a line, so
 * the freshness checks leave it out (regenerate to refresh it).
 */
export function withoutRender(ctx) {
	return Object.fromEntries(
		Object.entries(ctx).map(([key, { render: _render, ...rest }]) => [key, rest])
	);
}

/** True when the file on disk agrees with en.ts (ignoring `render`). */
export function isCurrent(onDiskText) {
	try {
		return (
			JSON.stringify(withoutRender(JSON.parse(onDiskText))) ===
			JSON.stringify(withoutRender(buildContext()))
		);
	} catch {
		return false;
	}
}

function main() {
	const next = serialize(buildContext());
	if (process.argv.includes("--check")) {
		let current = "";
		try {
			current = readFileSync(contextPath, "utf8");
		} catch {
			/* missing counts as stale */
		}
		if (!isCurrent(current)) {
			console.error("messages/context.json is out of date. Run: node scripts/i18n-context.mjs");
			process.exit(1);
		}
		console.log("messages/context.json is up to date.");
		return;
	}
	writeFileSync(contextPath, next);
	console.log(`Wrote ${contextPath} (${Object.keys(JSON.parse(next)).length} keys).`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
