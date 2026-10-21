import { render, cleanup } from "@testing-library/svelte";
import { afterEach, describe, it, expect, vi } from "vitest";
import BentoGrid from "./BentoGrid.svelte";
import BentoGridItem from "./BentoGridItem.svelte";
import BentoGridCard from "./BentoGridCard.svelte";

class MockIntersectionObserver {
	observe = vi.fn();
	disconnect = vi.fn();
	unobserve = vi.fn();
	takeRecords = vi.fn(() => []);
}
vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);
vi.stubGlobal("matchMedia", (query: string) => ({
	matches: false,
	media: query,
	onchange: null,
	addEventListener: () => {},
	removeEventListener: () => {},
	dispatchEvent: () => false,
	addListener: () => {},
	removeListener: () => {},
}));

describe("BentoGrid native attributes", () => {
	afterEach(cleanup);

	it("BentoGrid forwards id, data-testid and aria-label to the <div>", () => {
		const { getByTestId } = render(BentoGrid, {
			props: { id: "the-id", "data-testid": "the-el", "aria-label": "the label" },
		});
		const el = getByTestId("the-el");
		expect(el.tagName).toBe("DIV");
		expect(el.matches(".fancy-bento")).toBe(true);
		expect(el.id).toBe("the-id");
		expect(el).toHaveAttribute("aria-label", "the label");
	});

	it("BentoGrid keeps its managed attributes authoritative", () => {
		const { getByTestId } = render(BentoGrid, {
			props: { "data-state": "hacked", "data-testid": "the-el" },
		});
		const el = getByTestId("the-el");
		expect(el).toHaveAttribute("data-state", "armed");
	});

	it("BentoGridItem forwards id, data-testid and aria-label to the <div>", () => {
		const { getByTestId } = render(BentoGridItem, {
			props: { id: "the-id", "data-testid": "the-el", "aria-label": "the label" },
		});
		const el = getByTestId("the-el");
		expect(el.tagName).toBe("DIV");
		expect(el.matches(".bento-tile")).toBe(true);
		expect(el.id).toBe("the-id");
		expect(el).toHaveAttribute("aria-label", "the label");
	});

	it("BentoGridItem keeps its own classes next to a consumer class", () => {
		const { container } = render(BentoGridItem, {
			props: { class: "extra-x", "data-testid": "the-el" },
		});
		const el = container.querySelector("[data-testid]") ?? container.firstElementChild;
		expect(el?.className).toContain("bento-tile");
		expect(el?.className).toContain("extra-x");
	});

	it("BentoGridCard forwards id, data-testid and aria-label to the <div>", () => {
		const { getByTestId } = render(BentoGridCard, {
			props: {
				name: "N",
				description: "D",
				href: "#",
				cta: "Go",
				id: "the-id",
				"data-testid": "the-el",
				"aria-label": "the label",
			},
		});
		const el = getByTestId("the-el");
		expect(el.tagName).toBe("DIV");
		expect(el.matches(".bento-tile")).toBe(true);
		expect(el.id).toBe("the-id");
		expect(el).toHaveAttribute("aria-label", "the label");
	});

	it("BentoGridCard keeps its own classes next to a consumer class", () => {
		const { container } = render(BentoGridCard, {
			props: {
				name: "N",
				description: "D",
				href: "#",
				cta: "Go",
				class: "extra-x",
				"data-testid": "the-el",
			},
		});
		const el = container.querySelector("[data-testid]") ?? container.firstElementChild;
		expect(el?.className).toContain("bento-tile");
		expect(el?.className).toContain("extra-x");
	});
});
