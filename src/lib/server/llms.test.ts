import { describe, expect, it } from "vitest";
import { getAllComponents, getComponent } from "$lib/fancy-ui/registry.js";
import {
	componentMarkdown,
	exampleSources,
	generateLlmsFullTxt,
	generateLlmsTxt,
	generateRegistryJson,
	importNames,
	importNamesFor,
	markdownUrl,
	primaryExample,
	recipesSection,
	reactImportNames,
	typeExports,
	vueImportNames,
} from "./llms.js";
import { parseBarrelTypeExports, vueExportsBySlug } from "./barrels.js";
import { copySourcesFor } from "./copy-availability.js";
import { variantFor } from "./variants.js";
import {
	getRecipe,
	recipeMarkdownUrl,
	recipeUrl,
	recipesRegistry,
} from "$lib/docs/recipes/registry.js";

const barrels = import.meta.glob("../fancy-ui/*/index.ts", { eager: true }) as Record<
	string,
	Record<string, unknown>
>;
const live = getAllComponents().filter((c) => c.status === "done" && !c.deprecated);

describe("llms.txt", () => {
	const txt = generateLlmsTxt();

	it("links every live component to its Markdown page", () => {
		for (const c of live) {
			expect(txt).toContain(`(https://fancy-ui.rama.app/docs/components/${c.slug}.md)`);
		}
	});

	it("lists the React and Vue Markdown pages of every ported component", () => {
		for (const c of live) {
			if (reactImportNames(c)) {
				expect(txt).toContain(`https://fancy-ui.rama.app/docs/components/react/${c.slug}.md`);
			}
			if (vueImportNames(c)) {
				expect(txt).toContain(`https://fancy-ui.rama.app/docs/components/vue/${c.slug}.md`);
			}
		}
	});

	it("states the container rule per cursor instead of mounting every cursor at layout level", () => {
		expect(txt).not.toMatch(/mount them ONCE/i);
		expect(txt).toMatch(/FluidCursor[^\n]*`contained`/);
		expect(txt).toMatch(/ImageTrailCursor[^\n]*parent/);
		expect(txt).toMatch(/SmoothCursor[^\n]*fixed/);
	});

	it("does not forbid the exported Props types", () => {
		expect(txt).not.toMatch(/Do NOT import `XxxProps`/);
		expect(txt).toContain("Types:");
	});

	it("points to the full reference, the JSON registry and the React package", () => {
		expect(txt).toContain("/llms-full.txt");
		expect(txt).toContain("/registry.json");
		expect(txt).toContain("/humans.txt");
		expect(txt).toContain("fancy-ui-react");
	});
});

describe("llms-full.txt", () => {
	const full = generateLlmsFullTxt();

	it("imports only names the package really exports", () => {
		for (const c of live) {
			const exported = Object.keys(barrels[`../fancy-ui/${c.slug}/index.ts`] ?? {});
			for (const name of importNames(c)) expect(exported, `${c.slug}: ${name}`).toContain(name);
		}
	});

	it("inlines a short working example, with package imports, or links to the Markdown page", () => {
		const inlined = live.filter((c) => primaryExample(c.slug));
		expect(inlined.length).toBeGreaterThan(100);
		expect(full.match(/^Example \(/gm)?.length).toBe(inlined.length);
		for (const c of live.filter((c) => !primaryExample(c.slug) && exampleSources(c.slug).length)) {
			expect(full).toContain(`Examples: https://fancy-ui.rama.app/docs/components/${c.slug}.md`);
		}
		expect(full).not.toMatch(/\$lib\/fancy-ui/);
	});

	it("stays well within a model's context (< 80k tokens at ~4 bytes/token)", () => {
		expect(new TextEncoder().encode(full).length / 4).toBeLessThan(80_000);
	});
});

describe("componentMarkdown", () => {
	it("uses the real exports (card-3d exports CardContainer, not Card3D)", () => {
		const md = componentMarkdown(getComponent("card-3d")!);
		expect(md).toContain("CardContainer");
		expect(md).not.toMatch(/import \{ Card3D \}/);
	});

	it("carries props, examples and a React import when the component is ported", () => {
		const md = componentMarkdown(getComponent("compare")!);
		expect(md).toMatch(/^# Compare$/m);
		expect(md).toContain("| `firstImage` |");
		expect(md).toContain("## Examples");
		expect(md).toContain("from 'fancy-ui-svelte'");
		expect(md).toContain("from 'fancy-ui-react'");
		expect(md).not.toContain("$lib/");
	});

	it("escapes pipes in table cells", () => {
		const md = componentMarkdown(getComponent("compare")!);
		expect(md).toContain('`"hover" \\| "drag"`');
	});
});

describe("componentMarkdown per framework", () => {
	it("defaults to Svelte", () => {
		const c = getComponent("compare")!;
		expect(componentMarkdown(c)).toBe(componentMarkdown(c, "svelte"));
	});

	it("serves the React page with the React package, setup and docs example", () => {
		const md = componentMarkdown(getComponent("rainbow-button")!, "react");
		expect(md).toContain("`fancy-ui-react`");
		expect(md).toContain("npm install fancy-ui-react");
		expect(md).toContain('@import "fancy-ui-react/tailwind.css";');
		expect(md).toContain("import { RainbowButton } from 'fancy-ui-react';");
		expect(md).toContain("```tsx");
		expect(md).toContain("RainbowButtonExample");
		expect(md).not.toContain("fancy-ui-svelte");
		expect(md).not.toContain("fancy-ui-vue");
		expect(md).not.toContain("```svelte");
	});

	it("serves the Vue page with the Vue package, setup and docs example", () => {
		const md = componentMarkdown(getComponent("rainbow-button")!, "vue");
		expect(md).toContain("npm install fancy-ui-vue");
		expect(md).toContain('@import "fancy-ui-vue/styles.css";');
		expect(md).toContain("```vue");
		expect(md).toContain('import { RainbowButton } from "fancy-ui-vue";');
		expect(md).not.toContain("fancy-ui-svelte");
		expect(md).not.toContain("fancy-ui-react");
		expect(md).not.toContain("```svelte");
	});

	it("states the Vue class, attribute and ref rules the package actually follows", () => {
		const md = componentMarkdown(getComponent("rainbow-button")!, "vue");
		const guide = generateLlmsTxt();
		for (const text of [md, guide]) {
			expect(text).not.toContain("falls through to the root");
			expect(text).toContain("`inheritAttrs: false`");
			expect(text).toContain("where the Svelte component applies it");
			expect(text).toContain("except `ref`");
			expect(text).toContain("defineExpose({ ref })");
		}
	});

	it("falls back to the import line and a note, never another framework's code", () => {
		const c = getComponent("compare")!;
		for (const fw of ["react", "vue"] as const) {
			const md = componentMarkdown(c, fw);
			expect(md).toContain(`from 'fancy-ui-${fw}'`);
			expect(md).toContain("Svelte-only");
			expect(md).toContain(markdownUrl(c));
			expect(md).not.toContain("```svelte");
			expect(md).not.toContain("## Examples");
		}
	});

	it("lists the exported types of the framework's package", () => {
		const c = getComponent("border-beam")!;
		for (const fw of ["svelte", "react", "vue"] as const) {
			expect(typeExports(c, fw)).toContain("BorderBeamProps");
			expect(componentMarkdown(c, fw)).toMatch(/Types: .*`BorderBeamProps`/);
		}
	});

	it("gives each framework its own Markdown URL", () => {
		const c = getComponent("compare")!;
		expect(markdownUrl(c)).toBe("https://fancy-ui.rama.app/docs/components/compare.md");
		expect(markdownUrl(c, "react")).toBe(
			"https://fancy-ui.rama.app/docs/components/react/compare.md"
		);
		expect(markdownUrl(c, "vue")).toBe("https://fancy-ui.rama.app/docs/components/vue/compare.md");
	});
});

describe("parseBarrelTypeExports", () => {
	it("reads type-only lists, inline type specifiers and declarations", () => {
		expect(
			parseBarrelTypeExports(
				[
					'export { A, type AProps } from "./A";',
					'export type {\n\tB,\n\tBItem as Item,\n} from "./B";',
					"export type Size = keyof typeof SIZES;",
					"export interface Handle { x: number }",
					"export type lower = string;",
				].join("\n")
			)
		).toEqual(["AProps", "B", "Item", "Size", "Handle"]);
	});
});

describe("reactImportNames", () => {
	it("finds the React port's value exports and ignores type exports", () => {
		expect(reactImportNames(getComponent("compare")!)).toEqual(["Compare"]);
		expect(reactImportNames(getComponent("card-3d")!)).toEqual([
			"CardContainer",
			"CardBody",
			"CardItem",
		]);
	});

	it("returns null for a component with no React port", () => {
		expect(reactImportNames({ slug: "does-not-exist", name: "Nope" })).toBeNull();
	});
});

describe("registry.json v2", () => {
	const json = generateRegistryJson();
	const SITE = "https://fancy-ui.rama.app";

	it("names the project, not one package, and keeps the top-level links", () => {
		expect(json.name).toBe("fancy-ui");
		expect(json.version).toBe(2);
		expect(json.homepage).toBe(SITE);
		expect(json.llms).toBe(`${SITE}/llms.txt`);
		expect(json.count).toBe(live.length);
		expect(new Set(json.components.map((c) => c.slug)).size).toBe(live.length);
	});

	it("describes the three packages: npm name, install line and copy-source index", () => {
		expect(json.packages).toEqual({
			svelte: {
				name: "fancy-ui-svelte",
				install: "npm install fancy-ui-svelte",
				registry: `${SITE}/r/svelte/registry.json`,
			},
			react: {
				name: "fancy-ui-react",
				install: "npm install fancy-ui-react",
				registry: `${SITE}/r/registry.json`,
			},
			vue: {
				name: "fancy-ui-vue",
				install: "npm install fancy-ui-vue",
				registry: `${SITE}/r/vue/registry.json`,
			},
		});
	});

	it("gives every component its imports per framework, from the real exports", () => {
		for (const c of json.components) {
			const meta = getComponent(c.slug)!;
			expect(c.imports.svelte).toEqual({ package: "fancy-ui-svelte", names: importNames(meta) });
			const react = reactImportNames(meta);
			expect(c.imports.react).toEqual(react ? { package: "fancy-ui-react", names: react } : null);
			const vue = vueImportNames(meta);
			expect(c.imports.vue).toEqual(vue ? { package: "fancy-ui-vue", names: vue } : null);
			if (c.imports.vue) {
				for (const name of c.imports.vue.names)
					expect(vueExportsBySlug.get(c.slug)).toContain(name);
			}
		}
		expect(json.components.filter((c) => c.imports.vue).length).toBeGreaterThan(100);
	});

	it("links a Markdown page per framework, or null when the framework has no port", () => {
		for (const c of json.components) {
			const meta = getComponent(c.slug)!;
			expect(c.url).toBe(`${SITE}/docs/components/${c.slug}`);
			expect(c.docs.svelte).toBe(markdownUrl(meta));
			expect(c.docs.react).toBe(reactImportNames(meta) ? markdownUrl(meta, "react") : null);
			expect(c.docs.vue).toBe(vueImportNames(meta) ? markdownUrl(meta, "vue") : null);
		}
	});

	it("every Markdown URL resolves to that framework's page", () => {
		const route = new RegExp(`^${SITE}/docs/components/(?:(react|vue)/)?([a-z0-9-]+)\\.md$`);
		const PACKAGE = {
			svelte: "fancy-ui-svelte",
			react: "fancy-ui-react",
			vue: "fancy-ui-vue",
		} as const;
		let checked = 0;
		for (const c of json.components) {
			for (const url of Object.values(c.docs)) {
				if (!url) continue;
				const match = route.exec(url);
				expect(match, url).not.toBeNull();
				const framework = (match![1] ?? "svelte") as "svelte" | "react" | "vue";
				const meta = getComponent(match![2])!;
				expect(meta, url).toBeDefined();
				// The route only serves React and Vue pages for ported components.
				expect(importNamesFor(meta, framework), url).not.toBeNull();
				const md = componentMarkdown(meta, framework);
				expect(md.startsWith(`# ${meta.name}\n`), url).toBe(true);
				expect(md, url).toContain(`\`${PACKAGE[framework]}\``);
				checked++;
			}
		}
		expect(checked).toBeGreaterThan(live.length * 2);
	});

	it("points at the copy-source item of each framework that ships one", () => {
		for (const c of json.components) {
			const sources = copySourcesFor(c.slug);
			for (const fw of ["svelte", "react", "vue"] as const) {
				expect(c.copySource[fw], `${fw}/${c.slug}`).toBe(sources[fw]?.url ?? null);
			}
		}
		const beam = json.components.find((c) => c.slug === "border-beam")!;
		expect(beam.copySource).toEqual({
			svelte: `${SITE}/r/svelte/border-beam.json`,
			react: `${SITE}/r/border-beam.json`,
			vue: `${SITE}/r/vue/border-beam.json`,
		});
	});

	it("states each framework's availability the way the component pages do", () => {
		for (const c of json.components) {
			for (const fw of ["svelte", "react", "vue"] as const) {
				expect(c.availability[fw]).toBe(variantFor(c.slug, fw).availability);
			}
		}
	});
});

describe("accuracy of the per-framework names", () => {
	it("prints the React and Vue callback names the ports declare", () => {
		const c = getComponent("rainbow-button")!;
		const react = componentMarkdown(c, "react");
		expect(react).toMatch(/^\| `onClick` /m);
		expect(react).not.toMatch(/^\| `onclick` /m);
		const vue = componentMarkdown(c, "vue");
		expect(vue).toMatch(/^\| `@click` /m);
		expect(vue).not.toMatch(/^\| `onclick` /m);
	});

	it("names Vue slots the way a template writes them", () => {
		const vue = componentMarkdown(getComponent("rainbow-button")!, "vue");
		expect(vue).toMatch(/^\| `#default` \(Svelte `children`\) \|/m);
	});

	it("does not claim React keeps every callback name", () => {
		const txt = generateLlmsTxt();
		expect(txt).not.toContain("callbacks included");
		expect(txt).toContain("`onclick` becomes `onClick`");
	});

	it("introduces the three packages in the header", () => {
		const head = generateLlmsTxt().split("\n## ")[0];
		expect(head).toContain("fancy-ui-svelte");
		expect(head).toContain("fancy-ui-react");
		expect(head).toContain("fancy-ui-vue");
	});

	it("gives the Vue import next to the React one in llms-full.txt", () => {
		const full = generateLlmsFullTxt();
		expect(full).toContain("Vue: `import { BorderBeam } from 'fancy-ui-vue';`");
	});

	it("links the sound module's React and Vue pages to their real source folders", () => {
		const sound = getComponent("sound")!;
		expect(componentMarkdown(sound, "react")).toContain("/tree/main/react/src/sound");
		expect(componentMarkdown(sound, "vue")).toContain("/tree/main/vue/src/sound");
		expect(reactImportNames(sound)).toContain("SoundToggle");
		expect(vueImportNames(sound)).toContain("SoundToggle");
	});

	it("names a Svelte action row by the hook each port exports", () => {
		const sound = getComponent("sound")!;
		const barrels = import.meta.glob(["/react/src/sound/index.ts", "/vue/src/sound/index.ts"], {
			query: "?raw",
			import: "default",
			eager: true,
		}) as Record<string, string>;
		for (const fw of ["react", "vue"] as const) {
			const md = componentMarkdown(sound, fw);
			expect(md).toMatch(/^\| `useSoundFeedback` \(Svelte `use:soundFeedback`\) /m);
			expect(barrels[`/${fw}/src/sound/index.ts`]).toMatch(/\buseSoundFeedback\b/);
		}
	});
});

describe("recipes in the LLM surface", () => {
	it("prints no Recipes section when the registry is empty", () => {
		expect(recipesSection([])).toEqual([]);
	});

	it("lists every recipe in llms.txt with title, description and Markdown URL", () => {
		const txt = generateLlmsTxt();
		expect(txt).toContain("## Recipes");
		expect(txt.indexOf("## Components")).toBeLessThan(txt.indexOf("## Recipes"));
		expect(txt.indexOf("## Recipes")).toBeLessThan(txt.indexOf("## Full reference"));
		for (const r of recipesRegistry) {
			const line = txt.split("\n").find((l) => l.includes(recipeMarkdownUrl(r.slug)));
			expect(line, r.slug).toBeDefined();
			expect(line).toContain(r.title);
			expect(line).toContain(r.summary.split(". ")[0]);
			expect(line!.startsWith("- [")).toBe(true);
		}
	});

	it("includes each recipe's Markdown in llms-full.txt", () => {
		const full = generateLlmsFullTxt();
		expect(full).toContain("## Recipes");
		for (const r of recipesRegistry) {
			expect(full).toContain(`### ${r.title}`);
			expect(full).toContain(`- Docs: ${recipeUrl(r.slug)}`);
		}
	});

	it("lists recipes in registry.json", () => {
		const { recipes } = generateRegistryJson();
		expect(recipes.map((r) => r.slug)).toEqual(recipesRegistry.map((r) => r.slug));
		for (const r of recipes) {
			expect(r.url).toBe(recipeMarkdownUrl(r.slug));
			expect(r.title).toBe(getRecipe(r.slug)!.title);
		}
	});
});
