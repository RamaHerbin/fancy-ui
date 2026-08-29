import { render, cleanup } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { LiquidGlass } from "./LiquidGlass.js";

describe("LiquidGlass", () => {
	beforeEach(() => {
		// Mock ResizeObserver (not available in jsdom)
		vi.stubGlobal(
			"ResizeObserver",
			class {
				observe = vi.fn();
				unobserve = vi.fn();
				disconnect = vi.fn();
			}
		);
	});

	afterEach(cleanup);

	it("renders the component", () => {
		const { container } = render(<LiquidGlass />);
		const wrapper = container.querySelector(".liquid-glass-effect");
		expect(wrapper).toBeInTheDocument();
	});

	it("renders slot container", () => {
		const { container } = render(<LiquidGlass />);
		const slot = container.querySelector(".liquid-glass-slot");
		expect(slot).toBeInTheDocument();
	});

	it("applies custom container class", () => {
		const { container } = render(<LiquidGlass containerClass="my-container" />);
		const wrapper = container.querySelector(".liquid-glass-effect");
		expect(wrapper?.className).toContain("my-container");
	});

	it("applies custom class to slot container", () => {
		const { container } = render(<LiquidGlass className="my-slot" />);
		const slot = container.querySelector(".liquid-glass-slot");
		expect(slot?.className).toContain("my-slot");
	});

	it("sets frost CSS variable", () => {
		const { container } = render(<LiquidGlass frost={0.1} />);
		const wrapper = container.querySelector(".liquid-glass-effect") as HTMLElement;
		expect(wrapper.getAttribute("style")).toContain("--frost");
		expect(wrapper.getAttribute("style")).toContain("0.1");
	});

	it("sets border radius", () => {
		const { container } = render(<LiquidGlass radius={24} />);
		const wrapper = container.querySelector(".liquid-glass-effect") as HTMLElement;
		expect(wrapper.getAttribute("style")).toContain("border-radius");
		expect(wrapper.getAttribute("style")).toContain("24px");
	});

	it("exposes Safari fallback CSS variables from props", () => {
		const { container: defaultContainer } = render(<LiquidGlass />);
		const defaultWrapper = defaultContainer.querySelector(".liquid-glass-effect") as HTMLElement;
		const defaultStyle = defaultWrapper.getAttribute("style") ?? "";
		expect(defaultStyle).toMatch(/--lg-fallback-blur:\s*20px/);
		expect(defaultStyle).toMatch(/--lg-fallback-saturation:\s*180%/);

		const { container: customContainer } = render(
			<LiquidGlass fallbackBlur={8} fallbackSaturation={120} />
		);
		const customWrapper = customContainer.querySelector(".liquid-glass-effect") as HTMLElement;
		const customStyle = customWrapper.getAttribute("style") ?? "";
		expect(customStyle).toMatch(/--lg-fallback-blur:\s*8px/);
		expect(customStyle).toMatch(/--lg-fallback-saturation:\s*120%/);
	});

	// The two tests below pin the port's one behavioural decision: the filter id
	// is minted after mount (`uid()`, the counter kept for exactly that case)
	// rather than by `Math.random()`. Same client-only timing as the Svelte
	// source's `onMount`, same per-instance uniqueness, nothing random in a
	// render path — so a server render and its hydration cannot disagree.
	it("gives each mounted instance its own filter id", () => {
		const { container } = render(
			<>
				<LiquidGlass />
				<LiquidGlass />
			</>
		);
		const filters = container.querySelectorAll("svg.liquid-glass-filter filter");
		expect(filters.length).toBe(2);

		const ids = Array.from(filters, (filter) => filter.getAttribute("id"));
		expect(ids[0]).toMatch(/^displacementFilter-lg-\d+$/);
		expect(ids[1]).toMatch(/^displacementFilter-lg-\d+$/);
		expect(ids[0]).not.toBe(ids[1]);
	});

	it("renders no filter on the server, exactly as the initial client render does", () => {
		const html = renderToStaticMarkup(<LiquidGlass />);
		expect(html).toContain("liquid-glass-effect");
		expect(html).toContain("liquid-glass-slot");
		expect(html).not.toContain("liquid-glass-filter");
		expect(html).not.toContain("backdrop-filter");
	});
});
