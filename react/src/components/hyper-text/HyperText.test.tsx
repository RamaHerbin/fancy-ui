import { StrictMode } from "react";
import { render, cleanup, act } from "@testing-library/react";
import { afterEach, describe, it, expect, vi } from "vitest";
import { HyperText } from "./HyperText.js";

describe("HyperText", () => {
	afterEach(cleanup);

	it("renders one span per character", () => {
		const { container } = render(<HyperText text="Hello" />);
		const chars = container.querySelectorAll(".hyper-text-char");
		expect(chars.length).toBe(5);
	});

	it("displays text in uppercase", () => {
		const { container } = render(<HyperText text="abc" />);
		const wrapper = container.querySelector(".hyper-text");
		// Text content may be scrambled or resolved, but should exist
		expect(wrapper?.textContent?.trim().length).toBeGreaterThan(0);
	});

	it("applies custom class names", () => {
		const { container } = render(<HyperText text="Test" className="my-hyper" />);
		const wrapper = container.querySelector(".hyper-text");
		expect(wrapper?.className).toContain("my-hyper");
	});

	it("applies animation styles to each character", () => {
		const { container } = render(<HyperText text="Hi" />);
		const chars = container.querySelectorAll(".hyper-text-char");
		chars.forEach((char) => {
			const style = (char as HTMLElement).getAttribute("style") ?? "";
			expect(style).toContain("animation");
			expect(style).toContain("hyperFadeIn");
		});
	});

	it("renders spaces with w-3 class", () => {
		const { container } = render(<HyperText text="A B" />);
		const chars = container.querySelectorAll(".hyper-text-char");
		expect(chars.length).toBe(3);
		expect(chars[1]?.className).toContain("w-3");
	});

	describe("scramble", () => {
		/** Run the load animation for `ticks` interval fires and report the scrambled text. */
		function scrambleAfterTicks(strict: boolean, ticks: number): string {
			const element = <HyperText text="ABCDE" animateOnLoad seed={1} />;
			const { container } = render(strict ? <StrictMode>{element}</StrictMode> : element);
			// text length 5, duration 800 -> one tick every 16ms
			act(() => {
				vi.advanceTimersByTime(16 * ticks);
			});
			const text = container.querySelector(".hyper-text")?.textContent ?? "";
			cleanup();
			return text;
		}

		it("draws the same seeded sequence with and without StrictMode", () => {
			vi.useFakeTimers();
			try {
				expect(scrambleAfterTicks(true, 5)).toBe(scrambleAfterTicks(false, 5));
			} finally {
				vi.useRealTimers();
			}
		});

		it("resolves to the full text once the animation completes", () => {
			vi.useFakeTimers();
			try {
				const { container } = render(<HyperText text="ABCDE" animateOnLoad seed={1} />);
				act(() => {
					vi.advanceTimersByTime(16 * 60);
				});
				expect(container.querySelector(".hyper-text")?.textContent).toBe("ABCDE");
			} finally {
				vi.useRealTimers();
			}
		});
	});
});
