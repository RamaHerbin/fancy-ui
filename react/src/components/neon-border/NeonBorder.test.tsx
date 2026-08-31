import { render, cleanup } from "@testing-library/react";
import { afterEach, describe, it, expect } from "vitest";
import { NeonBorder } from "./NeonBorder.js";

describe("NeonBorder", () => {
	afterEach(cleanup);

	it("renders a container div", () => {
		const { container } = render(<NeonBorder />);
		const wrapper = container.querySelector(".neon-border-container");
		expect(wrapper).toBeInTheDocument();
	});

	it("renders two neon layer divs", () => {
		const { container } = render(<NeonBorder />);
		const layerOne = container.querySelector(".neon-layer-one");
		const layerTwo = container.querySelector(".neon-layer-two");
		expect(layerOne).toBeInTheDocument();
		expect(layerTwo).toBeInTheDocument();
	});

	it('applies animation class when animationType is not "none"', () => {
		const { container } = render(<NeonBorder animationType="half" />);
		const layerOne = container.querySelector(".neon-layer-one");
		expect(layerOne?.className).toContain("neon-animated");
	});

	it('does not apply animation class when animationType is "none"', () => {
		const { container } = render(<NeonBorder animationType="none" />);
		const layerOne = container.querySelector(".neon-layer-one");
		expect(layerOne?.className).not.toContain("neon-animated");
	});

	it("sets CSS custom properties from props", () => {
		const { container } = render(
			<NeonBorder color1="#ff0000" color2="#00ff00" duration={10} />
		);
		const wrapper = container.querySelector(".neon-border-container") as HTMLElement;
		const style = wrapper.getAttribute("style") ?? "";
		expect(style).toContain("--neon-color1: #ff0000");
		expect(style).toContain("--neon-color2: #00ff00");
		expect(style).toContain("--neon-duration: 10s");
	});

	it("sets neon-width to 50% for half animation type", () => {
		const { container } = render(<NeonBorder animationType="half" />);
		const wrapper = container.querySelector(".neon-border-container") as HTMLElement;
		const style = wrapper.getAttribute("style") ?? "";
		expect(style).toContain("--neon-width: 50%");
	});

	it("sets neon-width to 100% for full animation type", () => {
		const { container } = render(<NeonBorder animationType="full" />);
		const wrapper = container.querySelector(".neon-border-container") as HTMLElement;
		const style = wrapper.getAttribute("style") ?? "";
		expect(style).toContain("--neon-width: 100%");
	});

	it("sets neon-width to 12% for none animation type", () => {
		const { container } = render(<NeonBorder animationType="none" />);
		const wrapper = container.querySelector(".neon-border-container") as HTMLElement;
		const style = wrapper.getAttribute("style") ?? "";
		expect(style).toContain("--neon-width: 12%");
	});

	it("applies custom class names", () => {
		const { container } = render(<NeonBorder className="custom-neon" />);
		const wrapper = container.querySelector(".neon-border-container");
		expect(wrapper?.className).toContain("custom-neon");
	});

	it("preserves base classes when custom class is added", () => {
		const { container } = render(<NeonBorder className="extra" />);
		const wrapper = container.querySelector(".neon-border-container");
		expect(wrapper?.className).toContain("relative");
		expect(wrapper?.className).toContain("overflow-hidden");
		expect(wrapper?.className).toContain("rounded-lg");
	});
});
