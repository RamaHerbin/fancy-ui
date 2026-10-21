/**
 * Static gate for how a component page finds its previews.
 *
 * The hero preview (DemoRenderer) and the example previews (ExamplesSection)
 * swallow a failed lookup and show a placeholder, so a slug that does not
 * resolve ships as "No preview available" with every other check green. This
 * gate checks the wiring without a browser:
 *
 *   - registry slugs = example folders = examplesRegistry keys;
 *   - every examplesRegistry entry has its example file;
 *   - every slug resolves: listed in skipDirectRender (its BasicUsage, or the
 *     PREVIEW_EXAMPLE override, exists) or in componentNames (the module
 *     exists and exports that name);
 *   - every PREVIEW_EXAMPLE and SKIN_PREVIEW target exists;
 *   - no lookup table names a slug the registry does not know.
 *
 * componentNames and SKIN_PREVIEW live in DemoRenderer's instance script, so
 * they are read from its source; the parse fails loudly if they move.
 */

import { describe, expect, it } from "vitest";
import { registry } from "$lib/fancy-ui/registry.js";
import { examplesRegistry, type ExampleMeta } from "./examples/registry.js";
import { PREVIEW_EXAMPLE, skipDirectRender } from "./DemoRenderer.svelte";
import demoRendererSource from "./DemoRenderer.svelte?raw";

interface PreviewWiring {
	registrySlugs: string[];
	exampleFiles: string[];
	examplesRegistry: Record<string, Pick<ExampleMeta, "name">[]>;
	skipDirectRender: ReadonlySet<string>;
	componentNames: Record<string, string>;
	previewExample: Record<string, string>;
	skinPreview: Record<string, Record<string, string>>;
	/** Export names per slug that has a module; a slug missing here has no index.ts. */
	moduleExports: Record<string, readonly string[]>;
}

/** Every way a slug can fail to resolve, one message per problem. */
function findResolutionProblems(w: PreviewWiring): string[] {
	const problems: string[] = [];
	const registrySet = new Set(w.registrySlugs);
	const files = new Set(w.exampleFiles);
	const folders = new Set(w.exampleFiles.map((f) => f.split("/")[0]));
	const examplesKeys = new Set(Object.keys(w.examplesRegistry));
	const has = (slug: string, name: string) => files.has(`${slug}/${name}`);

	const diff = (a: Set<string>, b: Set<string>) => [...a].filter((x) => !b.has(x)).sort();
	for (const slug of diff(registrySet, folders)) problems.push(`${slug}: no example folder`);
	for (const slug of diff(folders, registrySet))
		problems.push(`${slug}: example folder for a slug the registry does not know`);
	for (const slug of diff(registrySet, examplesKeys))
		problems.push(`${slug}: missing from examplesRegistry`);
	for (const slug of diff(examplesKeys, registrySet))
		problems.push(`${slug}: examplesRegistry key the registry does not know`);

	for (const [slug, entries] of Object.entries(w.examplesRegistry)) {
		for (const { name } of entries) {
			if (!has(slug, name))
				problems.push(
					`${slug}: examplesRegistry lists ${name} but ${slug}/${name}.svelte does not exist`
				);
		}
	}

	for (const slug of [...registrySet].sort()) {
		if (w.skipDirectRender.has(slug)) {
			const target = w.previewExample[slug] ?? "BasicUsage";
			if (!has(slug, target))
				problems.push(`${slug}: renders ${slug}/${target}.svelte, which does not exist`);
			continue;
		}
		const name = w.componentNames[slug];
		if (!name) {
			problems.push(`${slug}: neither in skipDirectRender nor in componentNames`);
			continue;
		}
		const exports = w.moduleExports[slug];
		if (!exports) problems.push(`${slug}: no module at $lib/fancy-ui/${slug}/index.ts`);
		else if (!exports.includes(name))
			problems.push(`${slug}: $lib/fancy-ui/${slug}/index.ts does not export ${name}`);
	}

	for (const [slug, target] of Object.entries(w.previewExample)) {
		if (!has(slug, target))
			problems.push(`${slug}: PREVIEW_EXAMPLE target ${slug}/${target}.svelte does not exist`);
	}
	for (const [skin, map] of Object.entries(w.skinPreview)) {
		for (const [slug, target] of Object.entries(map)) {
			if (!has(slug, target))
				problems.push(
					`${slug}: SKIN_PREVIEW (${skin}) target ${slug}/${target}.svelte does not exist`
				);
		}
	}

	const tables: [string, Iterable<string>][] = [
		["skipDirectRender", w.skipDirectRender],
		["componentNames", Object.keys(w.componentNames)],
		["PREVIEW_EXAMPLE", Object.keys(w.previewExample)],
	];
	for (const [table, slugs] of tables) {
		for (const slug of slugs) {
			if (!registrySet.has(slug))
				problems.push(`${slug}: listed in ${table} but not in the registry`);
		}
	}
	return problems;
}

/** Body of `const <name>… = { … };` in DemoRenderer's source, or null when it is gone. */
function objectLiteral(source: string, name: string): string | null {
	const start = source.search(new RegExp(`(?:export\\s+)?const\\s+${name}\\b[^=]*=\\s*\\{`));
	if (start === -1) return null;
	const open = source.indexOf("{", start);
	let depth = 0;
	for (let i = open; i < source.length; i++) {
		if (source[i] === "{") depth++;
		else if (source[i] === "}" && --depth === 0) return source.slice(open + 1, i);
	}
	return null;
}

/** `"key": "value"` and `key: "value"` pairs of a flat object literal body. */
function stringPairs(body: string): Record<string, string> {
	const out: Record<string, string> = {};
	for (const m of body.matchAll(/(?:"([^"]+)"|([A-Za-z_$][\w$]*))\s*:\s*"([^"]*)"/g)) {
		out[m[1] ?? m[2]] = m[3];
	}
	return out;
}

function parseComponentNames(source: string): Record<string, string> {
	const body = objectLiteral(source, "componentNames");
	return body ? stringPairs(body) : {};
}

function parseSkinPreview(source: string): Record<string, Record<string, string>> | null {
	const body = objectLiteral(source, "SKIN_PREVIEW");
	if (body === null) return null;
	const out: Record<string, Record<string, string>> = {};
	for (const m of body.matchAll(/(?:"([^"]+)"|([A-Za-z_$][\w$]*))\s*:\s*\{([^}]*)\}/g)) {
		out[m[1] ?? m[2]] = stringPairs(m[3]);
	}
	return out;
}

const exampleFiles = Object.keys(import.meta.glob("./examples/*/*.svelte")).map((p) =>
	p.replace(/^\.\/examples\//, "").replace(/\.svelte$/, "")
);
const moduleLoaders = import.meta.glob("$lib/fancy-ui/*/index.ts");
const slugOfModule = (path: string) => path.split("/").at(-2) ?? "";

describe("preview resolution (static)", () => {
	const componentNames = parseComponentNames(demoRendererSource);
	const skinPreview = parseSkinPreview(demoRendererSource);

	it("reads componentNames and SKIN_PREVIEW from DemoRenderer", () => {
		expect(Object.keys(componentNames).length, "componentNames parsed").toBeGreaterThan(10);
		expect(skinPreview, "SKIN_PREVIEW parsed").not.toBeNull();
	});

	it("resolves a preview for every registry slug", async () => {
		const registrySlugs = Object.values(registry).map((c) => c.slug);
		const moduleExports: Record<string, string[]> = {};
		// Only the direct renders need their module's exports; skipDirectRender
		// slugs render an example file instead.
		const wanted = new Set(
			registrySlugs.filter((s) => !skipDirectRender.has(s) && componentNames[s])
		);
		await Promise.all(
			Object.entries(moduleLoaders).map(async ([path, load]) => {
				const slug = slugOfModule(path);
				moduleExports[slug] = wanted.has(slug)
					? Object.keys((await load()) as Record<string, unknown>)
					: [];
			})
		);

		const problems = findResolutionProblems({
			registrySlugs,
			exampleFiles,
			examplesRegistry,
			skipDirectRender,
			componentNames,
			previewExample: PREVIEW_EXAMPLE,
			skinPreview: skinPreview ?? {},
			moduleExports,
		});
		expect(problems).toEqual([]);
	}, 60_000);
});

describe("findResolutionProblems", () => {
	const healthy: PreviewWiring = {
		registrySlugs: ["alpha", "beta"],
		exampleFiles: ["alpha/BasicUsage", "beta/BasicUsage", "beta/Navbar"],
		examplesRegistry: { alpha: [{ name: "BasicUsage" }], beta: [{ name: "BasicUsage" }] },
		skipDirectRender: new Set(["beta"]),
		componentNames: { alpha: "Alpha" },
		previewExample: { beta: "Navbar" },
		skinPreview: { retro: { beta: "BasicUsage" } },
		moduleExports: { alpha: ["Alpha"], beta: [] },
	};

	it("passes a consistent wiring", () => {
		expect(findResolutionProblems(healthy)).toEqual([]);
	});

	it("names every break a page would otherwise hide behind a placeholder", () => {
		const problems = findResolutionProblems({
			...healthy,
			registrySlugs: ["alpha", "beta", "gamma", "delta"],
			exampleFiles: ["alpha/BasicUsage", "beta/BasicUsage", "delta/BasicUsage", "stale/BasicUsage"],
			examplesRegistry: {
				alpha: [{ name: "BasicUsage" }, { name: "Missing" }],
				beta: [{ name: "BasicUsage" }],
				delta: [{ name: "BasicUsage" }],
			},
			componentNames: { alpha: "Wrong", delta: "Delta", ghost: "Ghost" },
			previewExample: { beta: "Navbar" },
			skinPreview: { retro: { alpha: "RetroPixel" } },
			moduleExports: { alpha: ["Alpha"] },
		});
		expect(problems).toEqual([
			"gamma: no example folder",
			"stale: example folder for a slug the registry does not know",
			"gamma: missing from examplesRegistry",
			"alpha: examplesRegistry lists Missing but alpha/Missing.svelte does not exist",
			"alpha: $lib/fancy-ui/alpha/index.ts does not export Wrong",
			"beta: renders beta/Navbar.svelte, which does not exist",
			"delta: no module at $lib/fancy-ui/delta/index.ts",
			"gamma: neither in skipDirectRender nor in componentNames",
			"beta: PREVIEW_EXAMPLE target beta/Navbar.svelte does not exist",
			"alpha: SKIN_PREVIEW (retro) target alpha/RetroPixel.svelte does not exist",
			"ghost: listed in componentNames but not in the registry",
		]);
	});

	it("parses DemoRenderer-shaped object literals", () => {
		const source = `
	const SKIN_PREVIEW: Record<string, Record<string, string>> = {
		"retro-os": { "fluid-cursor": "RetroPixel" },
	};
	const componentNames: Record<string, string> = {
		// a comment
		button: "Button",
		"copy-button": "CopyButton",
	};`;
		expect(parseComponentNames(source)).toEqual({ button: "Button", "copy-button": "CopyButton" });
		expect(parseSkinPreview(source)).toEqual({ "retro-os": { "fluid-cursor": "RetroPixel" } });
		expect(parseComponentNames("const other = {};")).toEqual({});
		expect(parseSkinPreview("")).toBeNull();
	});
});
