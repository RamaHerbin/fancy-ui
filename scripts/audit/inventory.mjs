#!/usr/bin/env node
/**
 * Audit inventory: one row per registry component (slug, name, category, group,
 * status, credits, tags), read straight from src/lib/fancy-ui/registry.ts.
 *
 * Every other instrument takes its slug list from the file this writes
 * (`<out>/inventory.json`), so an audit always covers exactly the components the
 * registry declares, with the category and kind (`core` / `fancy`) the record
 * schema expects. Credits are read from the registry's `credits` blocks (the
 * source names only), never typed by hand.
 *
 * Usage:
 *   node scripts/audit/inventory.mjs [--repo <dir>] [--out <dir>] [--self-test]
 *
 *   --repo        repository root (default: the checkout this script lives in)
 *   --out         folder that receives inventory.json (default: <repo>/.audit-out/audit)
 *   --self-test   run the built-in parser cases and exit
 *
 * What this does NOT catch: a registry entry whose fields are computed rather
 * than written as string literals (the parser reads literal `key: "value"` pairs
 * at the entry's own indentation), and components that exist on disk but are
 * missing from the registry (`pnpm check:registry` owns that).
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { isMain, parseArgs, resolvePaths } from "./lib.mjs";

/**
 * Split the `registry` object of registry.ts into one text block per entry.
 * Entries are the keys at one tab of indentation: `\t"slug": {` ... `\t},`.
 *
 * @param {string} src registry.ts text
 * @returns {{ key: string, body: string }[]}
 */
export function entryBlocks(src) {
	const start = src.search(/export\s+const\s+registry\s*:/);
	if (start === -1) throw new Error("Could not locate `export const registry` in registry.ts");
	const text = src.slice(start);
	const end = text.search(/^\};/m);
	const body = end === -1 ? text : text.slice(0, end);
	const heads = [...body.matchAll(/^\t"?([A-Za-z0-9_-]+)"?: \{$/gm)];
	return heads.map((m, i) => ({
		key: m[1],
		body: body.slice(m.index, i + 1 < heads.length ? heads[i + 1].index : body.length),
	}));
}

/** Value of a literal string field written at the entry's own indentation (two tabs). */
export function field(body, name) {
	const m = body.match(
		new RegExp(`^\\t\\t${name}:\\s*(?:\\n\\t\\t\\t)?"((?:[^"\\\\]|\\\\.)*)"`, "m")
	);
	return m ? m[1] : null;
}

/** The `source: "..."` names inside the entry's `credits: [ ... ]` block. */
export function creditSources(body) {
	const cm = body.match(/^\t\tcredits:\s*\[/m);
	if (!cm) return [];
	let depth = 0;
	let j = cm.index + cm[0].length - 1;
	for (; j < body.length; j++) {
		if (body[j] === "[") depth++;
		else if (body[j] === "]") {
			depth--;
			if (depth === 0) break;
		}
	}
	return [...body.slice(cm.index, j + 1).matchAll(/\bsource:\s*"([^"]+)"/g)].map((m) => m[1]);
}

/** The literal string items of the entry's `tags: [ ... ]` array. */
export function tagList(body) {
	const m = body.match(/^\t\ttags:\s*\[([^\]]*)\]/m);
	return m ? [...m[1].matchAll(/"([^"]+)"/g)].map((x) => x[1]) : [];
}

/**
 * Build the inventory from registry.ts text.
 *
 * @param {string} src
 */
export function buildInventory(src) {
	const items = entryBlocks(src)
		.map(({ key, body }) => ({
			slug: field(body, "slug") ?? key,
			name: field(body, "name"),
			category: field(body, "category"),
			group: field(body, "group"),
			status: field(body, "status"),
			credits: creditSources(body),
			tags: tagList(body),
		}))
		.sort((a, b) => (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0));
	const byCategory = {};
	for (const c of items) (byCategory[`${c.group}/${c.category}`] ??= []).push(c.slug);
	return { count: items.length, byCategory, items };
}

export function selfTest() {
	const fixture = `import type { X } from "$lib/types.js";
export const categoryLabels = {};
export const registry: Record<string, ComponentMeta> = {
\t"alpha-card": {
\t\tname: "AlphaCard",
\t\tslug: "alpha-card",
\t\tdescription:
\t\t\t"A card",
\t\tcategory: "cards",
\t\tgroup: "fancy",
\t\tstatus: "done",
\t\tcredits: [
\t\t\t{
\t\t\t\tsource: "Some Source",
\t\t\t\turl: "https://example.com",
\t\t\t},
\t\t],
\t\ttags: ["card", "glow"],
\t\tprops: [
\t\t\t{
\t\t\t\tname: "title",
\t\t\t\ttype: "string",
\t\t\t},
\t\t],
\t},

\tbeta: {
\t\tname: "Beta",
\t\tslug: "beta",
\t\tcategory: "actions",
\t\tgroup: "core",
\t\tstatus: "done",
\t\ttags: [],
\t},
};
`;
	const inv = buildInventory(fixture);
	const a = inv.items[0];
	const ok =
		inv.count === 2 &&
		a.slug === "alpha-card" &&
		a.category === "cards" &&
		a.group === "fancy" &&
		a.credits.join() === "Some Source" &&
		a.tags.join() === "card,glow" &&
		inv.items[1].credits.length === 0 &&
		inv.byCategory["core/actions"].join() === "beta";
	if (!ok) {
		console.error("inventory self-test FAILED", JSON.stringify(inv));
		process.exit(1);
	}
	console.log("inventory self-test ok");
}

function main() {
	const { opts, flags } = parseArgs(process.argv.slice(2), ["self-test"]);
	if (flags.has("self-test")) return selfTest();
	const paths = resolvePaths(opts);
	const src = readFileSync(join(paths.src, "registry.ts"), "utf8");
	const inv = buildInventory(src);
	mkdirSync(paths.out, { recursive: true });
	writeFileSync(join(paths.out, "inventory.json"), JSON.stringify(inv, null, 1) + "\n");
	console.log(
		`inventory: ${inv.count} slugs, ${inv.items.filter((c) => c.credits.length).length} with credits -> ${join(paths.out, "inventory.json")}`
	);
	for (const [k, v] of Object.entries(inv.byCategory).sort()) console.log(`${k} ${v.length}`);
}

if (isMain(process.argv[1], import.meta.url)) main();
