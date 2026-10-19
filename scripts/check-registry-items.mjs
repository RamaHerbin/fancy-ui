#!/usr/bin/env node
/**
 * Source registry gate.
 *
 * The docs site prerenders `/r/registry.json` (the index) and one
 * `/r/<name>.json` per item, built from the React package sources by
 * `src/lib/server/registry/`. A consumer copies those files into their own
 * project, so whatever ships there is code we hand over for good. This script
 * reads the prerendered output and refuses it when:
 *
 *   - the index and the item files on disk disagree, or the index carries
 *     file `content`, or an index entry differs from its item;
 *   - a required field is missing, or a `$schema` value is not the one in
 *     `src/lib/server/registry/constants.ts`;
 *   - a `registryDependencies` entry is not `<base>/<existing-name>.json`;
 *   - a relative import inside an item resolves to no file of the item or of
 *     the items it depends on (transitively);
 *   - a test file, a test harness, a README or the Web Audio mock got in;
 *   - content mentions site-only code (`src/lib/server`, `src/lib/builder`)
 *     or a credits URL from `src/lib/fancy-ui/registry.ts`;
 *   - a third-party product name appears anywhere but the `$schema` values;
 *   - `dependencies` names a package that `react/package.json` does not
 *     depend on;
 *   - the item count is not 151 (145 components + 6 shared modules).
 *
 * Usage:
 *   node scripts/check-registry-items.mjs [--self-test] [--dir <path>]
 *
 *   --self-test   run the built-in detector cases on in-memory fixtures and exit
 *   --dir <path>  read the JSON files from <path> instead of
 *                 .svelte-kit/output/prerendered/pages/r
 */

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, posix, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");
const DEFAULT_DIR = join(repoRoot, ".svelte-kit", "output", "prerendered", "pages", "r");
const EXPECTED_COUNT = 151;
const TARGET_PREFIX = "@ui/fancy/";
const PATH_PREFIX = "react/src/";

/** Product names that must never reach a consumer's codebase. */
/** Third-party product names, each with a sample the self-test plants. */
const BRAND_WORDS = [
	[/shadcn/i, "shadcn"],
	[/aceternity/i, "aceternity"],
	[/magic[\s_-]?ui/i, "magic ui"],
	[/\binspira\b/i, "inspira"],
	[/daisy/i, "daisy"],
	[/vengen?ce[\s_-]?ui/i, "vengence ui"],
	[/pixel[\s_-]?perfect/i, "pixel perfect"],
	[/assistant[\s_-]?ui/i, "assistant ui"],
	[/codrops|tympanus/i, "codrops"],
	[/\b21st\b/i, "21st"],
	[/hover\.dev/i, "hover.dev"],
	[/uiverse/i, "uiverse"],
];

/** Files that belong to the package's own test rig, never to an item. */
const EXCLUDED = [/\.test\.tsx?$/, /Harness\.tsx$/, /(^|\/)README\.md$/, /web-audio-mock/];

const SITE_ONLY = [/src\/lib\/server/, /src\/lib\/builder/];

// --- configuration read from the repo ----------------------------------------

function read(path) {
	return readFileSync(path, "utf8");
}

function siteUrl() {
	const m = read(join(repoRoot, "src", "lib", "site.ts")).match(
		/export const SITE_URL\s*=\s*"([^"]+)"/
	);
	if (!m) throw new Error("SITE_URL not found in src/lib/site.ts");
	return m[1];
}

function schemaUrls() {
	const path = join(repoRoot, "src", "lib", "server", "registry", "constants.ts");
	const src = read(path);
	const pick = (name) => {
		const m = src.match(new RegExp(`export const ${name}\\s*=\\s*"([^"]+)"`));
		if (!m) throw new Error(`${name} not found in ${path}`);
		return m[1];
	};
	return { index: pick("REGISTRY_SCHEMA_URL"), item: pick("REGISTRY_ITEM_SCHEMA_URL") };
}

/** Every `url` inside a `credits: [...]` block of the component registry. */
function creditUrls() {
	const src = read(join(repoRoot, "src", "lib", "fancy-ui", "registry.ts"));
	const urls = new Set();
	for (const m of src.matchAll(/credits:\s*\[/g)) {
		let depth = 0;
		let end = m.index + m[0].length - 1;
		for (; end < src.length; end++) {
			if (src[end] === "[") depth++;
			else if (src[end] === "]" && --depth === 0) break;
		}
		for (const u of src.slice(m.index, end).matchAll(/url:\s*"([^"]+)"/g)) urls.add(u[1]);
	}
	return urls;
}

function reactDependencies() {
	const pkg = JSON.parse(read(join(repoRoot, "react", "package.json")));
	return new Set(Object.keys(pkg.dependencies ?? {}));
}

/** Runtime and dev dependencies together: what `devDependencies` may name. */
function reactAllDependencies() {
	const pkg = JSON.parse(read(join(repoRoot, "react", "package.json")));
	return new Set([
		...Object.keys(pkg.dependencies ?? {}),
		...Object.keys(pkg.devDependencies ?? {}),
	]);
}

/**
 * Credit URLs that may appear in shipped source: documentation of an npm
 * package the item itself installs. A technical reference, not a design credit.
 */
/**
 * Credit URLs one item may keep: an "inspired by" note pointing at the demo
 * page of the npm package that very item installs. Keyed by URL → item name.
 */
const CREDIT_URL_ALLOWED = new Map([
	["https://chenglou.me/pretext/editorial-engine/", "editorial-engine"],
]);
/** Credit hosts that also host ordinary code and docs; matched by full URL only. */
const CREDIT_HOSTS_IGNORED = new Set(["github.com", "chenglou.me"]);

/** Hostnames of every credit URL, minus the ones that host ordinary code. */
function creditHosts(urls) {
	const hosts = new Set();
	for (const url of urls) {
		try {
			const host = new URL(url).hostname.replace(/^www\./, "");
			if (!CREDIT_HOSTS_IGNORED.has(host)) hosts.add(host);
		} catch {
			/* not a URL */
		}
	}
	return hosts;
}

// --- detectors ---------------------------------------------------------------

/**
 * Relative specifiers of a module: static/dynamic imports, re-exports,
 * side-effect imports. Statements are matched at the start of a line (the
 * shape the formatter guarantees), so a doc comment that quotes an import
 * behind `//` or `*` never counts — same rule as the generator's graph.ts.
 */
export function relativeSpecifiers(code) {
	const out = new Set();
	const patterns = [
		/^[\t ]*(?:import|export)\b[^;]*?\bfrom\s*["'](\.{1,2}\/[^"']+)["']/gm,
		/^[\t ]*import\s*["'](\.{1,2}\/[^"']+)["']/gm,
		/\bimport\s*\(\s*["'](\.{1,2}\/[^"']+)["']\s*\)/g,
	];
	for (const re of patterns) for (const m of code.matchAll(re)) out.add(m[1]);
	return [...out];
}

/** Candidate targets a relative specifier may land on, most literal first. */
function candidates(fromTarget, spec) {
	const base = posix.normalize(posix.join(posix.dirname(fromTarget), spec));
	const stem = base.replace(/\.(m?js|jsx)$/, "");
	return [
		base,
		`${stem}.ts`,
		`${stem}.tsx`,
		`${base}.ts`,
		`${base}.tsx`,
		`${base}/index.ts`,
		`${base}/index.tsx`,
	];
}

function canonical(value) {
	if (Array.isArray(value)) return value.map(canonical);
	if (value && typeof value === "object") {
		return Object.fromEntries(
			Object.keys(value)
				.sort()
				.map((k) => [k, canonical(value[k])])
		);
	}
	return value;
}

/**
 * All problems found in a registry snapshot.
 *
 * @param {object} snap
 * @param {any} snap.index              parsed registry.json
 * @param {Record<string, any>} snap.items   file stem → parsed item JSON
 * @param {string} snap.base            registry base URL, no trailing slash
 * @param {{ index: string, item: string }} snap.schemas
 * @param {Set<string>} snap.creditUrls
 * @param {Set<string>} snap.reactDeps
 * @param {Set<string>} snap.reactAllDeps
 * @param {number} snap.expectedCount
 * @returns {string[]}
 */
export function findProblems(snap) {
	const problems = [];
	const { index, items, base, schemas } = snap;

	// Index shape.
	if (!index || typeof index !== "object") return ["registry.json: not an object"];
	if (index.$schema !== schemas.index) {
		problems.push(`registry.json: $schema is ${JSON.stringify(index.$schema)}`);
	}
	for (const field of ["name", "homepage"]) {
		if (typeof index[field] !== "string" || !index[field]) {
			problems.push(`registry.json: missing ${field}`);
		}
	}
	const entries = Array.isArray(index.items) ? index.items : [];
	if (!Array.isArray(index.items)) problems.push("registry.json: items is not an array");

	// Index vs disk.
	const indexNames = new Set(entries.map((e) => e?.name));
	const diskNames = new Set(Object.keys(items));
	if (indexNames.size !== entries.length) problems.push("registry.json: duplicate item names");
	for (const n of indexNames) if (!diskNames.has(n)) problems.push(`${n}: in index, no file`);
	for (const n of diskNames) if (!indexNames.has(n)) problems.push(`${n}: file, not in index`);
	if (diskNames.size !== snap.expectedCount) {
		problems.push(`count: ${diskNames.size} item files, expected ${snap.expectedCount}`);
	}

	for (const entry of entries) {
		for (const file of entry?.files ?? []) {
			if ("content" in file) problems.push(`registry.json: ${entry.name} carries file content`);
		}
		const item = items[entry?.name];
		if (!item) continue;
		const { $schema: _s, ...rest } = item;
		const stripped = { ...rest, files: (rest.files ?? []).map(({ content: _c, ...f }) => f) };
		if (JSON.stringify(canonical(stripped)) !== JSON.stringify(canonical(entry))) {
			problems.push(`${entry.name}: index entry differs from ${entry.name}.json`);
		}
	}

	// Items.
	const depPattern = new RegExp(
		`^${base.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/([a-z0-9][a-z0-9-]*)\\.json$`
	);
	const depNames = new Map();
	for (const [stem, item] of Object.entries(items)) {
		const where = `${stem}.json`;
		if (item.$schema !== schemas.item) {
			problems.push(`${where}: $schema is ${JSON.stringify(item.$schema)}`);
		}
		for (const field of ["name", "type", "title", "description"]) {
			if (typeof item[field] !== "string" || !item[field]) {
				problems.push(`${where}: missing ${field}`);
			}
		}
		if (item.name !== stem) problems.push(`${where}: name is ${JSON.stringify(item.name)}`);
		if (!Array.isArray(item.files) || item.files.length === 0) {
			problems.push(`${where}: no files`);
		}
		for (const file of item.files ?? []) {
			for (const field of ["path", "content", "type", "target"]) {
				if (typeof file[field] !== "string" || (field !== "content" && !file[field])) {
					problems.push(`${where}: file ${file.path ?? "?"} missing ${field}`);
				}
			}
			if (typeof file.target === "string" && !file.target.startsWith(TARGET_PREFIX)) {
				problems.push(`${where}: target ${file.target} outside ${TARGET_PREFIX}`);
			}
			if (
				typeof file.target === "string" &&
				typeof file.path === "string" &&
				file.path !== PATH_PREFIX + file.target.slice(TARGET_PREFIX.length)
			) {
				problems.push(`${where}: path ${file.path} does not match target ${file.target}`);
			}
			if (EXCLUDED.some((re) => re.test(file.path ?? "") || re.test(file.target ?? ""))) {
				problems.push(`${where}: excluded file shipped: ${file.path}`);
			}
			const content = typeof file.content === "string" ? file.content : "";
			for (const re of SITE_ONLY) {
				if (re.test(content)) problems.push(`${where}: ${file.path} mentions ${re.source}`);
			}
			for (const url of snap.creditUrls) {
				if (CREDIT_URL_ALLOWED.get(url) === stem) continue;
				if (content.includes(url)) problems.push(`${where}: ${file.path} mentions credit ${url}`);
			}
			for (const host of creditHosts(snap.creditUrls)) {
				if (content.includes(host))
					problems.push(`${where}: ${file.path} mentions credit host ${host}`);
			}
			for (const spec of relativeSpecifiers(content)) {
				if (/\.(m?js|jsx)$/.test(spec)) {
					problems.push(
						`${where}: ${file.path} imports ${spec} (".js" specifiers do not resolve in Next)`
					);
				}
			}
		}

		const { $schema: _schema, ...branded } = item;
		const text = JSON.stringify(branded);
		for (const [re] of BRAND_WORDS) {
			if (re.test(text)) problems.push(`${where}: product name matching ${re.source}`);
		}

		for (const dep of item.dependencies ?? []) {
			if (!snap.reactDeps.has(dep)) {
				problems.push(`${where}: dependency ${dep} is not a react/package.json dependency`);
			}
		}
		for (const dep of item.devDependencies ?? []) {
			if (!snap.reactAllDeps.has(dep)) {
				problems.push(`${where}: devDependency ${dep} is not in react/package.json`);
			}
		}

		const names = [];
		for (const url of item.registryDependencies ?? []) {
			const m = typeof url === "string" ? url.match(depPattern) : null;
			if (!m) problems.push(`${where}: registryDependency ${url} is not ${base}/<name>.json`);
			else if (!diskNames.has(m[1])) problems.push(`${where}: registryDependency ${m[1]} missing`);
			else names.push(m[1]);
		}
		depNames.set(stem, names);
	}

	for (const [re] of BRAND_WORDS) {
		const { $schema: _schema, items: _items, ...head } = index;
		if (re.test(JSON.stringify(head))) problems.push(`registry.json: product name ${re.source}`);
	}

	// The list is flat: whatever a dependency needs is listed on the item itself.
	for (const [stem, names] of depNames) {
		const own = new Set(names);
		for (const n of names) {
			for (const nested of depNames.get(n) ?? []) {
				if (nested !== stem && !own.has(nested)) {
					problems.push(`${stem}.json: needs ${nested} (through ${n}) but does not list it`);
				}
			}
		}
	}

	// Import closure: every relative import lands on a file of the item or its deps.
	for (const [stem, item] of Object.entries(items)) {
		const reach = new Set();
		const queue = [stem];
		while (queue.length) {
			const n = queue.pop();
			if (reach.has(n) || !items[n]) continue;
			reach.add(n);
			queue.push(...(depNames.get(n) ?? []));
		}
		const targets = new Set();
		for (const n of reach) for (const f of items[n].files ?? []) targets.add(f.target);
		for (const file of item.files ?? []) {
			if (typeof file.content !== "string" || !/\.(tsx?|css)$/.test(file.target ?? "")) continue;
			if (file.target.endsWith(".css")) continue;
			for (const spec of relativeSpecifiers(file.content)) {
				if (!candidates(file.target, spec).some((c) => targets.has(c))) {
					problems.push(`${stem}.json: ${file.path} imports ${spec}, not in the item or its deps`);
				}
			}
		}
	}

	return problems;
}

// --- disk --------------------------------------------------------------------

function loadSnapshot(dir) {
	const indexPath = join(dir, "registry.json");
	if (!existsSync(indexPath)) {
		console.error(`❌ ${indexPath} not found — run \`pnpm build\` first (or pass --dir).`);
		process.exit(1);
	}
	const items = {};
	for (const name of readdirSync(dir)) {
		if (!name.endsWith(".json") || name === "registry.json") continue;
		items[name.slice(0, -".json".length)] = JSON.parse(read(join(dir, name)));
	}
	return { index: JSON.parse(read(indexPath)), items };
}

// --- self-test ---------------------------------------------------------------

function selfTest() {
	const base = "https://example.test/r";
	const schemas = {
		index: "https://example.test/s/index.json",
		item: "https://example.test/s/item.json",
	};
	const file = (rel, content, type = "registry:ui") => ({
		path: PATH_PREFIX + rel,
		content,
		type,
		target: TARGET_PREFIX + rel,
	});
	const good = () => {
		const items = {
			utils: {
				$schema: schemas.item,
				name: "utils",
				type: "registry:lib",
				title: "Utils",
				description: "Class name helper.",
				dependencies: ["clsx"],
				files: [file("utils.ts", "export const cn = () => '';\n", "registry:lib")],
			},
			button: {
				$schema: schemas.item,
				name: "button",
				type: "registry:ui",
				title: "Button",
				description: "A button.",
				categories: ["core"],
				registryDependencies: [`${base}/utils.json`],
				files: [
					file(
						"components/button/Button.tsx",
						'"use client";\n\nimport { cn } from "../../utils";\nimport "./button.css";\nimport type { P } from "./types";\n'
					),
					file("components/button/types.ts", "export type P = {};\n"),
					file("components/button/button.css", ".b{}\n"),
				],
			},
		};
		const index = {
			$schema: schemas.index,
			name: "fixture",
			homepage: "https://example.test",
			items: Object.values(items).map(({ $schema: _s, ...rest }) => ({
				...rest,
				files: rest.files.map(({ content: _c, ...f }) => f),
			})),
		};
		return {
			index,
			items,
			base,
			schemas,
			creditUrls: new Set(["https://credits.example.test/thing"]),
			reactDeps: new Set(["clsx"]),
			reactAllDeps: new Set(["clsx", "@types/clsx"]),
			expectedCount: 2,
		};
	};
	/** Each case mutates a good snapshot and names a fragment the problem must contain. */
	const bad = [
		["clean fixture passes", () => {}, null],
		["file on disk missing from index", (s) => s.index.items.pop(), "file, not in index"],
		["index entry with no file on disk", (s) => delete s.items.button, "button: in index, no file"],
		["duplicate index names", (s) => s.index.items.push(s.index.items[0]), "duplicate item names"],
		[
			"wrong index $schema",
			(s) => (s.index.$schema = "https://x.test/s.json"),
			"registry.json: $schema",
		],
		["index missing homepage", (s) => delete s.index.homepage, "registry.json: missing homepage"],
		["index items not an array", (s) => (s.index.items = {}), "items is not an array"],
		["product name in index head", (s) => (s.index.name = "daisy"), "registry.json: product name"],
		["item name differs from file", (s) => (s.items.button.name = "knob"), 'name is "knob"'],
		["item without files", (s) => (s.items.utils.files = []), "utils.json: no files"],
		["file missing target", (s) => delete s.items.utils.files[0].target, "missing target"],
		[
			"target outside the prefix",
			(s) => {
				s.items.utils.files[0].target = "@ui/other/utils.ts";
				s.items.utils.files[0].path = "react/src/utils.ts";
			},
			"outside @ui/fancy/",
		],
		[
			"harness shipped",
			(s) => s.items.button.files.push(file("components/button/ButtonHarness.tsx", "")),
			"excluded file shipped",
		],
		[
			"README shipped",
			(s) => s.items.button.files.push(file("components/button/README.md", "")),
			"excluded file shipped",
		],
		[
			"builder path in content",
			(s) => (s.items.utils.files[0].content += "// see src/lib/builder/x\n"),
			"mentions src\\/lib\\/builder",
		],
		["content in index", (s) => (s.index.items[0].files[0].content = "x"), "carries file content"],
		["index entry drifts from item", (s) => (s.index.items[1].title = "Other"), "differs from"],
		["missing required field", (s) => delete s.items.button.description, "missing description"],
		["wrong $schema", (s) => (s.items.button.$schema = "https://x.test/s.json"), "$schema is"],
		[
			"registryDependency not a base URL",
			(s) => (s.items.button.registryDependencies = ["utils"]),
			"is not https://example.test/r/<name>.json",
		],
		[
			"registryDependency to a missing item",
			(s) => (s.items.button.registryDependencies = [`${base}/ghost.json`]),
			"registryDependency ghost missing",
		],
		[
			"unresolved relative import",
			(s) => (s.items.button.files[0].content += 'import { x } from "../other/x";\n'),
			"imports ../other/x",
		],
		[
			"import satisfied only by an undeclared dep",
			(s) => (s.items.button.registryDependencies = []),
			"imports ../../utils",
		],
		[
			"transitive dependency not listed",
			(s) => {
				// button → utils → extra, and button lists only utils.
				s.items.extra = { ...structuredClone(s.items.utils), name: "extra" };
				s.items.extra.files[0] = file("extra.ts", "export {};\n", "registry:lib");
				s.items.utils.registryDependencies = [`${base}/extra.json`];
				s.expectedCount = 3;
			},
			"needs extra (through utils)",
		],
		[
			"test file shipped",
			(s) => s.items.button.files.push(file("components/button/Button.test.tsx", "")),
			"excluded file shipped",
		],
		[
			"web audio mock shipped",
			(s) => s.items.utils.files.push(file("sound/web-audio-mock.ts", "", "registry:lib")),
			"excluded file shipped",
		],
		[
			"site-only path in content",
			(s) => (s.items.utils.files[0].content += "// see src/lib/server/x\n"),
			"mentions src\\/lib\\/server",
		],
		[
			"credit host in content",
			(s) => (s.items.utils.files[0].content += "// see credits.example.test for the idea\n"),
			"mentions credit host",
		],
		[
			'".js" relative specifier',
			(s) => (s.items.utils.files[0].content += 'import { x } from "./x.js";\n'),
			"specifiers do not resolve",
		],
		[
			"credit URL in content",
			(s) => (s.items.utils.files[0].content += "// https://credits.example.test/thing\n"),
			"mentions credit",
		],
		...BRAND_WORDS.map(([re, sample]) => [
			`product name ${re.source}`,
			(s) => (s.items.button.description = `Like ${sample}.`),
			"product name",
		]),
		[
			"devDependency outside react/package.json",
			(s) => (s.items.utils.devDependencies = ["@types/nope"]),
			"devDependency @types/nope",
		],
		[
			"dependency outside react/package.json",
			(s) => (s.items.button.dependencies = ["left-pad"]),
			"dependency left-pad",
		],
		["count mismatch", (s) => (s.expectedCount = 3), "count: 2"],
		[
			"path/target mismatch",
			(s) => (s.items.utils.files[0].path = "react/src/x.ts"),
			"does not match",
		],
	];
	let failed = 0;
	for (const [label, mutate, expected] of bad) {
		let ok = false;
		try {
			const snap = good();
			mutate(snap);
			const problems = findProblems(snap);
			ok = expected === null ? problems.length === 0 : problems.some((p) => p.includes(expected));
			if (!ok) console.error(`  FAIL  ${label}\n        got: ${JSON.stringify(problems)}`);
		} catch (e) {
			console.error(`  FAIL  ${label} (threw ${e})`);
		}
		if (!ok) failed++;
	}
	if (failed) {
		console.error(`Registry items self-test FAILED (${failed}/${bad.length}).`);
		process.exit(1);
	}
	console.log(`Registry items self-test OK (${bad.length} cases).`);
}

// --- main --------------------------------------------------------------------

function main() {
	const args = process.argv.slice(2);
	if (args.includes("--self-test")) return selfTest();
	const at = args.indexOf("--dir");
	const dir = at >= 0 && args[at + 1] ? resolve(args[at + 1]) : DEFAULT_DIR;

	const { index, items } = loadSnapshot(dir);
	const problems = findProblems({
		index,
		items,
		base: `${siteUrl()}/r`,
		schemas: schemaUrls(),
		creditUrls: creditUrls(),
		reactDeps: reactDependencies(),
		reactAllDeps: reactAllDependencies(),
		expectedCount: EXPECTED_COUNT,
	});
	if (problems.length) {
		for (const p of problems) console.error(`❌ ${p}`);
		console.error(`\n${problems.length} problem(s) in ${dir}.`);
		process.exit(1);
	}
	const fileCount = Object.values(items).reduce((n, item) => n + item.files.length, 0);
	console.log(
		`✅ ${Object.keys(items).length} registry items, ${fileCount} files, index consistent, imports closed.`
	);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
