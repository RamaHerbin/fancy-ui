import { render, cleanup } from "@testing-library/svelte";
import { afterEach, describe, it, expect } from "vitest";
import AnimatedBeam from "./AnimatedBeam.svelte";

describe("AnimatedBeam", () => {
	afterEach(cleanup);

	it("renders an svg element", () => {
		const { container } = render(AnimatedBeam);
		const svg = container.querySelector("svg");
		expect(svg).toBeInTheDocument();
	});

	it("svg has pointer-events-none class", () => {
		const { container } = render(AnimatedBeam);
		const svg = container.querySelector("svg");
		expect(svg?.className.baseVal).toContain("pointer-events-none");
	});

	it("renders two path elements", () => {
		const { container } = render(AnimatedBeam);
		const paths = container.querySelectorAll("path");
		expect(paths.length).toBe(2);
	});

	it("renders a linearGradient in defs", () => {
		const { container } = render(AnimatedBeam);
		const gradient = container.querySelector("linearGradient");
		expect(gradient).toBeInTheDocument();
	});

	it("applies custom class names", () => {
		const { container } = render(AnimatedBeam, { props: { class: "my-beam" } });
		const svg = container.querySelector("svg");
		expect(svg?.className.baseVal).toContain("my-beam");
	});

	it("preserves base classes when custom class is added", () => {
		const { container } = render(AnimatedBeam, { props: { class: "extra" } });
		const svg = container.querySelector("svg");
		expect(svg?.className.baseVal).toContain("pointer-events-none");
		expect(svg?.className.baseVal).toContain("absolute");
		expect(svg?.className.baseVal).toContain("transform-gpu");
	});

	it('svg has fill="none" attribute', () => {
		const { container } = render(AnimatedBeam);
		const svg = container.querySelector("svg");
		expect(svg).toHaveAttribute("fill", "none");
	});
});
