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
 *   pnpm build:sitemap-lastmod --check    # exit 1 when the committed file is stale
 *
 * Dates are per page, not per registry edit: a component page follows its
 * source folder, its docs examples and its React/Vue ports; a recipe page
 * follows the recipes module; an inspiration page follows its entry file.
 * A page that nobody touched keeps its old date — too old is honest, too new
 * is not.
 */

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "src/lib/generated/sitemap-lastmod.json");
const CHECK = process.argv.includes("--check");

/** Static sitemap URLs → the sources whose last commit dates them. */
const STATIC_SOURCES = {
	"/": ["src/routes/+page.svelte", "src/lib/components/home"],
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

function git(args) {
	return execFileSync("git", args, { cwd: ROOT, encoding: "utf8" }).trim();
}

/** YYYY-MM-DD of the last commit touching any of `paths` (existing ones only), or null. */
function lastCommitDate(paths) {
	const existing = paths.filter((p) => existsSync(join(ROOT, p)));
	if (!existing.length) return null;
	return git(["log", "-1", "--format=%cs", "--", ...existing]) || null;
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
		const date = lastCommitDate([
			`src/lib/fancy-ui/${slug}`,
			`src/lib/components/docs/examples/${slug}`,
			...(ports.get(slug) ?? []),
		]);
		if (date) components[slug] = date;
	}

	const inspiration = {};
	const entriesDir = "src/lib/inspiration/entries";
	for (const file of readdirSync(join(ROOT, entriesDir)).sort()) {
		if (!file.endsWith(".ts") || file.endsWith(".test.ts")) continue;
		const slug = file.slice(0, -3);
		const date = lastCommitDate([`${entriesDir}/${file}`, `src/lib/inspiration/demos/${slug}`]);
		if (date) inspiration[slug] = date;
	}

	const statics = {};
	for (const [path, sources] of Object.entries(STATIC_SOURCES)) {
		const date = lastCommitDate(sources);
		if (date) statics[path] = date;
	}

	return {
		static: statics,
		components,
		recipes: lastCommitDate(["src/lib/docs/recipes", "src/routes/docs/recipes"]),
		inspiration,
	};
}

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
