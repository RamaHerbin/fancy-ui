import { render, cleanup } from "@testing-library/react";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { BlurReveal } from "./BlurReveal.js";

describe("BlurReveal", () => {
	beforeEach(() => {
		// Mock IntersectionObserver (not available in jsdom) - must be a class
		global.IntersectionObserver = class {
			observe = vi.fn();
			unobserve = vi.fn();
			disconnect = vi.fn();
		} as unknown as typeof IntersectionObserver;
	});

	afterEach(cleanup);

	it("renders a container div", () => {
		const { container } = render(<BlurReveal />);
		const div = container.firstElementChild as HTMLElement;
		expect(div).toBeInTheDocument();
	});

	it("sets default CSS custom properties", () => {
		const { container } = render(<BlurReveal />);
		const div = container.firstElementChild as HTMLElement;
		expect(div.style.getPropertyValue("--blur-reveal-duration")).toBe("1s");
		expect(div.style.getPropertyValue("--blur-reveal-blur")).toBe("20px");
		expect(div.style.getPropertyValue("--blur-reveal-y")).toBe("20px");
	});

	it("sets CSS custom properties from props", () => {
		const { container } = render(<BlurReveal duration={2} delay={0.5} blur="10px" yOffset={30} />);
		const div = container.firstElementChild as HTMLElement;
		expect(div.style.getPropertyValue("--blur-reveal-duration")).toBe("2s");
		expect(div.style.getPropertyValue("--blur-reveal-blur")).toBe("10px");
		expect(div.style.getPropertyValue("--blur-reveal-y")).toBe("30px");
	});

	it("applies custom class names", () => {
		const { container } = render(<BlurReveal className="my-reveal" />);
		const div = container.firstElementChild as HTMLElement;
		expect(div?.className).toContain("my-reveal");
	});

	it("does not render blur-reveal-wrapper without children", () => {
		const { container } = render(<BlurReveal />);
		const wrapper = container.querySelector(".blur-reveal-wrapper");
		expect(wrapper).not.toBeInTheDocument();
	});

	it("does not apply mode-hard class by default", () => {
		const { container } = render(
			<BlurReveal>
				<span>content</span>
			</BlurReveal>
		);
		const wrapper = container.querySelector(".blur-reveal-wrapper");
		expect(wrapper).toBeTruthy();
		expect(wrapper?.classList.contains("mode-hard")).toBe(false);
	});

	it('applies mode-hard class when mode="hard"', () => {
		const { container } = render(
			<BlurReveal mode="hard">
				<span>content</span>
			</BlurReveal>
		);
		const wrapper = container.querySelector(".blur-reveal-wrapper");
		expect(wrapper?.classList.contains("mode-hard")).toBe(true);
	});

	it("writes a capped stagger delay on every child, including past the tenth", async () => {
		const { container } = render(
			<BlurReveal>
				<span>first</span>
			</BlurReveal>
		);
		const wrapper = container.querySelector(".blur-reveal-wrapper") as HTMLElement;
		expect(wrapper).toBeTruthy();
		while (wrapper.children.length < 12) wrapper.appendChild(document.createElement("span"));
		// The child-list observer re-indexes on the next microtask checkpoint.
		await new Promise((resolve) => setTimeout(resolve, 0));
		const delays = Array.from(wrapper.children).map((kid) =>
			Number.parseFloat((kid as HTMLElement).style.getPropertyValue("--ft-child-delay"))
		);
		expect(delays).toHaveLength(12);
		expect(delays[0]).toBe(0);
		// Past the old ten-rule ceiling: the 12th child still gets a delay.
		// jsdom measures 0 px, so the cap is the 200 ms floor of the ramp.
		expect(delays[11]).toBeGreaterThan(0);
		expect(delays[11]).toBeLessThanOrEqual(200 + 1e-6);
		expect(delays).toEqual([...delays].sort((a, b) => a - b));
	});
});
