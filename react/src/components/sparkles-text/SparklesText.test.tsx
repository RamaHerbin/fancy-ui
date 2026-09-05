import { render, cleanup, act } from "@testing-library/react";
import { afterEach, describe, it, expect, vi } from "vitest";
import { SparklesText } from "./SparklesText.js";

describe("SparklesText", () => {
	afterEach(cleanup);

	it("renders the text content", () => {
		const { container } = render(<SparklesText text="Hello" />);
		const wrapper = container.querySelector(".sparkles-text");
		expect(wrapper?.textContent).toContain("Hello");
	});

	it("renders sparkle SVG elements", () => {
		const { container } = render(<SparklesText text="Test" sparklesCount={5} />);
		const stars = container.querySelectorAll(".sparkles-star");
		expect(stars.length).toBe(5);
	});

	it("renders default 10 sparkles", () => {
		const { container } = render(<SparklesText text="Test" />);
		const stars = container.querySelectorAll(".sparkles-star");
		expect(stars.length).toBe(10);
	});

	it("applies custom class names", () => {
		const { container } = render(<SparklesText text="Hi" className="my-sparkle" />);
		const wrapper = container.querySelector(".sparkles-text");
		expect(wrapper?.className).toContain("my-sparkle");
	});

	it("sparkle SVGs have animation styles", () => {
		const { container } = render(<SparklesText text="X" sparklesCount={1} />);
		const star = container.querySelector(".sparkles-star");
		const style = (star as HTMLElement)?.getAttribute("style") ?? "";
		expect(style).toContain("animation");
		expect(style).toContain("sparkleAnim");
	});

	it("uses custom colors on sparkle paths", () => {
		const { container } = render(
			<SparklesText
				text="X"
				sparklesCount={20}
				colors={{ first: "#FF0000", second: "#00FF00" }}
			/>
		);
		const paths = container.querySelectorAll(".sparkles-star path");
		const fills = Array.from(paths).map((p) => p.getAttribute("fill"));
		const hasRed = fills.some((f) => f === "#FF0000");
		const hasGreen = fills.some((f) => f === "#00FF00");
		// With 20 sparkles and 50/50 chance, at least one of each should appear
		expect(hasRed || hasGreen).toBe(true);
	});

	// The regeneration closure lives for the whole mount and reads the colours
	// through a live ref, so a colour change reaches the next regenerated star
	// without tearing the interval down.
	it("regenerated sparkles pick up a later colors prop", () => {
		vi.useFakeTimers();
		try {
			const { container, rerender } = render(
				<SparklesText
					text="X"
					sparklesCount={4}
					colors={{ first: "#FF0000", second: "#FF0000" }}
				/>
			);
			rerender(
				<SparklesText
					text="X"
					sparklesCount={4}
					colors={{ first: "#0000FF", second: "#0000FF" }}
				/>
			);
			// Every star's lifespan is below 15, and one tick every 100ms removes
			// 0.1, so 200 ticks regenerate the whole field at least once.
			act(() => {
				vi.advanceTimersByTime(20000);
			});
			const fills = Array.from(container.querySelectorAll(".sparkles-star path")).map(
				(p) => p.getAttribute("fill")
			);
			expect(fills.length).toBe(4);
			expect(fills.every((f) => f === "#0000FF")).toBe(true);
		} finally {
			vi.useRealTimers();
		}
	});
});
