import { render, cleanup } from "@testing-library/svelte";
import { tick } from "svelte";
import { afterEach, describe, it, expect, vi } from "vitest";
import NumberTicker from "./NumberTicker.svelte";

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

/**
 * Controllable requestAnimationFrame: frames are queued, never auto-run, and
 * `flush(now)` drives every pending callback with an explicit timestamp.
 */
function installRafMock() {
	const originalRaf = globalThis.requestAnimationFrame;
	const originalCaf = globalThis.cancelAnimationFrame;

	let nextId = 0;
	const pending = new Map<number, FrameRequestCallback>();

	const raf = vi.fn((cb: FrameRequestCallback) => {
		const id = ++nextId;
		pending.set(id, cb);
		return id;
	});
	const caf = vi.fn((id: number) => {
		pending.delete(id);
	});

	globalThis.requestAnimationFrame = raf as unknown as typeof requestAnimationFrame;
	globalThis.cancelAnimationFrame = caf as unknown as typeof cancelAnimationFrame;

	return {
		raf,
		caf,
		flush(now: number) {
			const frames = [...pending.entries()];
			pending.clear();
			for (const [, cb] of frames) cb(now);
		},
		get pendingCount() {
			return pending.size;
		},
		restore() {
			globalThis.requestAnimationFrame = originalRaf;
			globalThis.cancelAnimationFrame = originalCaf;
		},
	};
}

describe("NumberTicker", () => {
	afterEach(() => {
		cleanup();
		MockIntersectionObserver.instances = [];
	});

	it("renders the number-ticker element", () => {
		const { container } = render(NumberTicker, { props: { value: 100 } });
		const ticker = container.querySelector(".number-ticker");
		expect(ticker).toBeTruthy();
	});

	it("displays initial value for direction up as 0", () => {
		const { container } = render(NumberTicker, {
			props: { value: 100, direction: "up" },
		});
		const ticker = container.querySelector(".number-ticker");
		expect(ticker?.textContent).toBe("0");
	});

	it("displays initial value for direction down as the value", () => {
		const { container } = render(NumberTicker, {
			props: { value: 50, direction: "down" },
		});
		const ticker = container.querySelector(".number-ticker");
		expect(ticker?.textContent).toBe("50");
	});

	it("applies custom class names", () => {
		const { container } = render(NumberTicker, {
			props: { value: 42, class: "my-ticker" },
		});
		const ticker = container.querySelector(".number-ticker");
		expect(ticker?.className).toContain("my-ticker");
	});

	it("formats with decimal places", () => {
		const { container } = render(NumberTicker, {
			props: { value: 100, decimalPlaces: 2, direction: "down" },
		});
		const ticker = container.querySelector(".number-ticker");
		expect(ticker?.textContent).toBe("100.00");
	});

	it("observes element for intersection", () => {
		render(NumberTicker, { props: { value: 100 } });
		const lastInstance = MockIntersectionObserver.instances.at(-1);
		expect(lastInstance?.observe).toHaveBeenCalled();
	});

	it("cancels the in-flight frame chain when value changes again", async () => {
		const rafMock = installRafMock();
		try {
			const { rerender } = render(NumberTicker, { props: { value: 100 } });
			MockIntersectionObserver.instances.at(-1)?.trigger(true);
			await tick();

			// The first chain owns exactly one scheduled frame.
			expect(rafMock.raf).toHaveBeenCalledTimes(1);
			const firstChainId = rafMock.raf.mock.results[0]?.value as number;

			await rerender({ value: 200 });
			await tick();

			expect(rafMock.caf).toHaveBeenCalledWith(firstChainId);
			// Only the newest chain is still scheduling frames.
			expect(rafMock.pendingCount).toBe(1);
		} finally {
			rafMock.restore();
		}
	});

	it("converges on the newest target after a rapid value change", async () => {
		const rafMock = installRafMock();
		try {
			const { container, rerender } = render(NumberTicker, { props: { value: 100 } });
			MockIntersectionObserver.instances.at(-1)?.trigger(true);
			await tick();

			await rerender({ value: 200 });
			await tick();

			// Well past both chains' durations: a surviving first chain would land on 100.
			rafMock.flush(performance.now() + 10_000);
			await tick();

			const ticker = container.querySelector(".number-ticker");
			expect(ticker?.textContent).toBe("200");
			// The settled chain released its slot instead of scheduling forever.
			expect(rafMock.pendingCount).toBe(0);
		} finally {
			rafMock.restore();
		}
	});

	it("leaves no frame scheduled on unmount after a value change", async () => {
		const rafMock = installRafMock();
		try {
			const { rerender, unmount } = render(NumberTicker, { props: { value: 100 } });
			MockIntersectionObserver.instances.at(-1)?.trigger(true);
			await tick();

			await rerender({ value: 200 });
			await tick();

			unmount();
			await tick();

			// An uncancelled older chain would keep writing to a destroyed component.
			expect(rafMock.pendingCount).toBe(0);
		} finally {
			rafMock.restore();
		}
	});
});
