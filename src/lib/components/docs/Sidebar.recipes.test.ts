import { render, cleanup } from "@testing-library/svelte";
import { afterEach, describe, it, expect, vi } from "vitest";
import { readable } from "svelte/store";

// A recipe detail page: the index link has no exact match here.
vi.mock("$app/stores", () => ({
	page: readable({ url: new URL("http://localhost/docs/recipes/save-publish") }),
}));

import Sidebar from "./Sidebar.svelte";

describe("Sidebar recipes link", () => {
	afterEach(cleanup);

	it("renders the Recipes link with the skin hook shared by the index rows", () => {
		const { container } = render(Sidebar);
		const link = container.querySelector('a[href="/docs/recipes"]') as HTMLElement;
		expect(link).toBeInTheDocument();
		expect(link.closest(".docs-nav-components")).not.toBeNull();
	});

	it("keeps the Recipes link highlighted on a recipe detail page", () => {
		const { container } = render(Sidebar);
		const link = container.querySelector('a[href="/docs/recipes"]') as HTMLElement;
		expect(link.className).toContain("text-sidebar-accent-foreground");
	});
});
