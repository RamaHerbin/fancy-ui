import { describe, it, expect } from "vitest";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { recipesRegistry } from "./recipes/registry.js";
import { sourcePathForRoute } from "./page-sources.js";

const root = join(import.meta.dirname, "..", "..", "..");

describe("sourcePathForRoute", () => {
	const gettingStarted = readdirSync(join(root, "src/routes/docs/getting-started"), {
		withFileTypes: true,
	})
		.filter((d) => d.isDirectory())
		.map((d) => d.name);

	it("covers every getting-started route with an existing file", () => {
		expect(gettingStarted.length).toBe(5);
		for (const slug of gettingStarted) {
			const path = sourcePathForRoute(`/docs/getting-started/${slug}`);
			expect(path, slug).not.toBeNull();
			expect(existsSync(join(root, path!)), `${slug} -> ${path}`).toBe(true);
		}
	});

	it("maps getting-started pages to their page component", () => {
		expect(sourcePathForRoute("/docs/getting-started/introduction")).toBe(
			"src/lib/components/docs/IntroductionPage.svelte"
		);
		expect(sourcePathForRoute("/docs/getting-started/changelog")).toBe(
			"src/lib/components/docs/ChangelogPage.svelte"
		);
	});

	it("maps every recipe to the recipes registry", () => {
		for (const recipe of recipesRegistry) {
			expect(sourcePathForRoute(`/docs/recipes/${recipe.slug}`)).toBe(
				"src/lib/docs/recipes/registry.ts"
			);
		}
	});

	it("maps a component to its folder", () => {
		expect(sourcePathForRoute("/docs/components/accordion")).toBe("src/lib/fancy-ui/accordion");
	});

	it("tolerates a trailing slash", () => {
		expect(sourcePathForRoute("/docs/components/accordion/")).toBe("src/lib/fancy-ui/accordion");
	});

	it("returns null for unknown routes", () => {
		expect(sourcePathForRoute("/docs/components/not-a-component")).toBeNull();
		expect(sourcePathForRoute("/docs/recipes/not-a-recipe")).toBeNull();
		expect(sourcePathForRoute("/docs/getting-started/nope")).toBeNull();
		expect(sourcePathForRoute("/inspiration")).toBeNull();
		expect(sourcePathForRoute("")).toBeNull();
	});
});
