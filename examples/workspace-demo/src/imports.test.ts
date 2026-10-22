// The demo is a consumer, not a docs page: it may only reach the library
// through the entry points `fancy-ui-svelte` publishes. A relative import that
// climbs out of the app, an alias back into the monorepo's `src/lib`, or a
// deep path into `_internals` would all build fine here and break the day the
// app is copied out of the repo. This test reads every source file and fails
// on any specifier outside the allow-list below.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, extname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const APP_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const LIBRARY_PACKAGE = resolve(APP_ROOT, "../../package.json");

/** Subpaths the library declares in its `exports` map, e.g. ".", "./tailwind.css", "./cameleon/*". */
function publishedSubpaths(): string[] {
	const pkg = JSON.parse(readFileSync(LIBRARY_PACKAGE, "utf8")) as {
		name: string;
		exports: Record<string, unknown>;
	};
	expect(pkg.name).toBe("fancy-ui-svelte");
	return Object.keys(pkg.exports);
}

/** Bare specifiers the app may use besides the library itself. */
const ALLOWED_BARE = [
	/^svelte(\/[\w/-]+)?$/,
	/^@sveltejs\/kit(\/[\w/-]+)?$/,
	/^@sveltejs\/(adapter-static|vite-plugin-svelte)$/,
	/^@tailwindcss\/vite$/,
	/^tailwindcss$/,
	/^@lucide\/svelte(\/icons\/[\w-]+)?$/,
	/^\$app\/[\w/-]+$/,
	/^\$env\/[\w/-]+$/,
	/^vitest(\/config)?$/,
	/^@testing-library\/(svelte|jest-dom)(\/[\w/-]+)?$/,
	/^node:[\w/]+$/,
];

/** Fragments that never belong in a consumer import, whatever else matches. */
const FORBIDDEN_FRAGMENTS = ["_internals", "/dist/", "lib/fancy-ui", "components/docs", "/docs/"];

export type Verdict = { ok: true } | { ok: false; reason: string };

export function checkSpecifier(specifier: string, fromFile: string, subpaths: string[]): Verdict {
	for (const fragment of FORBIDDEN_FRAGMENTS) {
		if (specifier.includes(fragment)) return { ok: false, reason: `contains "${fragment}"` };
	}

	if (specifier.startsWith(".")) {
		const target = resolve(dirname(fromFile), specifier);
		const rel = relative(APP_ROOT, target);
		if (rel.startsWith("..") || rel.startsWith(sep)) {
			return { ok: false, reason: "relative import leaves the app" };
		}
		return { ok: true };
	}

	// `$lib` is the app's own src/lib (svelte.config.js declares no alias,
	// asserted below), never the library's source.
	if (specifier === "$lib" || specifier.startsWith("$lib/")) return { ok: true };

	if (specifier === "fancy-ui-svelte" || specifier.startsWith("fancy-ui-svelte/")) {
		const sub =
			specifier === "fancy-ui-svelte" ? "." : `.${specifier.slice("fancy-ui-svelte".length)}`;
		const published = subpaths.some((entry) =>
			entry.endsWith("/*") ? sub.startsWith(entry.slice(0, -1)) : sub === entry
		);
		return published
			? { ok: true }
			: { ok: false, reason: `"${sub}" is not in the package's exports map` };
	}

	if (ALLOWED_BARE.some((pattern) => pattern.test(specifier))) return { ok: true };
	return { ok: false, reason: "bare specifier outside the allow-list" };
}

const SOURCE_EXTENSIONS = new Set([".ts", ".js", ".svelte", ".css", ".html"]);

function walk(dir: string, out: string[] = []): string[] {
	for (const name of readdirSync(dir)) {
		if (name === "node_modules" || name.startsWith(".")) continue;
		const path = join(dir, name);
		if (statSync(path).isDirectory()) walk(path, out);
		else if (SOURCE_EXTENSIONS.has(extname(name))) out.push(path);
	}
	return out;
}

const SPECIFIER_PATTERNS = [
	/\bimport\s+(?:type\s+)?[\w*{}\s,$]*?\s*from\s*["']([^"']+)["']/g,
	/\bexport\s+(?:type\s+)?[\w*{}\s,$]*?\s*from\s*["']([^"']+)["']/g,
	/\bimport\s*["']([^"']+)["']/g,
	/\bimport\(\s*["']([^"']+)["']\s*\)/g,
	/@import\s+["']([^"']+)["']/g,
];

export function specifiersIn(source: string): string[] {
	const found = new Set<string>();
	for (const pattern of SPECIFIER_PATTERNS) {
		for (const match of source.matchAll(pattern)) found.add(match[1]);
	}
	return [...found];
}

function appFiles(): string[] {
	// This file is skipped: its self-test fixtures are deliberately bad imports.
	const self = fileURLToPath(import.meta.url);
	const files = walk(join(APP_ROOT, "src")).filter((file) => file !== self);
	for (const config of ["svelte.config.js", "vite.config.ts"]) files.push(join(APP_ROOT, config));
	return files;
}

describe("checkSpecifier (self-test)", () => {
	const subpaths = [".", "./tailwind.css", "./cameleon", "./cameleon/*"];
	const from = join(APP_ROOT, "src/routes/+page.svelte");

	it.each([
		"fancy-ui-svelte",
		"fancy-ui-svelte/tailwind.css",
		"fancy-ui-svelte/cameleon",
		"fancy-ui-svelte/cameleon/skins/retro-os/theme.css",
		"$lib/data/api",
		"$app/state",
		"svelte",
		"svelte/transition",
		"./+layout.svelte",
		"../lib/strings",
	])("accepts %s", (specifier) => {
		expect(checkSpecifier(specifier, from, subpaths)).toEqual({ ok: true });
	});

	it.each([
		"fancy-ui-svelte/dist/fancy-ui/button/Button.svelte",
		"fancy-ui-svelte/fancy-ui/_internals/motion",
		"fancy-ui-svelte/utils",
		"../../../../src/lib/fancy-ui/button/Button.svelte",
		"../../../../../src/lib/utils",
		"$lib/fancy-ui/button",
		"$lib/components/docs/Preview.svelte",
		"lodash",
	])("rejects %s", (specifier) => {
		expect(checkSpecifier(specifier, from, subpaths).ok).toBe(false);
	});

	it("reads every import form", () => {
		const source = [
			`import { a } from "x1";`,
			`import type { B } from 'x2';`,
			`import "x3";`,
			`const m = await import("x4");`,
			`@import "x5";`,
			`export { c } from "x6";`,
			`import Default, { d } from "x7";`,
		].join("\n");
		expect(specifiersIn(source).sort()).toEqual(["x1", "x2", "x3", "x4", "x5", "x6", "x7"]);
	});
});

describe("the app imports only the published surface", () => {
	const subpaths = publishedSubpaths();
	const files = appFiles();

	it("covers the shell, the four screens and the data layer", () => {
		const rel = files.map((file) => relative(APP_ROOT, file).split(sep).join("/"));
		for (const expected of [
			"src/routes/+layout.svelte",
			"src/routes/profile/+page.svelte",
			"src/routes/settings/+page.svelte",
			"src/routes/api-keys/+page.svelte",
			"src/routes/notifications/+page.svelte",
			"src/lib/shell/nav.ts",
			"src/lib/shell/WorkspaceNav.svelte",
			"src/lib/shell/ThemeToggle.svelte",
			"src/lib/shell/ScreenHeader.svelte",
			"src/lib/screens/Profile.svelte",
			"src/lib/screens/Settings.svelte",
			"src/lib/screens/ApiKeys.svelte",
			"src/lib/screens/Notifications.svelte",
			"src/lib/screens/undo.ts",
			"src/lib/data/api.ts",
			"src/lib/data/mock.ts",
			"src/lib/strings.ts",
			"src/app.css",
		]) {
			expect(rel).toContain(expected);
		}
	});

	it("uses the library through its public entry points", () => {
		const uses = files.flatMap((file) =>
			specifiersIn(readFileSync(file, "utf8")).filter((s) => s.startsWith("fancy-ui-svelte"))
		);
		expect(uses).toContain("fancy-ui-svelte");
		expect(uses).toContain("fancy-ui-svelte/tailwind.css");
	});

	it("has no forbidden import anywhere", () => {
		const violations: string[] = [];
		for (const file of files) {
			for (const specifier of specifiersIn(readFileSync(file, "utf8"))) {
				const verdict = checkSpecifier(specifier, file, subpaths);
				if (!verdict.ok) {
					violations.push(`${relative(APP_ROOT, file)}: "${specifier}" (${verdict.reason})`);
				}
			}
		}
		expect(violations).toEqual([]);
	});

	it("declares no alias that could point back into the monorepo", () => {
		for (const config of ["svelte.config.js", "vite.config.ts"]) {
			const source = readFileSync(join(APP_ROOT, config), "utf8");
			expect(source, config).not.toMatch(/\balias\s*:/);
			expect(source, config).not.toMatch(/\bfiles\s*:/);
		}
	});

	it("depends on the library as a workspace package", () => {
		const pkg = JSON.parse(readFileSync(join(APP_ROOT, "package.json"), "utf8"));
		expect(pkg.dependencies["fancy-ui-svelte"]).toBe("workspace:*");
	});
});
