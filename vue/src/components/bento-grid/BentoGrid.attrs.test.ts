import { render, cleanup } from "@testing-library/vue";
import { afterEach, describe, it, expect, vi } from "vitest";
import BentoGrid from "./BentoGrid.vue";
import BentoGridItem from "./BentoGridItem.vue";
import BentoGridCard from "./BentoGridCard.vue";

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
			props: {},
			attrs: { id: "the-id", "data-testid": "the-el", "aria-label": "the label" },
		});
		const el = getByTestId("the-el");
		expect(el.tagName).toBe("DIV");
		expect(el.matches(".fancy-bento")).toBe(true);
		expect(el.id).toBe("the-id");
		expect(el).toHaveAttribute("aria-label", "the label");
	});

	it("BentoGrid picks up an attribute added on a later render", async () => {
		const { container, rerender } = render(BentoGrid, { props: {} });
		const el = container.firstElementChild as HTMLElement;
		expect(el).not.toHaveAttribute("data-late");
		await rerender({ "data-late": "yes" });
		expect(el).toHaveAttribute("data-late", "yes");
	});

	it("BentoGrid keeps its managed attributes authoritative", () => {
		const { getByTestId } = render(BentoGrid, {
			props: {},
			attrs: { "data-state": "hacked", "data-testid": "the-el" },
		});
		const el = getByTestId("the-el");
		expect(el).toHaveAttribute("data-state", "armed");
	});

	it("BentoGridItem forwards id, data-testid and aria-label to the <div>", () => {
		const { getByTestId } = render(BentoGridItem, {
			props: {},
			attrs: { id: "the-id", "data-testid": "the-el", "aria-label": "the label" },
		});
		const el = getByTestId("the-el");
		expect(el.tagName).toBe("DIV");
		expect(el.matches(".bento-tile")).toBe(true);
		expect(el.id).toBe("the-id");
		expect(el).toHaveAttribute("aria-label", "the label");
	});

	it("BentoGridItem picks up an attribute added on a later render", async () => {
		const { container, rerender } = render(BentoGridItem, { props: {} });
		const el = container.firstElementChild as HTMLElement;
		expect(el).not.toHaveAttribute("data-late");
		await rerender({ "data-late": "yes" });
		expect(el).toHaveAttribute("data-late", "yes");
	});

	it("BentoGridItem keeps its own classes next to a consumer class", () => {
		const { container } = render(BentoGridItem, {
			props: { ...{}, class: "extra-x" },
			attrs: { "data-testid": "the-el" },
		});
		const el = container.querySelector("[data-testid]") ?? container.firstElementChild;
		expect(el?.className).toContain("bento-tile");
		expect(el?.className).toContain("extra-x");
	});

	it("BentoGridCard forwards id, data-testid and aria-label to the <div>", () => {
		const { getByTestId } = render(BentoGridCard, {
			props: { name: "N", description: "D", href: "#", cta: "Go" },
			attrs: { id: "the-id", "data-testid": "the-el", "aria-label": "the label" },
		});
		const el = getByTestId("the-el");
		expect(el.tagName).toBe("DIV");
		expect(el.matches(".bento-tile")).toBe(true);
		expect(el.id).toBe("the-id");
		expect(el).toHaveAttribute("aria-label", "the label");
	});

	it("BentoGridCard picks up an attribute added on a later render", async () => {
		const { container, rerender } = render(BentoGridCard, {
			props: { name: "N", description: "D", href: "#", cta: "Go" },
		});
		const el = container.firstElementChild as HTMLElement;
		expect(el).not.toHaveAttribute("data-late");
		await rerender({ "data-late": "yes" });
		expect(el).toHaveAttribute("data-late", "yes");
	});

	it("BentoGridCard keeps its own classes next to a consumer class", () => {
		const { container } = render(BentoGridCard, {
			props: { ...{ name: "N", description: "D", href: "#", cta: "Go" }, class: "extra-x" },
			attrs: { "data-testid": "the-el" },
		});
		const el = container.querySelector("[data-testid]") ?? container.firstElementChild;
		expect(el?.className).toContain("bento-tile");
		expect(el?.className).toContain("extra-x");
	});
});
