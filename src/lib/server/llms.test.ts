import { describe, expect, it } from "vitest";
import { getAllComponents, getComponent } from "$lib/fancy-ui/registry.js";
import {
	componentMarkdown,
	exampleSources,
	generateLlmsFullTxt,
	generateLlmsTxt,
	generateRegistryJson,
	importNames,
	markdownUrl,
	primaryExample,
	reactImportNames,
	typeExports,
	vueImportNames,
} from "./llms.js";
import { parseBarrelTypeExports, vueExportsBySlug } from "./barrels.js";

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

describe("registry.json", () => {
	const json = generateRegistryJson();

	it("lists every live component once, with the fields tools need", () => {
		expect(json.count).toBe(live.length);
		expect(new Set(json.components.map((c) => c.slug)).size).toBe(live.length);
		for (const c of json.components) {
			expect(c.import.names.length).toBeGreaterThan(0);
			expect(c.markdown).toBe(`${c.docs}.md`);
		}
	});

	it("carries the Vue import next to the React one", () => {
		const beam = json.components.find((c) => c.slug === "border-beam")!;
		expect(beam.vue).toEqual({ package: "fancy-ui-vue", names: ["BorderBeam"] });
		for (const c of json.components) {
			if (!c.vue) continue;
			for (const name of c.vue.names) expect(vueExportsBySlug.get(c.slug)).toContain(name);
		}
		expect(json.components.filter((c) => c.vue).length).toBeGreaterThan(100);
	});
});
