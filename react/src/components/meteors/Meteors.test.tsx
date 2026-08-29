import { render, cleanup } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, it, expect } from "vitest";
import { Meteors } from "./Meteors.js";

describe("Meteors", () => {
	afterEach(cleanup);

	it("renders the default number of meteor spans (20)", () => {
		const { container } = render(<Meteors />);
		const spans = container.querySelectorAll("span.meteor");
		expect(spans.length).toBe(20);
	});

	it("renders a custom count of meteors", () => {
		const { container } = render(<Meteors count={5} />);
		const spans = container.querySelectorAll("span.meteor");
		expect(spans.length).toBe(5);
	});

	it("renders zero meteors when count is 0", () => {
		const { container } = render(<Meteors count={0} />);
		const spans = container.querySelectorAll("span.meteor");
		expect(spans.length).toBe(0);
	});

	it("applies custom class names to each meteor", () => {
		const { container } = render(<Meteors count={3} className="my-custom-class" />);
		const spans = container.querySelectorAll("span.meteor");
		spans.forEach((span) => {
			expect(span.className).toContain("my-custom-class");
		});
	});

	it("each meteor has a style attribute with left, animation-delay, and animation-duration", () => {
		const { container } = render(<Meteors count={3} />);
		const spans = container.querySelectorAll("span.meteor");
		spans.forEach((span) => {
			const style = span.getAttribute("style") ?? "";
			expect(style).toContain("left:");
			expect(style).toContain("animation-delay:");
			expect(style).toContain("animation-duration:");
		});
	});

	// `Math.random()` in the initializer ran once on the server and again
	// during hydration, so every `left`/delay/duration differed between the
	// two renders — a hydration mismatch React may resolve by keeping the
	// SERVER attributes. A seeded PRNG makes both renders agree while keeping
	// the shower in the server HTML, which generating after mount would not.
	// Compared as parsed style VALUES rather than raw HTML: jsdom normalises
	// whitespace and unescapes entities on the client side, so two identical
	// renders still differ as strings while agreeing on every value React
	// actually diffs during hydration.
	function layoutOf(html: string): string[] {
		const host = document.createElement("div");
		host.innerHTML = html;
		return Array.from(host.querySelectorAll<HTMLElement>("span.meteor")).map(
			(span) =>
				`${span.style.left}|${span.style.animationDelay}|${span.style.animationDuration}`
		);
	}

	it("lays the shower out identically on the server and on the client", () => {
		const serverLayout = layoutOf(renderToStaticMarkup(<Meteors count={6} />));
		const { container } = render(<Meteors count={6} />);

		expect(serverLayout).toHaveLength(6);
		expect(layoutOf(container.innerHTML)).toEqual(serverLayout);
	});

	it("lays out two showers the same way by default, and differently under different seeds", () => {
		const first = layoutOf(renderToStaticMarkup(<Meteors count={4} />));
		const same = layoutOf(renderToStaticMarkup(<Meteors count={4} />));
		const seeded = layoutOf(renderToStaticMarkup(<Meteors count={4} seed={99} />));

		expect(same).toEqual(first);
		expect(seeded).not.toEqual(first);
	});

	it("preserves base classes when custom class is added", () => {
		const { container } = render(<Meteors count={1} className="extra" />);
		const span = container.querySelector("span.meteor")!;
		expect(span.className).toContain("absolute");
		expect(span.className).toContain("rounded-full");
	});
});
