import { render, cleanup } from "@testing-library/svelte";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import TracingBeam from "./TracingBeam.svelte";
import Headed from "./TracingBeamHeaded.test.svelte";

/** A rect at `top` with the given height; enough for the component's reads. */
function rect(top: number, height: number): DOMRect {
	return {
		x: 0,
		y: top,
		top,
		bottom: top + height,
		left: 0,
		right: 600,
		width: 600,
		height,
		toJSON: () => ({}),
	} as DOMRect;
}

/** The headed fixture's layout: content at 100px, 1000px tall; headings at 150px and 700px. */
function layoutHeaded() {
	Object.defineProperty(window, "innerHeight", { configurable: true, value: 1000 });
	vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (
		this: HTMLElement
	) {
		if (this.classList.contains("tb-content")) return rect(100, 1000);
		if (this.dataset.heading === "a") return rect(240, 20);
		if (this.dataset.heading === "b") return rect(790, 20);
		return rect(0, 0);
	});
}

/** A reduced-motion query whose answer the test can flip, firing `change`. */
function controllableReducedMotion(initial: boolean) {
	let matches = initial;
	const listeners = new Set<(event: { matches: boolean }) => void>();
	vi.stubGlobal(
		"matchMedia",
		vi.fn(() => ({
			get matches() {
				return matches;
			},
			addEventListener: (_: string, fn: (event: { matches: boolean }) => void) => listeners.add(fn),
			removeEventListener: (_: string, fn: (event: { matches: boolean }) => void) =>
				listeners.delete(fn),
		}))
	);
	return (next: boolean) => {
		matches = next;
		for (const fn of listeners) fn({ matches: next });
	};
}

describe("TracingBeam", () => {
	beforeEach(() => {
		vi.stubGlobal(
			"ResizeObserver",
			class {
				observe = vi.fn();
				unobserve = vi.fn();
				disconnect = vi.fn();
			}
		);
	});

	afterEach(() => {
		cleanup();
		vi.restoreAllMocks();
		vi.unstubAllGlobals();
	});

	it("renders the wrapper with its base classes plus the custom one", () => {
		const { container } = render(TracingBeam, { props: { class: "my-beam" } });
		const root = container.firstElementChild as HTMLElement;
		expect(root.tagName).toBe("DIV");
		expect(root.className).toContain("my-beam");
		expect(root.className).toContain("relative");
		expect(root.className).toContain("mx-auto");
		expect(root.className).toContain("max-w-4xl");
	});

	it("keeps the rail, the lamp and the markers out of the accessibility tree", () => {
		const { container } = render(TracingBeam);
		const gutter = container.querySelector(".tb-gutter");
		expect(gutter?.getAttribute("aria-hidden")).toBe("true");
		expect(container.querySelector("[data-tracing-beam-head]")).toBeInTheDocument();
	});

	it("writes the lamp's position as a custom property instead of re-rendering markup", () => {
		const { container } = render(TracingBeam);
		const root = container.firstElementChild as HTMLElement;
		expect(root.style.getPropertyValue("--tb-progress")).toMatch(/px$/);
	});

	it("passes the accent through to the CSS hook", () => {
		const { container } = render(TracingBeam, { props: { accent: "tomato" } });
		const root = container.firstElementChild as HTMLElement;
		expect(root.style.getPropertyValue("--tracing-beam-accent")).toBe("tomato");
	});

	it("draws one marker per heading, lit once the lamp has reached it", async () => {
		// Content 1000px tall starting 100px below the viewport top; headings at
		// 150px and 700px from the content's top. Reading line = 38% of 1000px =
		// 380px → the lamp is at 280px: the first heading is behind it, the second ahead.
		Object.defineProperty(window, "innerHeight", { configurable: true, value: 1000 });
		vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (
			this: HTMLElement
		) {
			if (this.classList.contains("tb-content")) return rect(100, 1000);
			if (this.dataset.heading === "a") return rect(240, 20);
			if (this.dataset.heading === "b") return rect(790, 20);
			return rect(0, 0);
		});
		// Reduced motion: the lamp lands on the reading line without a spring.
		vi.stubGlobal(
			"matchMedia",
			vi.fn().mockReturnValue({
				matches: true,
				addEventListener: vi.fn(),
				removeEventListener: vi.fn(),
			})
		);

		const { container } = render(Headed);
		await Promise.resolve();
		const markers = container.querySelectorAll("[data-tracing-beam-marker]");
		expect(markers.length).toBe(2);
		expect(markers[0]?.getAttribute("data-lit")).toBe("true");
		expect(markers[1]?.getAttribute("data-lit")).toBe("false");
		const root = container.firstElementChild as HTMLElement;
		expect(root.style.getPropertyValue("--tb-progress")).toBe("280px");
	});

	it("draws no marker when `markers` is off", () => {
		const { container } = render(Headed, { props: { markers: false } });
		expect(container.querySelectorAll("[data-tracing-beam-marker]").length).toBe(0);
	});

	it("snaps the lamp and stops the spring when reduced motion turns on mid-flight", async () => {
		layoutHeaded();
		const setReduced = controllableReducedMotion(false);
		// The spring never gets a frame: the lamp stays where it started.
		vi.stubGlobal("requestAnimationFrame", () => 7);
		const cancel = vi.fn();
		vi.stubGlobal("cancelAnimationFrame", cancel);

		const { container } = render(Headed);
		await Promise.resolve();
		const root = container.firstElementChild as HTMLElement;
		expect(root.style.getPropertyValue("--tb-progress")).toBe("0px");

		setReduced(true);
		await vi.waitFor(() => expect(root.style.getPropertyValue("--tb-progress")).toBe("280px"));
		expect(cancel).toHaveBeenCalledWith(7);
		expect(root.getAttribute("data-motion")).toBe("reduced");
	});

	it("converts viewport measurements to local px under a scaled ancestor", async () => {
		// Same layout seen through `transform: scale(0.8)`: the content's layout
		// height is 1250px, so every viewport delta is 1.25 local px.
		layoutHeaded();
		vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockImplementation(function (
			this: HTMLElement
		) {
			return this.classList.contains("tb-content") ? 1250 : 0;
		});
		controllableReducedMotion(true);

		const { container } = render(Headed);
		await Promise.resolve();
		const root = container.firstElementChild as HTMLElement;
		expect(root.style.getPropertyValue("--tb-progress")).toBe("350px");
		expect(root.style.getPropertyValue("--tb-height")).toBe("1250px");
		const markers = container.querySelectorAll<HTMLElement>("[data-tracing-beam-marker]");
		expect(markers[0]?.style.top).toBe("187.5px");
		expect(markers[1]?.style.top).toBe("875px");
		expect(markers[0]?.getAttribute("data-lit")).toBe("true");
		expect(markers[1]?.getAttribute("data-lit")).toBe("false");
	});
});
