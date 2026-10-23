#!/usr/bin/env node
/**
 * Source registry gate.
 *
 * The docs site prerenders three source registries, built by
 * `src/lib/server/registry/`: the React one (`/r/registry.json` + one
 * `/r/<name>.json` per item, from `react/src`), the Svelte one
 * (`/r/svelte/registry.json` + `/r/svelte/<name>.json`, from
 * `src/lib/fancy-ui`) and the Vue one (`/r/vue/…`, from `vue/src`). A consumer copies those files into their own project,
 * so whatever ships there is code we hand over for good. This script reads the
 * prerendered output of one stack and refuses it when:
 *
 *   - the index and the item files on disk disagree, or the index carries
 *     file `content`, or an index entry differs from its item;
 *   - a required field is missing, or a `$schema` value is not the one in
 *     `src/lib/server/registry/constants.ts`;
 *   - a `registryDependencies` entry is not `<base>/<existing-name>.json`;
 *   - a relative import inside an item resolves to no file of the item or of
 *     the items it depends on (transitively);
 *   - a test file, a test harness, a README, a template or the Web Audio mock
 *     got in;
 *   - a file's `target` or `path` sits outside the stack's prefix, or (Svelte,
 *     Vue) a file type is not `registry:ui` or an item type not ui/lib;
 *   - (Vue) a file carries a `target` key at all, in the index or an item: the
 *     CLI places files by `path` under the consumer's `ui` alias, and a target
 *     would land them at the project root instead;
 *   - (React) a relative specifier still ends in ".js";
 *   - (Svelte) a non-relative, non-package specifier other than `$UTILS$.js`
 *     (a `$lib/…` import), any other `$…$` placeholder anywhere in the text, or
 *     a client directive;
 *   - (Vue) any `$…`, `@/…` or `~/…` specifier, any `$…$` placeholder, or a
 *     client directive;
 *   - content mentions site-only code (`src/lib/server`, `src/lib/builder`)
 *     or a credits URL from `src/lib/fancy-ui/registry.ts`;
 *   - a third-party product name appears anywhere but the `$schema` values;
 *   - `dependencies` names a package the stack's package.json does not
 *     depend on (`react/package.json` / the root `package.json` /
 *     `vue/package.json`);
 *   - the item count is not the stack's (React 158 = 152 components + 6
 *     shared modules; Svelte 155 = 152 components + 3 shared modules; Vue 157
 *     = 152 components + 5 shared modules), or (Svelte, Vue) the total file
 *     count drifts from the pinned one.
 *
 * Usage:
 *   node scripts/check-registry-items.mjs [--self-test] [--stack react|svelte|vue] [--dir <path>]
 *
 *   --self-test     run the built-in detector cases on in-memory fixtures and exit
 *   --stack <id>    which registry to check (default react)
 *   --dir <path>    read the JSON files from <path> instead of the stack's
 *                   .svelte-kit/output/prerendered/pages/r[/svelte|/vue]
 */

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, posix, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");
const PAGES_R = join(repoRoot, ".svelte-kit", "output", "prerendered", "pages", "r");

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

/** Vue files over all 159 items; the generator's real-tree test reports the same. */
const VUE_EXPECTED_FILES = 528;

/** The one placeholder Svelte items may import: the consumer's `cn` module. */
const SVELTE_UTILS_SPECIFIER = "$UTILS$.js";

/**
 * Per-stack settings. `react` is the historical default; every rule that
 * differs between the two registries is read from here.
 */
const STACKS = {
	react: {
		id: "react",
		dir: PAGES_R,
		urlPath: "/r",
		expectedCount: 160,
		targetPrefix: "@ui/fancy/",
		pathPrefix: "react/src/",
		excluded: EXCLUDED,
		packageJson: ["react", "package.json"],
		schemaNames: { index: "REGISTRY_SCHEMA_URL", item: "REGISTRY_ITEM_SCHEMA_URL" },
		/** Relative ".js" specifiers do not resolve under Next: stripped at build. */
		forbidJsSpecifiers: true,
		svelte: false,
		vue: false,
	},
	svelte: {
		id: "svelte",
		dir: join(PAGES_R, "svelte"),
		urlPath: "/r/svelte",
		expectedCount: 157,
		/** Files over all items, pinned so a stray helper or a lost file shows up. */
		expectedFiles: 499,
		targetPrefix: "fancy/",
		pathPrefix: "src/lib/fancy-ui/",
		excluded: [...EXCLUDED, /\.test\.(ts|svelte)$/, /Harness/, /(^|\/)_template\//],
		packageJson: ["package.json"],
		schemaNames: {
			index: "SVELTE_REGISTRY_SCHEMA_URL",
			item: "SVELTE_REGISTRY_ITEM_SCHEMA_URL",
		},
		forbidJsSpecifiers: false,
		svelte: true,
		vue: false,
	},
	vue: {
		id: "vue",
		dir: join(PAGES_R, "vue"),
		urlPath: "/r/vue",
		expectedCount: 159,
		/** Files over all items, pinned so a stray helper or a lost file shows up. */
		expectedFiles: VUE_EXPECTED_FILES,
		/** No `target`: the Vue CLI places a file from its `path` (see the header). */
		targetPrefix: null,
		pathPrefix: "src/components/ui/fancy/",
		excluded: [
			...EXCLUDED,
			/\.fixtures\.ts$/,
			/(^|\/)test-setup\.ts$/,
			/(^|\/)cameleon\//,
			/^src\/components\/ui\/fancy\/index\.ts$/,
		],
		packageJson: ["vue", "package.json"],
		schemaNames: { index: "VUE_REGISTRY_SCHEMA_URL", item: "VUE_REGISTRY_ITEM_SCHEMA_URL" },
		forbidJsSpecifiers: false,
		svelte: false,
		vue: true,
	},
};

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

function schemaUrls(stack) {
	const path = join(repoRoot, "src", "lib", "server", "registry", "constants.ts");
	const src = read(path);
	const pick = (name) => {
		const m = src.match(new RegExp(`export const ${name}\\s*=\\s*"([^"]+)"`));
		if (!m) throw new Error(`${name} not found in ${path}`);
		return m[1];
	};
	return { index: pick(stack.schemaNames.index), item: pick(stack.schemaNames.item) };
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

/** `name@range` → `name` (a scope's leading "@" is not a range separator). */
function packageName(entry) {
	const at = entry.indexOf("@", 1);
	return at === -1 ? entry : entry.slice(0, at);
}

function packageDependencies(stack) {
	const pkg = JSON.parse(read(join(repoRoot, ...stack.packageJson)));
	return new Set(Object.keys(pkg.dependencies ?? {}));
}

/** Runtime and dev dependencies together: what `devDependencies` may name. */
function packageAllDependencies(stack) {
	const pkg = JSON.parse(read(join(repoRoot, ...stack.packageJson)));
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

/**
 * Every specifier of a module's import/export statements (relative or not),
 * same line-anchored rule as `relativeSpecifiers`.
 */
export function allSpecifiers(code) {
	const out = new Set();
	const patterns = [
		/^[\t ]*(?:import|export)\b[^;]*?\bfrom\s*["']([^"']+)["']/gm,
		/^[\t ]*import\s*["']([^"']+)["']/gm,
		/\bimport\s*\(\s*["']([^"']+)["']\s*\)/g,
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
 * @param {Set<string>} snap.deps       runtime dependencies of the stack's package.json
 * @param {Set<string>} snap.allDeps    runtime + dev dependencies of the same
 * @param {number} snap.expectedCount
 * @param {typeof STACKS.react} [snap.stack]  defaults to the React settings
 * @returns {string[]}
 */
export function findProblems(snap) {
	const problems = [];
	const { index, items, base, schemas } = snap;
	const stack = snap.stack ?? STACKS.react;
	const { targetPrefix: TARGET_PREFIX, pathPrefix: PATH_PREFIX } = stack;
	const pkgLabel = stack.packageJson.join("/");

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
	const expectedFiles = snap.expectedFiles ?? stack.expectedFiles;
	if (expectedFiles !== undefined) {
		const n = Object.values(items).reduce((sum, item) => sum + (item?.files?.length ?? 0), 0);
		if (n !== expectedFiles) problems.push(`count: ${n} files, expected ${expectedFiles}`);
	}

	for (const entry of entries) {
		for (const file of entry?.files ?? []) {
			if ("content" in file) problems.push(`registry.json: ${entry.name} carries file content`);
			if (stack.vue && "target" in file) {
				problems.push(`registry.json: ${entry.name} file ${file.path} carries a target`);
			}
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
			const fields = TARGET_PREFIX
				? ["path", "content", "type", "target"]
				: ["path", "content", "type"];
			for (const field of fields) {
				if (typeof file[field] !== "string" || (field !== "content" && !file[field])) {
					problems.push(`${where}: file ${file.path ?? "?"} missing ${field}`);
				}
			}
			if (!TARGET_PREFIX && "target" in file) {
				problems.push(`${where}: file ${file.path} carries a target`);
			}
			if (typeof file.path === "string" && !file.path.startsWith(PATH_PREFIX)) {
				problems.push(`${where}: path ${file.path} outside ${PATH_PREFIX}`);
			}
			if (
				TARGET_PREFIX &&
				typeof file.target === "string" &&
				!file.target.startsWith(TARGET_PREFIX)
			) {
				problems.push(`${where}: target ${file.target} outside ${TARGET_PREFIX}`);
			}
			if (
				TARGET_PREFIX &&
				typeof file.target === "string" &&
				typeof file.path === "string" &&
				file.path !== PATH_PREFIX + file.target.slice(TARGET_PREFIX.length)
			) {
				problems.push(`${where}: path ${file.path} does not match target ${file.target}`);
			}
			if ((stack.svelte || stack.vue) && file.type !== "registry:ui") {
				problems.push(`${where}: file ${file.path} type is ${JSON.stringify(file.type)}`);
			}
			if (stack.excluded.some((re) => re.test(file.path ?? "") || re.test(file.target ?? ""))) {
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
			if (stack.forbidJsSpecifiers) {
				for (const spec of relativeSpecifiers(content)) {
					if (/\.(m?js|jsx)$/.test(spec)) {
						problems.push(
							`${where}: ${file.path} imports ${spec} (".js" specifiers do not resolve in Next)`
						);
					}
				}
			}
			if (stack.svelte) problems.push(...svelteContentProblems(where, file.path, content));
			if (stack.vue) problems.push(...vueContentProblems(where, file.path, content));
		}
		if ((stack.svelte || stack.vue) && !["registry:ui", "registry:lib"].includes(item.type)) {
			problems.push(`${where}: type is ${JSON.stringify(item.type)}`);
		}

		const { $schema: _schema, ...branded } = item;
		const text = JSON.stringify(branded);
		for (const [re] of BRAND_WORDS) {
			if (re.test(text)) problems.push(`${where}: product name matching ${re.source}`);
		}

		for (const entry of item.dependencies ?? []) {
			const dep = packageName(entry);
			if (!snap.deps.has(dep)) {
				problems.push(`${where}: dependency ${dep} is not a ${pkgLabel} dependency`);
			}
		}
		for (const entry of item.devDependencies ?? []) {
			const dep = packageName(entry);
			if (!snap.allDeps.has(dep)) {
				problems.push(`${where}: devDependency ${dep} is not in ${pkgLabel}`);
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
		// Where a file lands, relative to the others: its target, or (Vue, no
		// target) its path, which the CLI maps one-to-one under the `ui` alias.
		const where = (f) => (TARGET_PREFIX ? f.target : f.path);
		const targets = new Set();
		for (const n of reach) for (const f of items[n].files ?? []) targets.add(where(f));
		for (const file of item.files ?? []) {
			const at = where(file);
			if (typeof file.content !== "string" || !/\.(tsx?|css|svelte|vue)$/.test(at ?? "")) continue;
			if (at.endsWith(".css")) continue;
			for (const spec of relativeSpecifiers(file.content)) {
				if (!candidates(at, spec).some((c) => targets.has(c))) {
					problems.push(`${stem}.json: ${file.path} imports ${spec}, not in the item or its deps`);
				}
			}
		}
	}

	return problems;
}

/**
 * Svelte-only content rules. Shipped files go through the CLI's placeholder
 * rewrite, so the single alias import allowed is the consumer's `cn` module
 * (`$UTILS$.js`); a `$lib/` import would point into OUR project, and any other
 * placeholder would be rewritten to a consumer path we never meant. A `$lib/`
 * path quoted in a comment is prose, not an import, and is left alone.
 */
function svelteContentProblems(where, path, content) {
	const problems = [];
	for (const spec of allSpecifiers(content)) {
		if (spec.startsWith(".") || !spec.startsWith("$")) continue;
		if (spec !== SVELTE_UTILS_SPECIFIER) problems.push(`${where}: ${path} imports ${spec}`);
	}
	for (const m of content.matchAll(/\$[A-Z][A-Z_]*\$/g)) {
		if (m[0] !== "$UTILS$") problems.push(`${where}: ${path} carries placeholder ${m[0]}`);
	}
	if (/^\s*["']use client["']/m.test(content)) {
		problems.push(`${where}: ${path} carries a "use client" directive`);
	}
	return problems;
}

/**
 * Vue-only content rules. The Vue CLI rewrites only `@/…` specifiers and never
 * a `$…$` placeholder, and our sources import relatively, so a shipped file
 * carries no alias specifier at all (`$lib/…`, `@/…`, `~/…`, `$…`) and no
 * placeholder anywhere. Paths quoted in comments are prose and stay allowed.
 */
function vueContentProblems(where, path, content) {
	const problems = [];
	for (const spec of allSpecifiers(content)) {
		if (/^(\$|@\/|~\/)/.test(spec)) problems.push(`${where}: ${path} imports ${spec}`);
	}
	for (const m of content.matchAll(/\$[A-Z][A-Z_]*\$/g)) {
		problems.push(`${where}: ${path} carries placeholder ${m[0]}`);
	}
	if (/^\s*["']use client["']/m.test(content)) {
		problems.push(`${where}: ${path} carries a "use client" directive`);
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
	const react = reactCases();
	const svelte = svelteCases();
	const vue = vueCases();
	const failed = runCases(react) + runCases(svelte) + runCases(vue);
	const total = react[1].length + svelte[1].length + vue[1].length;
	if (failed) {
		console.error(`Registry items self-test FAILED (${failed}/${total}).`);
		process.exit(1);
	}
	console.log(
		`Registry items self-test OK (${total} cases: ${react[1].length} react, ${svelte[1].length} svelte, ${vue[1].length} vue).`
	);
}

/** Runs [label, mutate, expected] cases; returns the number that failed. */
function runCases([good, cases]) {
	let failed = 0;
	for (const [label, mutate, expected] of cases) {
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
	return failed;
}

function reactCases() {
	const { targetPrefix: TARGET_PREFIX, pathPrefix: PATH_PREFIX } = STACKS.react;
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
			deps: new Set(["clsx"]),
			allDeps: new Set(["clsx", "@types/clsx"]),
			expectedCount: 2,
			stack: STACKS.react,
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
	return [good, bad];
}

function svelteCases() {
	const stack = STACKS.svelte;
	const base = "https://example.test/r/svelte";
	const schemas = {
		index: "https://example.test/s/svelte-index.json",
		item: "https://example.test/s/svelte-item.json",
	};
	const file = (rel, content, type = "registry:ui") => ({
		path: stack.pathPrefix + rel,
		content,
		type,
		target: stack.targetPrefix + rel,
	});
	const good = () => {
		const items = {
			internals: {
				$schema: schemas.item,
				name: "internals",
				type: "registry:lib",
				title: "Shared internals",
				description: "Helpers the components share.",
				files: [
					file("_internals/portal.ts", "export function portal() {}\n"),
					file(
						"_internals/Markdown.svelte",
						'<script lang="ts">\n\tlet { text } = $props();\n</script>\n'
					),
				],
			},
			"rainbow-button": {
				$schema: schemas.item,
				name: "rainbow-button",
				type: "registry:ui",
				title: "Rainbow Button",
				description: "A button with a rainbow edge.",
				categories: ["buttons"],
				dependencies: ["three"],
				devDependencies: ["@types/three"],
				registryDependencies: [`${base}/internals.json`],
				files: [
					file(
						"rainbow-button/RainbowButton.svelte",
						'<script lang="ts">\n\timport type { HTMLButtonAttributes } from "svelte/elements";\n\timport { cn } from "$UTILS$.js";\n\timport { portal } from "../_internals/portal.js";\n\timport Markdown from "../_internals/Markdown.svelte";\n\timport { state } from "./state.svelte.js";\n\timport type { Props } from "./types.js";\n\timport Inner from "./Inner.svelte";\n</script>\n\n<button class={cn("x")}>{@render children?.()}</button>\n'
					),
					file("rainbow-button/Inner.svelte", "<span></span>\n"),
					file("rainbow-button/state.svelte.ts", "export const state = $state({ on: false });\n"),
					file("rainbow-button/types.ts", "export type Props = {};\n"),
					file(
						"rainbow-button/index.ts",
						'export { default as RainbowButton } from "./RainbowButton.svelte";\nexport type { Props } from "./types.js";\n'
					),
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
			deps: new Set(["three"]),
			allDeps: new Set(["three", "@types/three"]),
			expectedCount: 2,
			expectedFiles: 7,
			stack,
		};
	};
	const rb = (s) => s.items["rainbow-button"];
	const bad = [
		["svelte: clean fixture passes", () => {}, null],
		[
			"svelte: $lib/ import leak",
			(s) =>
				(rb(s).files[0].content +=
					'<script module>\n\timport { x } from "$lib/other.js";\n</script>\n'),
			"imports $lib/other.js",
		],
		[
			"svelte: $lib/ re-export leak",
			(s) => (rb(s).files[4].content += 'export * from "$lib/fancy-ui/other/index.js";\n'),
			"imports $lib/fancy-ui/other/index.js",
		],
		[
			"svelte: other placeholder",
			(s) => (rb(s).files[3].content += 'import { x } from "$LIB$/x.js";\n'),
			"imports $LIB$/x.js",
		],
		[
			"svelte: placeholder outside an import",
			(s) => (rb(s).files[3].content += "// lives under $COMPONENTS$/fancy\n"),
			"carries placeholder $COMPONENTS$",
		],
		[
			"svelte: wrong file type",
			(s) => (s.items.internals.files[0].type = "registry:lib"),
			'type is "registry:lib"',
		],
		[
			"svelte: wrong target prefix",
			(s) => {
				rb(s).files[1].target = "@ui/fancy/rainbow-button/Inner.svelte";
			},
			"outside fancy/",
		],
		[
			"svelte: .test.svelte leak",
			(s) => rb(s).files.push(file("rainbow-button/Probe.test.svelte", "<div></div>\n")),
			"excluded file shipped",
		],
		[
			"svelte: harness leak",
			(s) => rb(s).files.push(file("rainbow-button/RainbowButtonHarness.svelte", "")),
			"excluded file shipped",
		],
		[
			"svelte: template leak",
			(s) => rb(s).files.push(file("_template/Component.svelte", "")),
			"excluded file shipped",
		],
		[
			"svelte: use client leak",
			(s) => (rb(s).files[3].content = '"use client";\n' + rb(s).files[3].content),
			'"use client" directive',
		],
		[
			"svelte: unresolved .svelte sibling",
			(s) => rb(s).files.splice(1, 1),
			"imports ./Inner.svelte",
		],
		[
			"svelte: unresolved .svelte.js import",
			(s) => rb(s).files.splice(2, 1),
			"imports ./state.svelte.js",
		],
		[
			"svelte: shared import without the dependency",
			(s) => (rb(s).registryDependencies = []),
			"imports ../_internals/portal.js",
		],
		["svelte: wrong item type", (s) => (rb(s).type = "registry:block"), 'type is "registry:block"'],
		[
			"svelte: dependency outside package.json",
			(s) => (rb(s).dependencies = ["left-pad"]),
			"dependency left-pad is not a package.json dependency",
		],
		[
			"svelte: pinned scoped and plain dependencies pass",
			(s) => {
				s.deps.add("@scope/pkg");
				const pinned = ["three@^0.160.0", "@scope/pkg@^1.2.0"];
				rb(s).dependencies = pinned;
				s.index.items.find((i) => i.name === "rainbow-button").dependencies = pinned;
			},
			null,
		],
		[
			"svelte: pinned unknown dependency is flagged",
			(s) => (rb(s).dependencies = ["left-pad@^1.0.0"]),
			"dependency left-pad is not a package.json dependency",
		],
		[
			"svelte: file count drift",
			(s) => rb(s).files.push(file("rainbow-button/extra.ts", "export {};\n")),
			"count: 8 files, expected 7",
		],
		["svelte: product name", (s) => (rb(s).title = "Daisy button"), "product name"],
	];
	return [good, bad];
}

function vueCases() {
	const stack = STACKS.vue;
	const base = "https://example.test/r/vue";
	const schemas = {
		index: "https://example.test/s/vue-index.json",
		item: "https://example.test/s/vue-item.json",
	};
	// No target: a Vue file is placed from its path alone.
	const file = (rel, content, type = "registry:ui") => ({
		path: stack.pathPrefix + rel,
		content,
		type,
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
				files: [file("utils.ts", "export const cn = () => '';\n")],
			},
			internals: {
				$schema: schemas.item,
				name: "internals",
				type: "registry:lib",
				title: "Shared internals",
				description: "Helpers the components share.",
				files: [
					file("internals/portal.ts", "export function portal() {}\n"),
					file(
						"internals/StreamText.vue",
						'<script setup lang="ts">\nimport "./stream-text.css";\nimport { portal } from "./portal.js";\n</script>\n'
					),
					file("internals/stream-text.css", ".s{}\n"),
				],
			},
			"rainbow-button": {
				$schema: schemas.item,
				name: "rainbow-button",
				type: "registry:ui",
				title: "Rainbow Button",
				description: "A button with a rainbow edge.",
				categories: ["buttons"],
				dependencies: ["three"],
				devDependencies: ["@types/three"],
				registryDependencies: [`${base}/internals.json`, `${base}/utils.json`],
				files: [
					file(
						"components/rainbow-button/RainbowButton.vue",
						'<script setup lang="ts">\nimport { computed } from "vue";\nimport { cn } from "../../utils.js";\nimport StreamText from "../../internals/StreamText.vue";\nimport type { Props } from "./types.js";\nimport Inner from "./Inner.vue";\n// a core may not reach into `$lib/` or `@/lib`, so it lives here\n</script>\n\n<template><button :class="cn(\'x\')"><Inner /></button></template>\n'
					),
					file("components/rainbow-button/Inner.vue", "<template><span /></template>\n"),
					file("components/rainbow-button/types.ts", "export type Props = {};\n"),
					file(
						"components/rainbow-button/index.ts",
						'export { default as RainbowButton } from "./RainbowButton.vue";\nexport type { Props } from "./types.js";\n'
					),
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
			deps: new Set(["three", "clsx"]),
			allDeps: new Set(["three", "clsx", "@types/three"]),
			expectedCount: 3,
			expectedFiles: 8,
			stack,
		};
	};
	const rb = (s) => s.items["rainbow-button"];
	const idx = (s, name) => s.index.items.find((e) => e.name === name);
	const bad = [
		["vue: clean fixture passes", () => {}, null],
		[
			"vue: target on an item file",
			(s) => (rb(s).files[1].target = "components/ui/fancy/components/rainbow-button/Inner.vue"),
			"Inner.vue carries a target",
		],
		[
			"vue: target on an index file",
			(s) => (idx(s, "utils").files[0].target = "fancy/utils.ts"),
			"registry.json: utils file src/components/ui/fancy/utils.ts carries a target",
		],
		[
			"vue: path outside the prefix",
			(s) => (s.items.utils.files[0].path = "src/lib/utils.ts"),
			"outside src/components/ui/fancy/",
		],
		[
			"vue: wrong file type",
			(s) => (s.items.utils.files[0].type = "registry:lib"),
			'type is "registry:lib"',
		],
		["vue: wrong item type", (s) => (rb(s).type = "registry:block"), 'type is "registry:block"'],
		[
			"vue: use client leak",
			(s) => (rb(s).files[2].content = '"use client";\n' + rb(s).files[2].content),
			'"use client" directive',
		],
		[
			"vue: placeholder in the text",
			(s) => (rb(s).files[2].content += "// lives under $UTILS$\n"),
			"carries placeholder $UTILS$",
		],
		[
			"vue: $lib/ import",
			(s) => (rb(s).files[2].content += 'import { x } from "$lib/x.js";\n'),
			"imports $lib/x.js",
		],
		[
			"vue: @/ import",
			(s) => (rb(s).files[2].content += 'import { cn } from "@/lib/utils";\n'),
			"imports @/lib/utils",
		],
		[
			"vue: ~/ import",
			(s) => (rb(s).files[2].content += 'import { cn } from "~/lib/utils";\n'),
			"imports ~/lib/utils",
		],
		["vue: unresolved .vue sibling", (s) => rb(s).files.splice(1, 1), "imports ./Inner.vue"],
		['vue: unresolved ".js" → .ts import', (s) => rb(s).files.splice(2, 1), "imports ./types.js"],
		[
			"vue: css side-effect import unresolved",
			(s) => s.items.internals.files.splice(2, 1),
			"imports ./stream-text.css",
		],
		[
			"vue: shared import without the dependency",
			(s) => (rb(s).registryDependencies = [`${base}/utils.json`]),
			"imports ../../internals/StreamText.vue",
		],
		[
			"vue: .test.ts leak",
			(s) => rb(s).files.push(file("components/rainbow-button/RainbowButton.test.ts", "")),
			"excluded file shipped",
		],
		[
			"vue: fixtures leak",
			(s) => s.items.utils.files.push(file("ssr-sweep.fixtures.ts", "")),
			"excluded file shipped",
		],
		[
			"vue: cameleon leak",
			(s) => s.items.utils.files.push(file("cameleon/FancyProvider.vue", "")),
			"excluded file shipped",
		],
		[
			"vue: dependency outside vue/package.json",
			(s) => (rb(s).dependencies = ["left-pad"]),
			"dependency left-pad is not a vue/package.json dependency",
		],
		[
			"vue: devDependency outside vue/package.json",
			(s) => (rb(s).devDependencies = ["@types/nope"]),
			"devDependency @types/nope is not in vue/package.json",
		],
		[
			"vue: file count drift",
			(s) => rb(s).files.push(file("components/rainbow-button/extra.ts", "export {};\n")),
			"count: 9 files, expected 8",
		],
		["vue: product name", (s) => (rb(s).title = "Daisy button"), "product name"],
	];
	return [good, bad];
}

// --- main --------------------------------------------------------------------

function main() {
	const args = process.argv.slice(2);
	if (args.includes("--self-test")) return selfTest();
	const st = args.indexOf("--stack");
	const stackId = st >= 0 ? args[st + 1] : "react";
	const stack = Object.hasOwn(STACKS, stackId ?? "") ? STACKS[stackId] : undefined;
	if (!stack) {
		console.error(`❌ unknown --stack ${JSON.stringify(stackId)} (react | svelte | vue)`);
		process.exit(1);
	}
	const at = args.indexOf("--dir");
	const dir = at >= 0 && args[at + 1] ? resolve(args[at + 1]) : stack.dir;

	const { index, items } = loadSnapshot(dir);
	const problems = findProblems({
		index,
		items,
		base: `${siteUrl()}${stack.urlPath}`,
		schemas: schemaUrls(stack),
		creditUrls: creditUrls(),
		deps: packageDependencies(stack),
		allDeps: packageAllDependencies(stack),
		expectedCount: stack.expectedCount,
		stack,
	});
	if (problems.length) {
		for (const p of problems) console.error(`❌ ${p}`);
		console.error(`\n${problems.length} problem(s) in ${dir}.`);
		process.exit(1);
	}
	const fileCount = Object.values(items).reduce((n, item) => n + item.files.length, 0);
	console.log(
		`✅ ${stack.id}: ${Object.keys(items).length} registry items, ${fileCount} files, index consistent, imports closed.`
	);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
