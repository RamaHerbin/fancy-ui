import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const examplesDir = join(root, "src/lib/components/docs/examples");
const componentsDir = join(root, "src/lib/fancy-ui");

function walk(dir: string, ext: string): string[] {
	const out: string[] = [];
	for (const name of readdirSync(dir)) {
		const p = join(dir, name);
		if (statSync(p).isDirectory()) out.push(...walk(p, ext));
		else if (p.endsWith(ext)) out.push(p);
	}
	return out;
}

/** Import specifiers that start with `$lib/`. */
function libImports(src: string): string[] {
	return [...src.matchAll(/from\s+["'](\$lib\/[^"']*)["']/g)].map((m) => m[1]);
}

/**
 * Examples may import `$lib/fancy-ui[/...]` (the docs rewrite it to the package
 * name), but never an internal path or any other `$lib/` module: copied code
 * could not resolve those.
 */
/**
 * Docs-site helper components that examples still use (replay and props
 * playground chrome). Known, out of scope for this check; do not add to it.
 */
const DOCS_HELPERS = new Set([
	"$lib/components/ReplayButton.svelte",
	"$lib/components/PropsPlayground.svelte",
	"$lib/stores/theme.svelte",
]);

function isConsumable(spec: string): boolean {
	if (DOCS_HELPERS.has(spec)) return true;
	return /^\$lib\/fancy-ui(\/.*)?$/.test(spec) && !spec.includes("_internals");
}

describe("consumable docs imports", () => {
	it("examples never import internals or non-library $lib modules", () => {
		const files = walk(examplesDir, ".svelte");
		expect(files.length).toBeGreaterThan(100);
		const bad = files.flatMap((f) =>
			libImports(readFileSync(f, "utf8"))
				.filter((s) => !isConsumable(s))
				.map((s) => `${relative(root, f)}: ${s}`)
		);
		expect(bad).toEqual([]);
	});

	it("component READMEs import from the package, not $lib", () => {
		const readmes = readdirSync(componentsDir)
			.filter((d) => !d.startsWith("_"))
			.map((d) => join(componentsDir, d, "README.md"))
			.filter((p) => {
				try {
					return statSync(p).isFile();
				} catch {
					return false;
				}
			});
		expect(readmes.length).toBeGreaterThan(5);
		const bad = readmes.flatMap((f) =>
			libImports(readFileSync(f, "utf8")).map((s) => `${relative(root, f)}: ${s}`)
		);
		expect(bad).toEqual([]);
	});
});
