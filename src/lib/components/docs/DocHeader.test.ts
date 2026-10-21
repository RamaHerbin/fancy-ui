import { render, screen, cleanup } from "@testing-library/svelte";
import { readable } from "svelte/store";
import { afterEach, describe, it, expect, vi } from "vitest";

const state = vi.hoisted(() => ({ path: "/docs/components/card-3d" }));
vi.mock("$app/stores", () => ({
	get page() {
		return readable({ url: new URL("http://localhost" + state.path) });
	},
}));

import DocHeader from "./DocHeader.svelte";

const NAV = { name: "Documentation breadcrumb" };

describe("DocHeader", () => {
	afterEach(() => {
		cleanup();
		state.path = "/docs/components/card-3d";
	});

	it("labels the breadcrumb nav", () => {
		render(DocHeader);
		expect(screen.getByRole("navigation", NAV)).toBeInTheDocument();
	});

	it("resolves a component slug to its registry name", () => {
		render(DocHeader);
		const nav = screen.getByRole("navigation", NAV);
		expect(nav).toHaveTextContent("Card3D");
		expect(nav).not.toHaveTextContent("Card 3d");
		expect(screen.getByRole("link", { name: "Components" })).toHaveAttribute(
			"href",
			"/docs/components"
		);
	});

	it("resolves getting-started pages", () => {
		state.path = "/docs/getting-started/theme-generator";
		render(DocHeader);
		const nav = screen.getByRole("navigation", NAV);
		expect(nav).toHaveTextContent("Getting Started");
		expect(nav).toHaveTextContent("Theme Generator");
	});

	it("resolves recipe slugs to their title", () => {
		state.path = "/docs/recipes/undo-toast";
		render(DocHeader);
		const nav = screen.getByRole("navigation", NAV);
		expect(nav).toHaveTextContent("Recipes");
		expect(nav).toHaveTextContent("Undo with a toast");
	});

	it("links a logo to the landing page, hidden from lg up", () => {
		const { container } = render(DocHeader);
		const logo = container.querySelector("a[data-docs-logo]");
		expect(logo).toHaveAttribute("href", "/");
		expect(logo?.className).toContain("lg:hidden");
	});

	it("has an icon-only search trigger for narrow widths", () => {
		render(DocHeader);
		const btn = screen.getByRole("button", { name: "Search" });
		expect(btn.className).toContain("sm:hidden");
	});

	it("links GitHub from the site constant", () => {
		render(DocHeader);
		expect(screen.getByRole("link", { name: /GitHub/ })).toHaveAttribute(
			"href",
			"https://github.com/RamaHerbin/fancy-ui"
		);
	});
});
