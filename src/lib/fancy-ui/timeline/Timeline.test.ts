import { render, cleanup } from "@testing-library/svelte";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import Timeline from "./Timeline.svelte";

const mockItems = [
	{ id: "one", label: "2020" },
	{ id: "two", label: "2021" },
	{ id: "three", label: "2022" },
];

describe("Timeline", () => {
	beforeEach(() => {
		// Mock ResizeObserver (not available in jsdom) - must be a class
		global.ResizeObserver = class {
			observe = vi.fn();
			unobserve = vi.fn();
			disconnect = vi.fn();
		};
	});

	afterEach(cleanup);

	it("renders a container div", () => {
		const { container } = render(Timeline);
		const div = container.firstElementChild as HTMLElement;
		expect(div).toBeInTheDocument();
	});

	it("has w-full class", () => {
		const { container } = render(Timeline);
		const div = container.firstElementChild as HTMLElement;
		expect(div?.className).toContain("w-full");
	});

	it("renders title when provided", () => {
		const { container } = render(Timeline, { props: { title: "My Timeline" } });
		const h2 = container.querySelector("h2");
		expect(h2).toBeInTheDocument();
		expect(h2?.textContent).toBe("My Timeline");
	});

	it("renders description when provided", () => {
		const { container } = render(Timeline, {
			props: { title: "Title", description: "My description" },
		});
		const p = container.querySelector("p");
		expect(p?.textContent).toBe("My description");
	});

	it("does not render header section when no title or description", () => {
		const { container } = render(Timeline);
		const h2 = container.querySelector("h2");
		expect(h2).not.toBeInTheDocument();
	});

	it("renders one entry per item", () => {
		const { container } = render(Timeline, { props: { items: mockItems } });
		const labels = container.querySelectorAll("h3");
		expect(labels.length).toBe(3);
	});

	it("displays item labels", () => {
		const { container } = render(Timeline, { props: { items: mockItems } });
		const labels = container.querySelectorAll("h3");
		expect(labels[0].textContent).toBe("2020");
		expect(labels[1].textContent).toBe("2021");
	});

	it("applies custom class names", () => {
		const { container } = render(Timeline, { props: { class: "my-timeline" } });
		const div = container.firstElementChild as HTMLElement;
		expect(div?.className).toContain("my-timeline");
	});
});
