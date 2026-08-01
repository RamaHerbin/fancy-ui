import { render, screen, cleanup } from "@testing-library/svelte";
import { afterEach, describe, it, expect } from "vitest";
import Page from "../routes/+page.svelte";

describe("+page.svelte", () => {
	afterEach(cleanup);

	// Queried by accessible name, not textContent: the hero duplicates "tiful" in
	// two aria-hidden layers to fake a glow, and those copies pollute textContent
	// while correctly staying out of the accessibility tree.
	it("renders the heading", () => {
		render(Page);
		expect(
			screen.getByRole("heading", {
				level: 1,
				name: /Build beautiful\s+interfaces effortlessly\./i,
			})
		).toBeInTheDocument();
	});

	it("renders the tagline text", () => {
		render(Page);
		expect(
			screen.getByText(
				/FancyUI is a modern, animated and accessible component library for Svelte 5/i
			)
		).toBeInTheDocument();
	});

	it("renders a link to the component list", () => {
		render(Page);
		const links = screen.getAllByRole("link", { name: /browse components/i });
		expect(links.length).toBeGreaterThan(0);
		links.forEach((link) => expect(link).toHaveAttribute("href", "/docs/components"));
	});

	it("renders every landing section", () => {
		render(Page);
		for (const heading of [
			/Everything you need/i,
			/Add FancyUI to your project/i,
			/in action/i,
			/Ready to build something/i,
		]) {
			expect(screen.getByRole("heading", { name: heading })).toBeInTheDocument();
		}
	});
});
