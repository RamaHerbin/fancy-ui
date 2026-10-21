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
import { setSkin } from "$lib/stores";

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

	it("names the logo link by where it goes", () => {
		const { container } = render(DocHeader);
		expect(container.querySelector("a[data-docs-logo]")).toHaveAttribute(
			"aria-label",
			"Back to FancyUI home"
		);
	});

	it("drops the star count below sm so the current crumb keeps its room", async () => {
		localStorage.setItem("fancyui:github-stars", JSON.stringify({ value: 4321, at: Date.now() }));
		try {
			render(DocHeader);
			const stars = await screen.findByText("4.3K");
			expect(stars.className).toContain("hidden");
			expect(stars.className).toContain("sm:inline-flex");
		} finally {
			localStorage.removeItem("fancyui:github-stars");
		}
	});

	it("makes the retro menubar wordmark the link to the landing page", () => {
		setSkin("retro-os");
		try {
			const { container } = render(DocHeader);
			const brand = container.querySelector("a.retro-brand");
			expect(brand).toHaveAttribute("href", "/");
			expect(brand).toHaveAttribute("aria-label", "Back to FancyUI home");
			expect(brand?.textContent).toContain("FANCYUI");
			// The header logo only covers the widths where the wordmark is hidden.
			expect(container.querySelector("a[data-docs-logo]")?.className).toContain("sm:hidden");
		} finally {
			setSkin("standard");
		}
	});

	it("links GitHub from the site constant", () => {
		render(DocHeader);
		expect(screen.getByRole("link", { name: /GitHub/ })).toHaveAttribute(
			"href",
			"https://github.com/RamaHerbin/fancy-ui"
		);
	});

	it("lets the breadcrumb grow and shrink while the controls keep their width", () => {
		const { container } = render(DocHeader);
		const crumbs = container.querySelector("nav[data-docs-crumbs]");
		const controls = container.querySelector("[data-docs-controls]");
		expect(crumbs?.className).toContain("flex-1");
		expect(crumbs?.className).toContain("min-w-0");
		expect(controls?.className).toContain("shrink-0");
		expect(controls?.className).not.toContain("flex-1");
	});
});
