import { render, cleanup } from "@testing-library/react";
import { afterEach, describe, it, expect } from "vitest";
import { GlowingEffect } from "./GlowingEffect.js";

describe("GlowingEffect", () => {
	afterEach(cleanup);

	it("renders without errors", () => {
		const { container } = render(<GlowingEffect />);
		expect(container.firstElementChild).toBeInTheDocument();
	});

	it("applies custom class", () => {
		const { container } = render(<GlowingEffect className="my-glow" />);
		const divs = container.querySelectorAll("div");
		const hasClass = Array.from(divs).some((div) => div.className.includes("my-glow"));
		expect(hasClass).toBe(true);
	});

	it("sets default CSS custom properties", () => {
		const { container } = render(<GlowingEffect />);
		const styledDiv = container.querySelector("[style]") as HTMLElement;
		const style = styledDiv?.getAttribute("style") ?? "";
		expect(style).toContain("--blur: 0px");
		expect(style).toContain("--spread: 20");
		expect(style).toContain("--glowingeffect-border-width: 1px");
	});

	it("hides container when disabled (default)", () => {
		const { container } = render(<GlowingEffect />);
		const styledDiv = container.querySelector("[style]") as HTMLElement;
		expect(styledDiv?.className).toContain("!hidden");
	});

	it("shows border div when disabled", () => {
		const { container } = render(<GlowingEffect />);
		const firstDiv = container.firstElementChild as HTMLElement;
		expect(firstDiv?.className).toContain("!block");
	});

	it("white variant gets border-white", () => {
		const { container } = render(<GlowingEffect variant="white" />);
		const firstDiv = container.firstElementChild as HTMLElement;
		expect(firstDiv?.className).toContain("border-white");
	});

	it("default variant does not get border-white", () => {
		const { container } = render(<GlowingEffect variant="default" />);
		const firstDiv = container.firstElementChild as HTMLElement;
		expect(firstDiv?.className).not.toContain("border-white");
	});

	it("applies custom blur value", () => {
		const { container } = render(<GlowingEffect blur={10} />);
		const styledDiv = container.querySelector("[style]") as HTMLElement;
		const style = styledDiv?.getAttribute("style") ?? "";
		expect(style).toContain("--blur: 10px");
	});

	it("applies custom spread value", () => {
		const { container } = render(<GlowingEffect spread={50} />);
		const styledDiv = container.querySelector("[style]") as HTMLElement;
		const style = styledDiv?.getAttribute("style") ?? "";
		expect(style).toContain("--spread: 50");
	});

	it("applies custom borderWidth value", () => {
		const { container } = render(<GlowingEffect borderWidth={3} />);
		const styledDiv = container.querySelector("[style]") as HTMLElement;
		const style = styledDiv?.getAttribute("style") ?? "";
		expect(style).toContain("--glowingeffect-border-width: 3px");
	});
});
