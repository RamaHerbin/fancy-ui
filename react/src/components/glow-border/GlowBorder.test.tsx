import { render, cleanup } from "@testing-library/react";
import { afterEach, describe, it, expect } from "vitest";
import { GlowBorder } from "./GlowBorder.js";

describe("GlowBorder", () => {
	afterEach(cleanup);

	it("renders a div element", () => {
		const { container } = render(<GlowBorder />);
		const div = container.querySelector(".animate-glow");
		expect(div).toBeInTheDocument();
	});

	it("has pointer-events-none class", () => {
		const { container } = render(<GlowBorder />);
		const div = container.firstElementChild as HTMLElement;
		expect(div?.className).toContain("pointer-events-none");
	});

	it("has absolute and inset-0 classes", () => {
		const { container } = render(<GlowBorder />);
		const div = container.firstElementChild as HTMLElement;
		expect(div?.className).toContain("absolute");
		expect(div?.className).toContain("inset-0");
	});

	it("includes border-radius in inline style", () => {
		const { container } = render(<GlowBorder borderRadius={20} />);
		const div = container.firstElementChild as HTMLElement;
		const style = div.getAttribute("style") ?? "";
		expect(style).toContain("border-radius");
	});

	it("includes duration CSS var in style", () => {
		const { container } = render(<GlowBorder duration={5} />);
		const div = container.firstElementChild as HTMLElement;
		const style = div.getAttribute("style") ?? "";
		expect(style).toContain("--glow-duration: 5s");
	});

	it("includes border-width CSS var in style", () => {
		const { container } = render(<GlowBorder borderWidth={4} />);
		const div = container.firstElementChild as HTMLElement;
		const style = div.getAttribute("style") ?? "";
		expect(style).toContain("--glow-border-width: 4px");
	});

	it("includes border-radius CSS var in style", () => {
		const { container } = render(<GlowBorder borderRadius={16} />);
		const div = container.firstElementChild as HTMLElement;
		const style = div.getAttribute("style") ?? "";
		expect(style).toContain("--glow-border-radius: 16px");
	});

	it("applies custom class names", () => {
		const { container } = render(<GlowBorder className="my-glow" />);
		const div = container.firstElementChild as HTMLElement;
		expect(div?.className).toContain("my-glow");
	});

	it("preserves base classes when custom class is added", () => {
		const { container } = render(<GlowBorder className="extra" />);
		const div = container.firstElementChild as HTMLElement;
		expect(div?.className).toContain("pointer-events-none");
		expect(div?.className).toContain("absolute");
	});
});
