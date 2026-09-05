import { render, cleanup, act } from "@testing-library/react";
import { afterEach, describe, it, expect, vi } from "vitest";
import { Focus } from "./Focus.js";

describe("Focus", () => {
	afterEach(cleanup);

	it("renders the component", () => {
		const { container } = render(<Focus />);
		const wrapper = container.querySelector(".focus-container");
		expect(wrapper).toBeInTheDocument();
	});

	it("splits sentence into words", () => {
		const { container } = render(<Focus sentence="Hello World Test" />);
		const words = container.querySelectorAll(".focus-word");
		expect(words.length).toBe(3);
	});

	it("renders default sentence", () => {
		const { container } = render(<Focus />);
		const words = container.querySelectorAll(".focus-word");
		expect(words.length).toBe(2); // "Fancy" "Focus"
	});

	it("renders focus frame with corners", () => {
		const { container } = render(<Focus />);
		const frame = container.querySelector(".focus-frame");
		expect(frame).toBeInTheDocument();
		const corners = container.querySelectorAll(".corner");
		expect(corners.length).toBe(4);
	});

	it("applies custom border color", () => {
		const { container } = render(<Focus borderColor="red" />);
		const word = container.querySelector(".focus-word") as HTMLElement;
		expect(word.style.getPropertyValue("--border-color")).toBe("red");
	});

	it("applies custom class", () => {
		const { container } = render(<Focus className="my-focus" />);
		const wrapper = container.querySelector(".focus-container");
		expect(wrapper?.className).toContain("my-focus");
	});

	it("blurs non-active words", () => {
		const { container } = render(<Focus sentence="A B" blurAmount={8} />);
		const words = container.querySelectorAll(".focus-word");
		// Second word should be blurred
		expect((words[1] as HTMLElement).style.filter).toBe("blur(8px)");
	});

	it("keeps the cycle on the cadence captured at mount when timing props change", () => {
		vi.useFakeTimers();
		try {
			const { container, rerender } = render(
				<Focus sentence="A B" animationDuration={0.5} pauseBetweenAnimations={1} />,
			);
			// A later timing change must not restart or re-time the interval, as the
			// Svelte `onMount` closure reads its props once.
			rerender(<Focus sentence="A B" animationDuration={5} pauseBetweenAnimations={5} />);
			act(() => {
				vi.advanceTimersByTime(1500);
			});
			const words = container.querySelectorAll(".focus-word");
			expect((words[1] as HTMLElement).style.filter).toBe("blur(0px)");
		} finally {
			vi.useRealTimers();
		}
	});
});
