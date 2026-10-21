#!/usr/bin/env node
/**
 * Checks what a consumer actually installs, for the three published packages.
 *
 *   node scripts/check-dist-env.mjs [--require-built] [package-dir...]
 *
 * Package dirs default to `.`, `react` and `vue`. For each one the shipped file
 * list comes from `npm pack --dry-run`, so the `files` whitelist is honoured:
 * the root `dist/` also holds the docs site's own components, which never ship
 * and are not checked. Three rules, each a way the package can work in this
 * repo and break in somebody else's app:
 *
 *  1. No raw `import.meta.env` read. It is a bundler convention, not a
 *     language feature: other toolchains leave it undefined or warn on every
 *     build. Dev-only code reads the literal `process.env.NODE_ENV` inside a
 *     try/catch instead (see `src/lib/fancy-ui/_internals/env.ts`).
 *  2. No `$app/*` or `$env/*` import. Those modules exist only inside a
 *     SvelteKit build; anywhere else (plain Vite + Svelte, Vitest, Storybook)
 *     the import is unresolved and the consumer's build stops.
 *  3. The documented entry points exist (`.`, `./cameleon`, `./tailwind.css`,
 *     `./package.json`), and every `exports` target is a file the package
 *     actually ships.
 *
 * A package with no shipped code is reported as not built and skipped, or
 * fails under `--require-built` (what CI passes, after the builds).
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";

/** Entry points every package documents in its README and PORTING contract. */
const REQUIRED_SUBPATHS = [".", "./cameleon", "./tailwind.css", "./package.json"];

const CODE = /\.(js|mjs|cjs|ts|mts|svelte|vue|jsx|tsx)$/;

const RULES = [
	{
		test: (line) => line.includes("import.meta.env"),
		why: "raw `import.meta.env` read (bundler-specific; undefined or warned about in other toolchains)",
	},
	{
		test: (line) => /(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s+)["'`]\$(?:app|env)\//.test(line),
		why: "imports a SvelteKit-only module (`$app/*` / `$env/*`), unresolved outside a SvelteKit build",
	},
];

const args = process.argv.slice(2);
const requireBuilt = args.includes("--require-built");
const dirs = args.filter((a) => !a.startsWith("--"));
const packages = dirs.length ? dirs : [".", "react", "vue"];

/** Paths (relative to the package) that `npm pack` would put in the tarball. */
function shippedFiles(dir) {
	const out = execFileSync("npm", ["pack", "--dry-run", "--json", "--ignore-scripts"], {
		cwd: dir,
		encoding: "utf8",
		stdio: ["ignore", "pipe", "pipe"],
		env: { ...process.env, npm_config_loglevel: "silent" },
	});
	const [report] = JSON.parse(out);
	return report.files.map((f) => f.path.replace(/\\/g, "/"));
}

/** Every string leaf of an `exports` map, with the subpath it belongs to. */
function exportTargets(exports, subpath = ".") {
	if (typeof exports === "string") return [[subpath, exports]];
	if (!exports || typeof exports !== "object") return [];
	return Object.entries(exports).flatMap(([key, value]) =>
		exportTargets(value, key.startsWith(".") ? key : subpath)
	);
}

let failed = false;
for (const dir of packages) {
	const abs = resolve(dir);
	const manifest = JSON.parse(readFileSync(join(abs, "package.json"), "utf8"));
	const name = manifest.name ?? dir;
	const problems = [];
	const shipped = shippedFiles(abs);
	const set = new Set(shipped);
	const code = shipped.filter((p) => CODE.test(p));

	if (!code.some((p) => /\.(js|mjs|cjs|svelte|vue)$/.test(p))) {
		const note = `${name}: not built (no shipped code under ${abs})`;
		if (requireBuilt) {
			failed = true;
			console.error(`FAIL ${note}`);
		} else {
			console.log(`skip ${note}`);
		}
		continue;
	}

	for (const path of code) {
		const lines = readFileSync(join(abs, path), "utf8").split("\n");
		lines.forEach((line, i) => {
			for (const rule of RULES) {
				if (rule.test(line)) problems.push(`${path}:${i + 1}: ${rule.why}\n      ${line.trim()}`);
			}
		});
	}

	const exportsMap = manifest.exports ?? {};
	for (const subpath of REQUIRED_SUBPATHS) {
		if (!(subpath in exportsMap)) problems.push(`exports has no ${JSON.stringify(subpath)} entry`);
	}
	for (const [subpath, target] of exportTargets(exportsMap)) {
		const rel = target.replace(/^\.\//, "");
		const ok = rel.includes("*")
			? shipped.some((p) => p.startsWith(rel.slice(0, rel.indexOf("*"))))
			: set.has(rel);
		if (!ok)
			problems.push(`exports[${JSON.stringify(subpath)}] -> ${target} is not in the tarball`);
	}

	if (problems.length) {
		failed = true;
		console.error(`FAIL ${name} (${code.length} shipped code files)`);
		for (const p of problems) console.error(`  - ${p}`);
	} else {
		console.log(`ok   ${name} (${code.length} shipped code files, ${shipped.length} files in all)`);
	}
}

if (failed) {
	console.error(
		"\ncheck-dist-env: a published package would break in a consumer's build (see above)."
	);
	process.exit(1);
}
