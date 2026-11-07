import { render, cleanup, act } from "@testing-library/react";
import { afterEach, describe, it, expect, vi } from "vitest";
import { Focus } from "./Focus.js";

describe("Focus first frame", () => {
	afterEach(() => {
		cleanup();
		vi.useRealTimers();
	});

	it("places the frame without a transition, then switches transitions on one frame later", () => {
		vi.useFakeTimers({ toFake: ["requestAnimationFrame", "cancelAnimationFrame", "setInterval"] });
		const { container } = render(<Focus sentence="A B" />);
		const frame = container.querySelector(".focus-frame") as HTMLElement;
		// Not the flying-in-from-the-corner state: no transition on the first paint.
		expect(frame.style.transition).toBe("none");
		act(() => {
			vi.advanceTimersByTime(32);
		});
		expect(frame.style.transition).toBe("");
	});
});
