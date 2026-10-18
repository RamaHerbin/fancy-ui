import { render, screen, cleanup, within } from "@testing-library/svelte";
import { afterEach, beforeAll, describe, it, expect } from "vitest";
import Page from "../routes/+page.svelte";
import { load } from "../routes/+page.server.js";

type Data = Awaited<ReturnType<typeof load>> & Record<string, unknown>;

let data: Data;

beforeAll(async () => {
	// The real prerender data: catalog, collections and framework badges.
	data = (await load({} as Parameters<typeof load>[0])) as Data;
});

function renderPage() {
	return render(Page, { props: { data } as never });
}

describe("+page.svelte", () => {
	afterEach(cleanup);

	it("renders the heading", () => {
		renderPage();
		expect(
			screen.getByRole("heading", { level: 1, name: /Interfaces\s*that feel\s*alive\./i })
		).toBeInTheDocument();
	});

	it("renders the subtitle", () => {
		renderPage();
		// The footer repeats the line; the hero's copy is the one in <main>.
		expect(
			within(screen.getByRole("main")).getByText(
				/UI inspiration and expressive components for React, Svelte, and Vue/i
			)
		).toBeInTheDocument();
	});

	it("links the two ways in", () => {
		renderPage();
		expect(screen.getByRole("link", { name: /Explore inspiration/i })).toHaveAttribute(
			"href",
			"/inspiration"
		);
		expect(screen.getByRole("link", { name: /Browse components/i })).toHaveAttribute(
			"href",
			"/docs/components"
		);
	});

	it("prints the component count from the data", () => {
		renderPage();
		expect(data.stats.components).toBeGreaterThan(0);
		expect(
			screen.getByText(new RegExp(`${data.stats.components} components · React · Svelte · Vue`))
		).toBeInTheDocument();
	});

	it("shows six preview cards with sized posters", () => {
		const { container } = renderPage();
		const cards = container.querySelectorAll("[data-preview-card]");
		expect(cards).toHaveLength(6);
		for (const card of cards) {
			const img = card.querySelector("img");
			expect(img).not.toBeNull();
			expect(Number(img!.getAttribute("width"))).toBeGreaterThan(0);
			expect(Number(img!.getAttribute("height"))).toBeGreaterThan(0);
		}
	});

	it("nests no interactive element inside another in a card", () => {
		const { container } = renderPage();
		const cards = container.querySelectorAll("[data-preview-card]");
		expect(cards.length).toBeGreaterThan(0);
		for (const card of cards) {
			expect(card.querySelector("a a, a button, button a, button button")).toBeNull();
		}
	});

	it("links three collections into the filtered gallery", () => {
		const { container } = renderPage();
		const links = container.querySelectorAll('a[href^="/inspiration?collection="]');
		expect(links).toHaveLength(3);
	});

	it("renders no canvas on first render", () => {
		const { container } = renderPage();
		expect(container.querySelector("canvas")).not.toBeInTheDocument();
	});

	it("offers the framework choice as a radio group", () => {
		renderPage();
		const groups = screen.getAllByRole("radiogroup");
		expect(groups.length).toBeGreaterThan(0);
		expect(within(groups[0]).getAllByRole("radio")).toHaveLength(3);
	});
});
