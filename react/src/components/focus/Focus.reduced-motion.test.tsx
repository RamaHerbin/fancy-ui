/**
 * Focus under `prefers-reduced-motion: reduce`: the transitions are CSS-gated,
 * so the component must still move its active word, blur the others and keep
 * the frame visible and positioned: only the in-between animation goes away.
 */
import { render, cleanup, act, fireEvent } from "@testing-library/react";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { Focus } from "./Focus.js";

describe("Focus under prefers-reduced-motion: reduce", () => {
	const originalMatchMedia = window.matchMedia;

	beforeEach(() => {
		window.matchMedia = ((query: string) => ({
			matches: query.includes("reduce") && !query.includes("no-preference"),
			media: query,
			onchange: null,
			addEventListener: () => {},
			removeEventListener: () => {},
			addListener: () => {},
			removeListener: () => {},
			dispatchEvent: () => false,
		})) as unknown as typeof window.matchMedia;
	});

	afterEach(() => {
		cleanup();
		window.matchMedia = originalMatchMedia;
		vi.useRealTimers();
	});

	it("still moves the active word and keeps the frame visible and positioned (manual mode)", () => {
		const { container } = render(<Focus sentence="A B C" manualMode blurAmount={6} />);
		const words = container.querySelectorAll(".focus-word");
		fireEvent.mouseEnter(words[2] as HTMLElement);
		expect((words[2] as HTMLElement).style.filter).toBe("blur(0px)");
		expect((words[0] as HTMLElement).style.filter).toBe("blur(6px)");
		const frame = container.querySelector(".focus-frame") as HTMLElement;
		expect(frame.style.opacity).toBe("1");
		expect(frame.style.transform).toContain("translate(");
	});

	it("still advances the active word on its timer (auto mode)", () => {
		vi.useFakeTimers();
		const { container } = render(
			<Focus sentence="A B" blurAmount={6} animationDuration={0.5} pauseBetweenAnimations={1} />
		);
		const words = container.querySelectorAll(".focus-word");
		expect((words[0] as HTMLElement).style.filter).toBe("blur(0px)");
		act(() => {
			vi.advanceTimersByTime(1600);
		});
		expect((words[1] as HTMLElement).style.filter).toBe("blur(0px)");
		expect((words[0] as HTMLElement).style.filter).toBe("blur(6px)");
	});
});
