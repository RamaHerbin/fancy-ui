import { render, cleanup, act } from "@testing-library/react";
import { afterEach, describe, it, expect, vi } from "vitest";
import { FlipWords } from "./FlipWords.js";

describe("FlipWords", () => {
	afterEach(cleanup);

	it("renders the first word initially", () => {
		const { container } = render(<FlipWords words={["Hello", "World"]} />);
		const wordSpans = container.querySelectorAll(".flip-words-word");
		expect(wordSpans.length).toBeGreaterThan(0);
		const text = container.querySelector(".flip-words")?.textContent?.trim();
		expect(text).toContain("Hello");
	});

	it("renders letters individually with animation", () => {
		const { container } = render(<FlipWords words={["ABC"]} />);
		const wrapper = container.querySelector(".flip-words-enter");
		expect(wrapper).toBeTruthy();
		// ABC = 3 letters inside word span
		expect(wrapper?.textContent).toContain("ABC");
	});

	it("applies custom class name", () => {
		const { container } = render(<FlipWords words={["Test"]} className="my-custom" />);
		const inner = container.querySelector(".flip-words-enter");
		expect(inner?.className).toContain("my-custom");
	});

	it("has animation styles on word spans", () => {
		const { container } = render(<FlipWords words={["Hello World"]} />);
		const wordSpans = container.querySelectorAll(".flip-words-word");
		wordSpans.forEach((span) => {
			const style = (span as HTMLElement).getAttribute("style") ?? "";
			expect(style).toContain("animation");
			expect(style).toContain("flipFadeInWord");
		});
	});

	it("renders multiple words in a phrase with spaces", () => {
		const { container } = render(<FlipWords words={["Hello World"]} />);
		const wordSpans = container.querySelectorAll(".flip-words-word");
		// "Hello World" split by space = 2 word groups
		expect(wordSpans.length).toBe(2);
	});

	it("keeps flipping while the parent re-renders with a fresh array literal", () => {
		vi.useFakeTimers();
		try {
			const { container, rerender } = render(
				<FlipWords words={["Hello", "World"]} duration={1000} />
			);
			const text = () => container.querySelector(".flip-words")?.textContent?.trim();
			expect(text()).toContain("Hello");

			// A parent re-rendering faster than `duration` hands down a new array
			// identity every time; the countdown must survive it.
			for (let i = 0; i < 3; i++) {
				rerender(<FlipWords words={["Hello", "World"]} duration={1000} />);
				act(() => {
					vi.advanceTimersByTime(400);
				});
			}

			// 1200ms of waiting elapsed: the exit has started and finished.
			act(() => {
				vi.advanceTimersByTime(600);
			});
			expect(text()).toContain("World");
		} finally {
			vi.useRealTimers();
		}
	});

	it("recovers instead of going blank forever when words empties out mid-exit", () => {
		vi.useFakeTimers();
		try {
			const { container, rerender } = render(
				<FlipWords words={["Hello", "World"]} duration={1000} />
			);
			const text = () => container.querySelector(".flip-words")?.textContent?.trim();
			expect(text()).toContain("Hello");

			// Reach the exit phase: the 600ms exit timeout is now pending, primed
			// to compute `(index + 1) % length`.
			act(() => {
				vi.advanceTimersByTime(1000);
			});

			// The parent clears the list while that exit animation is in flight
			// (e.g. a data reload). Without a re-check, the pending timeout would
			// still divide by the length it captured when it was armed; here it
			// must instead see the current, empty length.
			rerender(<FlipWords words={[]} duration={1000} />);

			// Let the in-flight exit timeout fire against the now-empty list.
			act(() => {
				vi.advanceTimersByTime(600);
			});

			// The list is repopulated. A NaN index would stay NaN forever
			// (`words[NaN] ?? ""` is always ""), leaving the component blank even
			// after fresh words arrive. A guarded index resumes normally.
			rerender(<FlipWords words={["Fresh"]} duration={1000} />);
			expect(text()).toContain("Fresh");
		} finally {
			vi.useRealTimers();
		}
	});
});
