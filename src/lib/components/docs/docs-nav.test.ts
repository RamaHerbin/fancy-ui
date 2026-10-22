import { describe, expect, it } from "vitest";
import { DOCS_SECTION_LINKS, nextDocsPage } from "./docs-nav.js";

describe("docs-nav", () => {
	it("exposes a Recipes entry pointing at the recipes index", () => {
		expect(DOCS_SECTION_LINKS).toContainEqual({ href: "/docs/recipes", key: "nav.recipes" });
	});

	it("still chains getting-started pages in order", () => {
		expect(nextDocsPage("/docs/getting-started/introduction")?.href).toBe(
			"/docs/getting-started/installation"
		);
		expect(nextDocsPage("/docs/recipes")).toBeUndefined();
	});
});
