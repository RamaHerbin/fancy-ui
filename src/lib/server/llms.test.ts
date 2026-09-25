import { describe, expect, it } from "vitest";
import { getAllComponents, getComponent } from "$lib/fancy-ui/registry.js";
import {
	componentMarkdown,
	exampleSources,
	generateLlmsFullTxt,
	generateLlmsTxt,
	generateRegistryJson,
	importNames,
	primaryExample,
	reactImportNames,
} from "./llms.js";

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
});
