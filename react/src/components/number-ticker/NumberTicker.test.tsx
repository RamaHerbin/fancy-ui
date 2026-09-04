import { render, cleanup, act } from "@testing-library/react";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import type { MockInstance } from "vitest";
import { NumberTicker } from "./NumberTicker.js";

// Mock IntersectionObserver as a class
class MockIntersectionObserver {
	callback: IntersectionObserverCallback;
	static instances: MockIntersectionObserver[] = [];

	constructor(callback: IntersectionObserverCallback) {
		this.callback = callback;
		MockIntersectionObserver.instances.push(this);
	}

	observe = vi.fn();
	disconnect = vi.fn();
	unobserve = vi.fn();

	// Helper to trigger intersection
	trigger(isIntersecting: boolean) {
		this.callback(
			[{ isIntersecting } as IntersectionObserverEntry],
			this as unknown as IntersectionObserver
		);
	}
}

vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);

describe("NumberTicker", () => {
	afterEach(() => {
		cleanup();
		MockIntersectionObserver.instances = [];
	});

	it("renders the number-ticker element", () => {
		const { container } = render(<NumberTicker value={100} />);
		const ticker = container.querySelector(".number-ticker");
		expect(ticker).toBeTruthy();
	});

	it("displays initial value for direction up as 0", () => {
		const { container } = render(<NumberTicker value={100} direction="up" />);
		const ticker = container.querySelector(".number-ticker");
		expect(ticker?.textContent).toBe("0");
	});

	it("displays initial value for direction down as the value", () => {
		const { container } = render(<NumberTicker value={50} direction="down" />);
		const ticker = container.querySelector(".number-ticker");
		expect(ticker?.textContent).toBe("50");
	});

	it("applies custom class names", () => {
		const { container } = render(<NumberTicker value={42} className="my-ticker" />);
		const ticker = container.querySelector(".number-ticker");
		expect(ticker?.className).toContain("my-ticker");
	});

	it("formats with decimal places", () => {
		const { container } = render(
			<NumberTicker value={100} decimalPlaces={2} direction="down" />
		);
		const ticker = container.querySelector(".number-ticker");
		expect(ticker?.textContent).toBe("100.00");
	});

	it("observes element for intersection", () => {
		render(<NumberTicker value={100} />);
		const lastInstance = MockIntersectionObserver.instances.at(-1);
		expect(lastInstance?.observe).toHaveBeenCalled();
	});

	describe("frame chain", () => {
		let nextFrameId = 0;
		let pending: Map<number, FrameRequestCallback>;
		let cancelSpy: MockInstance<(handle: number) => void>;

		beforeEach(() => {
			nextFrameId = 0;
			pending = new Map();
			vi.spyOn(globalThis, "requestAnimationFrame").mockImplementation((cb) => {
				nextFrameId += 1;
				pending.set(nextFrameId, cb);
				return nextFrameId;
			});
			cancelSpy = vi.spyOn(globalThis, "cancelAnimationFrame").mockImplementation((id) => {
				pending.delete(id);
			});
		});

		afterEach(() => {
			vi.restoreAllMocks();
		});

		// Runs every frame callback currently queued; each live chain re-queues exactly
		// one, so `pending.size` after a flush is the number of chains still running.
		function flushFrame(now: number) {
			const callbacks = [...pending.values()];
			pending.clear();
			act(() => {
				for (const cb of callbacks) cb(now);
			});
		}

		it("runs a single frame chain when value changes mid-animation", () => {
			const { rerender } = render(<NumberTicker value={100} />);
			act(() => {
				MockIntersectionObserver.instances.at(-1)?.trigger(true);
			});
			expect(pending.size).toBe(1);

			flushFrame(performance.now() + 1);
			expect(pending.size).toBe(1);

			rerender(<NumberTicker value={200} />);
			expect(pending.size).toBe(1);

			flushFrame(performance.now() + 2);
			expect(pending.size).toBe(1);
		});

		it("converges on the newest target after a rapid value change", () => {
			const { container, rerender } = render(<NumberTicker value={100} />);
			act(() => {
				MockIntersectionObserver.instances.at(-1)?.trigger(true);
			});

			rerender(<NumberTicker value={200} />);

			// Well past both chains' durations: a surviving first chain would land on 100.
			flushFrame(performance.now() + 10_000);

			const ticker = container.querySelector(".number-ticker");
			expect(ticker?.textContent).toBe("200");
			// The settled chain released its slot instead of scheduling forever.
			expect(pending.size).toBe(0);
		});

		it("leaves no frame scheduled after unmount", () => {
			const { rerender, unmount } = render(<NumberTicker value={100} />);
			act(() => {
				MockIntersectionObserver.instances.at(-1)?.trigger(true);
			});
			flushFrame(performance.now() + 1);
			rerender(<NumberTicker value={200} />);
			flushFrame(performance.now() + 2);

			unmount();
			expect(pending.size).toBe(0);
		});

		it("clears the frame slot when the animation completes", () => {
			const { unmount } = render(<NumberTicker value={100} duration={100} />);
			act(() => {
				MockIntersectionObserver.instances.at(-1)?.trigger(true);
			});
			flushFrame(performance.now() + 1000);
			expect(pending.size).toBe(0);

			// Slot emptied by the last tick, so the cleanup has nothing to cancel.
			cancelSpy.mockClear();
			unmount();
			expect(cancelSpy).not.toHaveBeenCalled();
		});
	});
});
