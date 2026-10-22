import { render, cleanup } from "@testing-library/vue";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { defineComponent, h, nextTick } from "vue";
import TracingBeam from "./TracingBeam.vue";

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

/** The Svelte `TracingBeamHeaded.test.svelte` harness: two headings around prose. */
const Headed = defineComponent({
	props: { markers: { type: Boolean, default: true } },
	setup(props) {
		return () =>
			h(TracingBeam, { markers: props.markers }, () => [
				h("h2", { "data-heading": "a" }, "First"),
				h("p", "Some text."),
				h("h2", { "data-heading": "b" }, "Second"),
				h("p", "More text."),
			]);
	},
});

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
		await nextTick();
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
});
