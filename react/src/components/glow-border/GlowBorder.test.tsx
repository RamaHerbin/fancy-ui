import { render, cleanup } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, it, expect, vi } from "vitest";
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

	// Regression: the declarations used to be written from a layout effect, so
	// the server rendered a bare <div> — no mask, no gradient, no custom
	// properties — and the glow only appeared once the client had hydrated. The
	// style is a pure function of the props, so it belongs in the render pass.
	it("ships the whole style in the server markup, not only after hydration", () => {
		const html = renderToStaticMarkup(
			<GlowBorder borderRadius={16} borderWidth={4} duration={5} color="#0ff" />
		);

		expect(html).toContain("--glow-border-radius:16px");
		expect(html).toContain("--glow-border-width:4px");
		expect(html).toContain("--glow-duration:5s");
		expect(html).toContain("#0ff");
		expect(html).toContain("mask");
	});

	it("does not reach for a layout effect on the server", () => {
		const error = vi.spyOn(console, "error").mockImplementation(() => {});
		try {
			renderToStaticMarkup(<GlowBorder />);
			const warned = error.mock.calls.some((call) => String(call[0]).includes("useLayoutEffect"));
			expect(warned).toBe(false);
		} finally {
			error.mockRestore();
		}
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
