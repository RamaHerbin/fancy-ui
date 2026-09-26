import { render, cleanup } from "@testing-library/vue";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import TracingBeam from "./TracingBeam.vue";

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
	});

	it("renders container div", () => {
		const { container } = render(TracingBeam);
		const div = container.firstElementChild as HTMLElement;
		expect(div).toBeInTheDocument();
		expect(div.tagName).toBe("DIV");
	});

	it("renders SVG element", () => {
		const { container } = render(TracingBeam);
		const svg = container.querySelector("svg");
		expect(svg).toBeInTheDocument();
	});

	it("SVG has aria-hidden attribute", () => {
		const { container } = render(TracingBeam);
		const svg = container.querySelector("svg");
		expect(svg?.getAttribute("aria-hidden")).toBe("true");
	});

	it("renders circle indicator", () => {
		const { container } = render(TracingBeam);
		const outerCircle = container.querySelector(".rounded-full.border");
		expect(outerCircle).toBeInTheDocument();
		const innerCircle = outerCircle?.querySelector(".rounded-full");
		expect(innerCircle).toBeInTheDocument();
	});

	it("applies custom class", () => {
		const { container } = render(TracingBeam, { props: { class: "my-beam" } });
		const div = container.firstElementChild as HTMLElement;
		expect(div?.className).toContain("my-beam");
	});

	it("preserves base classes when custom class is added", () => {
		const { container } = render(TracingBeam, { props: { class: "extra" } });
		const div = container.firstElementChild as HTMLElement;
		expect(div?.className).toContain("relative");
		expect(div?.className).toContain("mx-auto");
		expect(div?.className).toContain("max-w-4xl");
	});

	it("renders gradient definition in SVG", () => {
		const { container } = render(TracingBeam);
		const gradient = container.querySelector("svg linearGradient");
		expect(gradient).toBeInTheDocument();
	});

	it("gives each instance its own gradient id, referenced by its own stroke", () => {
		const { container } = render({
			components: { TracingBeam },
			template: "<div><TracingBeam /><TracingBeam /></div>",
		});
		const svgs = container.querySelectorAll("svg");
		expect(svgs.length).toBe(2);
		const ids = [...svgs].map((svg) => svg.querySelector("linearGradient")!.id);
		expect(ids[0]).toBeTruthy();
		expect(ids[0]).not.toBe(ids[1]);
		// Each beam's animated path must reference the gradient of its OWN svg.
		svgs.forEach((svg, i) => {
			const stroke = svg.querySelectorAll("path")[1]!.getAttribute("stroke");
			expect(stroke).toBe(`url(#${ids[i]})`);
		});
	});

	it("renders two path elements in SVG", () => {
		const { container } = render(TracingBeam);
		const paths = container.querySelectorAll("svg path");
		expect(paths.length).toBe(2);
	});
});
