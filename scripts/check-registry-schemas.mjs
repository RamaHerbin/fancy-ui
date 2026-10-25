#!/usr/bin/env node
/**
 * Source registry schema gate.
 *
 * Validates the prerendered copy-source registries (`/r`, `/r/svelte`,
 * `/r/vue`, built by `src/lib/server/registry/`) against the JSON Schemas the
 * three CLIs publish, vendored under `scripts/registry-schemas/` so the check
 * runs offline. `scripts/check-registry-items.mjs` checks what those schemas
 * cannot (import closure, aliases, counts); this script checks the format
 * itself: every index and every item file, against the schema its `$schema`
 * URL names.
 *
 * Vendored copies (byte-identical to the published files):
 *
 *   file                       source URL                                          fetched
 *   react-registry.json        https://ui.shadcn.com/schema/registry.json          2026-10-22
 *   react-registry-item.json   https://ui.shadcn.com/schema/registry-item.json     2026-10-22
 *   svelte-registry.json       https://shadcn-svelte.com/schema/registry.json      2026-10-22
 *   svelte-registry-item.json  https://shadcn-svelte.com/schema/registry-item.json 2026-10-22
 *   vue-registry.json          https://shadcn-vue.com/schema/registry.json         2026-10-22
 *   vue-registry-item.json     https://shadcn-vue.com/schema/registry-item.json    2026-10-22
 *
 * The React and Vue schemas are draft-07; the Svelte ones are draft 2020-12,
 * hence two validator instances. The Vue index schema references the React
 * item schema by URL (that is how it is published), so the React item schema
 * is registered in the draft-07 instance under its URL.
 *
 * One named allowance (Svelte only, `STRIPPED_BY_CLI`): the Svelte schemas
 * are exported from the CLI's zod schemas in output mode, which closes every
 * object (`additionalProperties: false`), while the CLI itself parses with
 * plain zod objects that drop unknown keys. Three keys we emit fall in that
 * gap and are removed before validation, exactly as the CLI drops them:
 * `files[].path` on items (the repository path, kept for review and for
 * `check-registry-items.mjs`), `categories` and `docs` on index entries. Any
 * other unknown key still fails. Checked against shadcn-svelte 1.7.0's own
 * `registryItemSchema` / `registrySchema` on 2026-10-22: every item parses,
 * `path` is the only key it drops.
 *
 * Usage:
 *   node scripts/check-registry-schemas.mjs [--self-test] [--stack react|svelte|vue] [--dir <path>]
 *   node scripts/check-registry-schemas.mjs --refresh-schemas
 *
 *   --self-test        validate in-memory fixtures (one good, several bad) and exit
 *   --stack <id>       which registry to check (default: all three)
 *   --dir <path>       read that stack's JSON from <path> (needs --stack)
 *   --refresh-schemas  re-download the six schemas (network), then update the
 *                      fetch dates above by hand
 */

import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import Ajv from "ajv";
import Ajv2020 from "ajv/dist/2020.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");
const SCHEMA_DIR = join(__dirname, "registry-schemas");
const PAGES_R = join(repoRoot, ".svelte-kit", "output", "prerendered", "pages", "r");

/** Vendored file → published URL. */
const SOURCES = {
	"react-registry.json": "https://ui.shadcn.com/schema/registry.json",
	"react-registry-item.json": "https://ui.shadcn.com/schema/registry-item.json",
	"svelte-registry.json": "https://shadcn-svelte.com/schema/registry.json",
	"svelte-registry-item.json": "https://shadcn-svelte.com/schema/registry-item.json",
	"vue-registry.json": "https://shadcn-vue.com/schema/registry.json",
	"vue-registry-item.json": "https://shadcn-vue.com/schema/registry-item.json",
};

const STACKS = {
	react: {
		dir: PAGES_R,
		draft: "07",
		index: "react-registry.json",
		item: "react-registry-item.json",
	},
	svelte: {
		dir: join(PAGES_R, "svelte"),
		draft: "2020",
		index: "svelte-registry.json",
		item: "svelte-registry-item.json",
	},
	vue: {
		dir: join(PAGES_R, "vue"),
		draft: "07",
		index: "vue-registry.json",
		item: "vue-registry-item.json",
	},
};

function readJson(path) {
	return JSON.parse(readFileSync(path, "utf8"));
}

/**
 * A vendored schema, minus its `$schema` keyword: the draft is chosen by the
 * validator instance, and the published files spell the draft-07 meta-schema
 * with "https", which the validator only knows as "http".
 */
function loadSchema(file) {
	const { $schema: _draft, ...body } = readJson(join(SCHEMA_DIR, file));
	return { ...body, $id: SOURCES[file] };
}

/** One compiled validator pair per stack. */
function validators() {
	const opts = { allErrors: true, strict: false };
	const ajv07 = new Ajv(opts);
	const ajv2020 = new Ajv2020(opts);
	// Referenced by URL from the Vue index schema.
	ajv07.addSchema(loadSchema("react-registry-item.json"));
	const out = {};
	for (const [id, stack] of Object.entries(STACKS)) {
		const ajv = stack.draft === "2020" ? ajv2020 : ajv07;
		const compile = (file) => {
			const url = SOURCES[file];
			return ajv.getSchema(url) ?? ajv.compile(loadSchema(file));
		};
		out[id] = { index: compile(stack.index), item: compile(stack.item) };
	}
	return out;
}

/** Keys the Svelte CLI drops on parse but its published (closed) schemas reject; see the header. */
const STRIPPED_BY_CLI = {
	svelte: { itemFile: ["path"], indexEntry: ["categories", "docs"] },
};

function omit(obj, keys) {
	return Object.fromEntries(Object.entries(obj).filter(([k]) => !keys.includes(k)));
}

/** The snapshot as the stack's CLI reads it. */
function asParsed(stackId, snap) {
	const drop = STRIPPED_BY_CLI[stackId];
	if (!drop) return snap;
	const items = {};
	for (const [name, item] of Object.entries(snap.items)) {
		items[name] = Array.isArray(item?.files)
			? { ...item, files: item.files.map((f) => omit(f, drop.itemFile)) }
			: item;
	}
	const index = Array.isArray(snap.index?.items)
		? { ...snap.index, items: snap.index.items.map((e) => omit(e, drop.indexEntry)) }
		: snap.index;
	return { index, items };
}

function describe(errors) {
	return (errors ?? [])
		.slice(0, 5)
		.map(
			(e) =>
				`${e.instancePath || "/"} ${e.message}${e.params ? ` ${JSON.stringify(e.params)}` : ""}`
		)
		.join("; ");
}

/** Problems of one stack's snapshot `{ index, items }`. */
export function schemaProblems(v, stackId, raw) {
	const snap = asParsed(stackId, raw);
	const problems = [];
	if (!v.index(snap.index)) problems.push(`registry.json: ${describe(v.index.errors)}`);
	for (const [name, item] of Object.entries(snap.items)) {
		if (!v.item(item)) problems.push(`${name}.json: ${describe(v.item.errors)}`);
	}
	return problems;
}

function loadSnapshot(dir) {
	const indexPath = join(dir, "registry.json");
	if (!existsSync(indexPath)) {
		console.error(`❌ ${indexPath} not found — run \`pnpm build\` first (or pass --dir).`);
		process.exit(1);
	}
	const items = {};
	for (const name of readdirSync(dir)) {
		if (!name.endsWith(".json") || name === "registry.json") continue;
		items[name.slice(0, -".json".length)] = readJson(join(dir, name));
	}
	return { index: readJson(indexPath), items };
}

// --- self-test ---------------------------------------------------------------

function selfTest() {
	const all = validators();
	const fixture = (stack) => {
		const file =
			stack === "vue"
				? {
						path: "src/components/ui/fancy/components/b/B.vue",
						content: "<template/>",
						type: "registry:ui",
					}
				: { path: "x/B.tsx", content: "export {}", type: "registry:ui", target: "fancy/B.tsx" };
		const deps = { registryDependencies: ["https://example.test/r/utils.json"] };
		const item = {
			$schema: "https://example.test/item.json",
			name: "b",
			type: "registry:ui",
			title: "B",
			description: "A fixture.",
			author: "fixture <https://example.test>",
			categories: ["core"],
			dependencies: ["clsx@^2.1.1"],
			...deps,
			docs: "Installs clsx as a dependency.",
			meta: { license: "MIT", package: "fixture", version: "1.0.0" },
			files: [file],
		};
		const { $schema: _s, ...entry } = item;
		const index = {
			$schema: "https://example.test/registry.json",
			name: "fixture",
			homepage: "https://example.test",
			items: [{ ...entry, files: entry.files.map(({ content: _c, ...f }) => f) }],
		};
		return { index, items: { b: item } };
	};
	const cases = [
		["clean fixture passes", () => {}, false],
		["item type not a registry type", (s) => (s.items.b.type = "component"), true],
		["file content not a string", (s) => (s.items.b.files[0].content = 42), true],
		["dependencies not an array", (s) => (s.items.b.dependencies = "clsx"), true],
		["item without name", (s) => delete s.items.b.name, true],
		["index without items", (s) => delete s.index.items, true],
		["unknown key on an item", (s) => (s.items.b.colour = "red"), (stack) => stack === "svelte"],
		["file without type", (s) => delete s.items.b.files[0].type, true],
	];
	let failed = 0;
	let total = 0;
	for (const stack of Object.keys(STACKS)) {
		for (const [label, mutate, expectFail] of cases) {
			total++;
			const snap = fixture(stack);
			mutate(snap);
			const problems = schemaProblems(all[stack], stack, snap);
			const expected = typeof expectFail === "function" ? expectFail(stack) : expectFail;
			if (problems.length > 0 !== expected) {
				failed++;
				console.error(`  FAIL  ${stack}: ${label}\n        got: ${JSON.stringify(problems)}`);
			}
		}
	}
	if (failed) {
		console.error(`Registry schema self-test FAILED (${failed}/${total}).`);
		process.exit(1);
	}
	console.log(`Registry schema self-test OK (${total} cases over 3 stacks).`);
}

// --- refresh -----------------------------------------------------------------

async function refresh() {
	for (const [file, url] of Object.entries(SOURCES)) {
		const res = await fetch(url);
		if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
		writeFileSync(join(SCHEMA_DIR, file), await res.text());
		console.log(`↓ ${file} ← ${url}`);
	}
	console.log("Schemas refreshed: update the fetch dates in this script's header.");
}

// --- main --------------------------------------------------------------------

async function main() {
	const args = process.argv.slice(2);
	if (args.includes("--refresh-schemas")) return refresh();
	if (args.includes("--self-test")) return selfTest();
	const st = args.indexOf("--stack");
	const ids = st >= 0 ? [args[st + 1]] : Object.keys(STACKS);
	for (const id of ids) {
		if (!Object.hasOwn(STACKS, id ?? "")) {
			console.error(`❌ unknown --stack ${JSON.stringify(id)} (react | svelte | vue)`);
			process.exit(1);
		}
	}
	const at = args.indexOf("--dir");
	if (at >= 0 && st < 0) {
		console.error("❌ --dir needs --stack");
		process.exit(1);
	}
	const all = validators();
	let bad = 0;
	for (const id of ids) {
		const dir = at >= 0 && args[at + 1] ? resolve(args[at + 1]) : STACKS[id].dir;
		const snap = loadSnapshot(dir);
		const problems = schemaProblems(all[id], id, snap);
		if (problems.length) {
			bad++;
			for (const p of problems) console.error(`❌ ${id}: ${p}`);
			console.error(`\n${problems.length} schema problem(s) in ${dir}.`);
		} else {
			console.log(
				`✅ ${id}: registry.json + ${Object.keys(snap.items).length} items valid against the vendored ${STACKS[id].index} / ${STACKS[id].item}.`
			);
		}
	}
	if (bad) process.exit(1);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	main().catch((e) => {
		console.error(e);
		process.exit(1);
	});
}
