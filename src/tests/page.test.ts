import { render, screen, cleanup } from "@testing-library/svelte";
import { afterEach, describe, it, expect } from "vitest";
import Page from "../routes/+page.svelte";

describe("+page.svelte", () => {
	afterEach(cleanup);

	// Queried by accessible name, not textContent: the hero splits the headline into
	// one aria-hidden <span> per glyph so each can animate in separately, and the
	// name comes from the sr-only copy that sits alongside them.
	it("renders the heading", () => {
		render(Page);
		expect(
			screen.getByRole("heading", {
				level: 1,
				name: /Build stunning interfaces, effortlessly\./i,
			})
		).toBeInTheDocument();
	});

	it("renders the tagline text", () => {
		render(Page);
		expect(screen.getByText(/Fancy UI is a modern UI kit and design system/i)).toBeInTheDocument();
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
