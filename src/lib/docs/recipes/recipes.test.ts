import { describe, expect, it } from "vitest";
import { getComponent } from "$lib/fancy-ui/registry.js";
import {
	getAllRecipes,
	getRecipe,
	recipeMarkdownUrl,
	recipeUrl,
	recipesRegistry,
} from "./registry.js";
import { recipeMarkdown, recipeSources } from "./markdown.js";

describe("recipes registry", () => {
	it("ships the two launch recipes with unique slugs", () => {
		const slugs = recipesRegistry.map((r) => r.slug);
		expect(slugs).toEqual(["save-publish", "undo-toast"]);
		expect(new Set(slugs).size).toBe(slugs.length);
	});

	it("resolves recipes by slug and returns undefined for unknown ones", () => {
		expect(getRecipe("undo-toast")?.title).toBeTruthy();
		expect(getRecipe("nope")).toBeUndefined();
		expect(getAllRecipes()).toHaveLength(recipesRegistry.length);
	});

	it("only references components that exist in the library registry", () => {
		for (const recipe of recipesRegistry) {
			expect(recipe.components.length).toBeGreaterThan(0);
			for (const slug of recipe.components) {
				expect(getComponent(slug), `${recipe.slug} -> ${slug}`).toBeDefined();
			}
		}
	});

	it("gives every recipe a summary, steps and a trap to avoid", () => {
		for (const recipe of recipesRegistry) {
			expect(recipe.summary.length).toBeGreaterThan(20);
			expect(recipe.steps.length).toBeGreaterThan(1);
			expect(recipe.pitfalls.length).toBeGreaterThan(0);
		}
	});

	it("builds stable page and Markdown URLs", () => {
		expect(recipeUrl("undo-toast")).toBe("https://fancy-ui.rama.app/docs/recipes/undo-toast");
		expect(recipeMarkdownUrl("undo-toast")).toBe(
			"https://fancy-ui.rama.app/docs/recipes/undo-toast.md"
		);
	});
});

describe("recipe sources and Markdown", () => {
	it("has a compiled source in all three frameworks for every recipe", () => {
		for (const recipe of recipesRegistry) {
			const sources = recipeSources(recipe.slug);
			expect(sources.svelte).toContain("<script");
			expect(sources.react).toContain("fancy-ui-react");
			expect(sources.vue).toContain("fancy-ui-vue");
		}
	});

	it("renders the Svelte source with consumer imports, never the repo-internal path", () => {
		for (const recipe of recipesRegistry) {
			expect(recipeSources(recipe.slug).svelte).not.toContain("$lib/fancy-ui");
			expect(recipeSources(recipe.slug).svelte).toContain("fancy-ui-svelte");
		}
	});

	it("renders a Markdown page with title, steps, three code fences and component links", () => {
		const recipe = getRecipe("undo-toast")!;
		const md = recipeMarkdown(recipe);
		expect(md.startsWith(`# ${recipe.title}`)).toBe(true);
		expect(md).toContain("## Steps");
		expect(md).toContain("## Pitfalls");
		expect(md).toContain("```svelte");
		expect(md).toContain("```tsx");
		expect(md).toContain("```vue");
		expect(md).toContain("https://fancy-ui.rama.app/docs/components/toast.md");
		expect(md).toContain(recipeUrl(recipe.slug));
	});

	it("documents the close reasons of the undo recipe", () => {
		const md = recipeMarkdown(getRecipe("undo-toast")!);
		for (const reason of ["timeout", "dismiss", "action", "evicted"]) {
			expect(md).toContain(reason);
		}
	});
});
