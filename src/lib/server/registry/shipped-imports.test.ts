// The published package must work in any Svelte app, not only a SvelteKit one.
// `$app/*` and `$env/*` are virtual modules that only the SvelteKit plugin
// resolves, so no file that ends up in the npm tarball may import them.
//
// Two checks: the sources behind every entry of package.json "files" (always
// runs), and the built dist/ output when `pnpm package` has produced it.
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as { files: string[] };

const KIT_ONLY = /(?:from\s*|import\s*\(\s*|import\s+)["'](\$(?:app|env)\/[^"']+)["']/g;
const CODE = /\.(?:svelte|ts|js|mjs)$/;
const SKIP = /(?:\.test\.|\.spec\.|web-audio-mock\.|README\.md$|\/_template\/)/;

function walk(path: string, out: string[] = []): string[] {
	if (!existsSync(path)) return out;
	if (statSync(path).isDirectory()) {
		for (const entry of readdirSync(path)) walk(join(path, entry), out);
	} else if (CODE.test(path) && !SKIP.test(path)) {
		out.push(path);
	}
	return out;
}

function offenders(files: string[]): string[] {
	const found: string[] = [];
	for (const file of files) {
		const text = readFileSync(file, "utf8");
		for (const match of text.matchAll(KIT_ONLY)) {
			found.push(`${relative(root, file)} -> ${match[1]}`);
		}
	}
	return found;
}

/** dist/<x>(.js|.d.ts) → the src/lib sources that svelte-package builds it from. */
function sourcesFor(entry: string): string[] {
	const rel = entry.replace(/^dist\//, "");
	const base = join(root, "src/lib", rel);
	if (existsSync(base) && statSync(base).isDirectory()) return walk(base);
	const stem = base.replace(/\.(?:d\.ts|js)$/, "");
	return [`${stem}.ts`, `${stem}.js`, `${stem}.svelte`].filter((p) => existsSync(p));
}

describe("shipped files stay framework-free", () => {
	const included = pkg.files.filter((f) => !f.startsWith("!"));

	it("no published source imports $app/ or $env/", () => {
		const files = [...new Set(included.flatMap(sourcesFor))];
		expect(files.length).toBeGreaterThan(0);
		expect(offenders(files)).toEqual([]);
	});

	it("no built dist file imports $app/ or $env/", (ctx) => {
		if (!existsSync(join(root, "dist"))) {
			console.info("[shipped-imports] dist/ not built — run `pnpm package` to check the output too.");
			ctx.skip();
			return;
		}
		const files = [...new Set(included.flatMap((f) => walk(join(root, f))))];
		expect(offenders(files)).toEqual([]);
	});
});
