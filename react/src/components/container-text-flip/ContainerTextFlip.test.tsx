import { act, render, cleanup } from "@testing-library/react";
import { afterEach, describe, it, expect, vi } from "vitest";
import { ContainerTextFlip } from "./ContainerTextFlip.js";

/** Advance the fake clock inside `act` so React flushes the resulting render. */
const advance = (ms: number) => act(async () => void (await vi.advanceTimersByTimeAsync(ms)));

const readWord = (container: HTMLElement) =>
	Array.from(container.querySelectorAll(".text-flip-letter"))
		.map((l) => l.textContent)
		.join("");

describe("ContainerTextFlip", () => {
	afterEach(cleanup);

	it("renders the component", () => {
		const { container } = render(<ContainerTextFlip />);
		const el = container.querySelector("p");
		expect(el).toBeInTheDocument();
	});

	it("renders first word by default", () => {
		const { container } = render(<ContainerTextFlip words={["hello", "world"]} />);
		const letters = container.querySelectorAll(".text-flip-letter");
		const text = Array.from(letters)
			.map((l) => l.textContent)
			.join("");
		expect(text).toBe("hello");
	});

	it("applies custom class", () => {
		const { container } = render(<ContainerTextFlip className="my-flip" />);
		const el = container.querySelector("p");
		expect(el?.className).toContain("my-flip");
	});

	it("renders letters with staggered animation delay", () => {
		const { container } = render(<ContainerTextFlip words={["abc"]} />);
		const letters = container.querySelectorAll(".text-flip-letter");
		expect(letters.length).toBe(3);
		const firstDelay = (letters[0] as HTMLElement).style.animationDelay;
		const secondDelay = (letters[1] as HTMLElement).style.animationDelay;
		expect(firstDelay).toBe("0s");
		expect(secondDelay).toBe("0.02s");
	});

	it("keeps ticking on the original cadence when the words prop identity changes", async () => {
		vi.useFakeTimers();
		try {
			const { container, rerender } = render(
				<ContainerTextFlip words={["hello", "world"]} interval={1000} />
			);
			expect(readWord(container)).toBe("hello");

			await advance(600);

			// A parent re-render passing an equal-but-new array literal. The source
			// arms its interval once in onMount, so the pending tick must survive.
			rerender(<ContainerTextFlip words={["hello", "world"]} interval={1000} />);

			await advance(400);
			expect(readWord(container)).toBe("world");
		} finally {
			vi.useRealTimers();
		}
	});

	it("reads the current words on each tick without restarting the timer", async () => {
		vi.useFakeTimers();
		try {
			const { container, rerender } = render(
				<ContainerTextFlip words={["one", "two"]} interval={1000} />
			);
			expect(readWord(container)).toBe("one");

			await advance(600);
			rerender(<ContainerTextFlip words={["alpha", "beta", "gamma"]} interval={1000} />);

			// Still on the first index — swapping the list does not reset the cycle.
			expect(readWord(container)).toBe("alpha");

			await advance(400);
			expect(readWord(container)).toBe("beta");

			await advance(1000);
			expect(readWord(container)).toBe("gamma");

			// Modulus taken against the CURRENT list length, not the mount-time one.
			await advance(1000);
			expect(readWord(container)).toBe("alpha");
		} finally {
			vi.useRealTimers();
		}
	});

	it("applies custom animation duration", () => {
		const { container } = render(<ContainerTextFlip words={["hi"]} animationDuration={500} />);
		const letter = container.querySelector(".text-flip-letter") as HTMLElement;
		expect(letter.style.animationDuration).toBe("500ms");
	});
});
