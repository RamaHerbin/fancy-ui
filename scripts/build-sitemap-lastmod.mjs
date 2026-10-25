#!/usr/bin/env node
/**
 * Sitemap <lastmod> dates.
 *
 * Writes `src/lib/generated/sitemap-lastmod.json`: for every URL the sitemap
 * lists, the date of the last commit that touched the sources behind it. The
 * sitemap route (`src/routes/sitemap.xml/+server.ts`) reads this file and
 * emits a `<lastmod>` for the URLs it knows.
 *
 * Why a committed file and not a build step: Vercel (and CI) clone shallowly,
 * so `git log` there knows one commit and would date every page "today" — a
 * lastmod that moves on every deploy is exactly the kind crawlers learn to
 * ignore. Run this from a full clone, commit the result:
 *
 *   pnpm build:sitemap-lastmod            # regenerate
 *   pnpm check:sitemap-lastmod            # unit tests + exit 1 when the committed file is stale
 *
 * Dates are per page, not per registry edit: a component page follows its
 * source folder, its docs examples and its React/Vue ports, and also the
 * shared template every component page renders through
 * (SHARED_COMPONENT_SOURCES); a recipe page follows the recipes module; an
 * inspiration page follows its entry file. A page that nobody touched keeps
 * its old date — too old is honest, too new is not.
 *
 * Pending changes count: when a source behind a page has uncommitted edits
 * (staged, unstaged or untracked), that page is dated today, so regenerating
 * in the same change that edits a page does not record the previous commit's
 * date. Once the change is committed the commit date takes over, and
 * `--check` reports the file stale until it is regenerated.
 */

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_REL = "src/lib/generated/sitemap-lastmod.json";
const OUT = join(ROOT, OUT_REL);
const CHECK = process.argv.includes("--check");

/** Static sitemap URLs → the sources whose last commit dates them. */
const STATIC_SOURCES = {
	"/": [
		"src/routes/+page.svelte",
		"src/lib/components/home",
		"src/lib/components/site/SiteFonts.svelte",
	],
	"/docs/components": ["src/routes/docs/components/+page.svelte"],
	"/docs/recipes": ["src/routes/docs/recipes", "src/lib/docs/recipes"],
	"/inspiration": ["src/routes/inspiration/+page.svelte", "src/lib/inspiration"],
	"/docs/getting-started/introduction": [
		"src/routes/docs/getting-started/introduction",
		"src/lib/components/docs/IntroductionPage.svelte",
	],
	"/docs/getting-started/installation": [
		"src/routes/docs/getting-started/installation",
		"src/lib/components/docs/InstallationPage.svelte",
	],
	"/docs/getting-started/copy-source": [
		"src/routes/docs/getting-started/copy-source",
		"src/lib/components/docs/CopySourcePage.svelte",
		"src/lib/docs/copy-source-guide.ts",
	],
	"/docs/getting-started/theming": [
		"src/routes/docs/getting-started/theming",
		"src/lib/components/docs/ThemingPage.svelte",
	],
	"/docs/getting-started/theme-generator": ["src/routes/docs/getting-started/theme-generator"],
	"/docs/getting-started/changelog": [
		"src/routes/docs/getting-started/changelog",
		"src/lib/components/docs/ChangelogPage.svelte",
		"CHANGELOG.md",
	],
};

/**
 * Sources every component page renders through: a change here changes all of
 * them, so each component date is the newest of its own sources and these.
 * Site chrome (sidebar, header, footer) is left out: it does not change what a
 * component page says. Paths are literal — `[slug]` is not a glob (see `git`).
 */
export const SHARED_COMPONENT_SOURCES = [
	"src/routes/docs/components/[slug]/+page.svelte",
	"src/routes/docs/components/[slug]/+page.ts",
	"src/routes/docs/components/[slug]/+page.server.ts",
	"src/routes/docs/+layout.svelte",
	"src/lib/components/docs/ComponentPreview.svelte",
	"src/lib/components/docs/DemoRenderer.svelte",
	"src/lib/components/docs/ExamplesSection.svelte",
	"src/lib/components/docs/PropsTable.svelte",
	"src/lib/components/docs/InstallBlock.svelte",
	"src/lib/components/docs/PrevNextNav.svelte",
	"src/lib/components/docs/RelatedComponents.svelte",
];

/** The sources behind one component page: its own, its ports, and the shared template. */
export function componentSources(slug, ports = new Map()) {
	return [
		`src/lib/fancy-ui/${slug}`,
		`src/lib/components/docs/examples/${slug}`,
		...(ports.get(slug) ?? []),
		...SHARED_COMPONENT_SOURCES,
	];
}

/** Whether `file` (a repo-relative path) is `source` or lies under it. */
export function isUnder(file, source) {
	const dir = source.replace(/\/+$/, "");
	return file === dir || file.startsWith(`${dir}/`);
}

/** Whether any of `dirty` (changed paths) is one of `sources` or lies under one. */
export function touches(sources, dirty) {
	return dirty.some((file) => sources.some((source) => isUnder(file, source)));
}

/** The newer of two YYYY-MM-DD dates (either may be null). */
export function newest(a, b) {
	if (!a) return b ?? null;
	if (!b) return a;
	return a > b ? a : b;
}

/**
 * Changed paths from `git status --porcelain -z` output: for a rename or copy,
 * the new path (with -z, the origin follows in its own field and is skipped).
 */
export function parsePorcelain(raw) {
	const out = [];
	const fields = raw.split("\0");
	for (let i = 0; i < fields.length; i++) {
		const entry = fields[i];
		if (entry.length < 4) continue;
		const status = entry.slice(0, 2);
		out.push(entry.slice(3));
		if (status.includes("R") || status.includes("C")) i++;
	}
	return out;
}

// Pathspecs are literal: route folders such as `[slug]` would otherwise be
// read as a character class and match nothing.
function git(args) {
	return execFileSync("git", ["--literal-pathspecs", ...args], {
		cwd: ROOT,
		encoding: "utf8",
	}).trim();
}

/** Local YYYY-MM-DD: the calendar day `%cs` would print for a commit made now. */
function today() {
	const d = new Date();
	const pad = (n) => String(n).padStart(2, "0");
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

let dirtyCache = null;
/** Paths with uncommitted changes (staged, unstaged, untracked; ignored files excluded). */
function dirtyPaths() {
	if (!dirtyCache) {
		const raw = execFileSync("git", ["status", "--porcelain", "-z"], {
			cwd: ROOT,
			encoding: "utf8",
		});
		// The output file is not a source of any page.
		dirtyCache = parsePorcelain(raw).filter((p) => p !== OUT_REL);
	}
	return dirtyCache;
}

/**
 * YYYY-MM-DD of the last change to any of `paths`: today when one of them has
 * uncommitted changes, else the last commit touching the existing ones, or null.
 */
function lastChangeDate(paths) {
	const pending = touches(paths, dirtyPaths()) ? today() : null;
	const existing = paths.filter((p) => existsSync(join(ROOT, p)));
	if (!existing.length) return pending;
	return newest(git(["log", "-1", "--format=%cs", "--", ...existing]) || null, pending);
}

/** Every directory named `name` under `root`, so the port layout can move without this script. */
function dirsNamed(root) {
	const index = new Map();
	if (!existsSync(join(ROOT, root))) return index;
	const walk = (dir) => {
		for (const entry of readdirSync(join(ROOT, dir))) {
			if (entry === "node_modules" || entry.startsWith(".")) continue;
			const rel = join(dir, entry);
			if (!statSync(join(ROOT, rel)).isDirectory()) continue;
			index.set(entry, [...(index.get(entry) ?? []), rel]);
			walk(rel);
		}
	};
	walk(root);
	return index;
}

function build() {
	if (git(["rev-parse", "--is-shallow-repository"]) === "true") {
		console.error("sitemap-lastmod: shallow clone — dates would be wrong, refusing to run.");
		process.exit(CHECK ? 0 : 1);
	}

	const ports = new Map();
	for (const [name, dirs] of [...dirsNamed("react/src"), ...dirsNamed("vue/src")]) {
		ports.set(name, [...(ports.get(name) ?? []), ...dirs]);
	}

	const components = {};
	for (const slug of readdirSync(join(ROOT, "src/lib/fancy-ui")).sort()) {
		if (slug.startsWith("_") || !statSync(join(ROOT, "src/lib/fancy-ui", slug)).isDirectory())
			continue;
		const date = lastChangeDate(componentSources(slug, ports));
		if (date) components[slug] = date;
	}

	const inspiration = {};
	const entriesDir = "src/lib/inspiration/entries";
	for (const file of readdirSync(join(ROOT, entriesDir)).sort()) {
		if (!file.endsWith(".ts") || file.endsWith(".test.ts")) continue;
		const slug = file.slice(0, -3);
		const date = lastChangeDate([`${entriesDir}/${file}`, `src/lib/inspiration/demos/${slug}`]);
		if (date) inspiration[slug] = date;
	}

	const statics = {};
	for (const [path, sources] of Object.entries(STATIC_SOURCES)) {
		const date = lastChangeDate(sources);
		if (date) statics[path] = date;
	}

	return {
		static: statics,
		components,
		recipes: lastChangeDate(["src/lib/docs/recipes", "src/routes/docs/recipes"]),
		inspiration,
	};
}

function main() {
	const next = `${JSON.stringify(build(), null, "\t")}\n`;

	if (CHECK) {
		const current = existsSync(OUT) ? readFileSync(OUT, "utf8") : "";
		if (current !== next) {
			console.error(`sitemap-lastmod: ${OUT} is stale — run \`pnpm build:sitemap-lastmod\`.`);
			process.exit(1);
		}
		console.log("sitemap-lastmod: up to date.");
	} else {
		mkdirSync(dirname(OUT), { recursive: true });
		writeFileSync(OUT, next);
		const n = Object.keys(JSON.parse(next).components).length;
		console.log(`sitemap-lastmod: wrote ${OUT} (${n} components).`);
	}
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main();
