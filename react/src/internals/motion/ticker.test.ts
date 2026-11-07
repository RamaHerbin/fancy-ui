import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetTickerForTests, subscribe, tickerSubscriberCount } from "./ticker.js";

// --- harness ------------------------------------------------------------------

let callbacks: Map<number, FrameRequestCallback>;
let counter = 0;
const raf = vi.fn((cb: FrameRequestCallback) => {
	const id = ++counter;
	callbacks.set(id, cb);
	return id;
});
const caf = vi.fn((id: number) => {
	callbacks.delete(id);
});

class MockIO {
	static instances: MockIO[] = [];
	cb: IntersectionObserverCallback;
	options: IntersectionObserverInit | undefined;
	constructor(cb: IntersectionObserverCallback, options?: IntersectionObserverInit) {
		this.cb = cb;
		this.options = options;
		MockIO.instances.push(this);
	}
	observe = vi.fn();
	disconnect = vi.fn();
	unobserve = vi.fn();
	trigger(isIntersecting: boolean) {
		this.cb(
			[{ isIntersecting } as IntersectionObserverEntry],
			this as unknown as IntersectionObserver
		);
	}
}

/** Run the pending frame callback (if any) with the given timestamp. */
function frame(t: number) {
	const pending = [...callbacks.entries()];
	callbacks.clear();
	for (const [, cb] of pending) cb(t);
}

function setHidden(hidden: boolean) {
	Object.defineProperty(document, "hidden", { configurable: true, get: () => hidden });
	document.dispatchEvent(new Event("visibilitychange"));
}

beforeEach(() => {
	callbacks = new Map();
	counter = 0;
	raf.mockClear();
	caf.mockClear();
	MockIO.instances = [];
	vi.stubGlobal("requestAnimationFrame", raf);
	vi.stubGlobal("cancelAnimationFrame", caf);
	vi.stubGlobal("IntersectionObserver", MockIO);
});

afterEach(() => {
	resetTickerForTests();
	delete (document as unknown as { hidden?: boolean }).hidden;
	vi.unstubAllGlobals();
});

// --- tests --------------------------------------------------------------------

describe("ticker", () => {
	it("shares one frame request between subscribers", () => {
		const a = vi.fn();
		const b = vi.fn();
		subscribe({ onFrame: a });
		subscribe({ onFrame: b });
		expect(raf).toHaveBeenCalledTimes(1);
		frame(16);
		expect(raf).toHaveBeenCalledTimes(2);
		expect(a).toHaveBeenCalledTimes(1);
		expect(b).toHaveBeenCalledTimes(1);
		expect(tickerSubscriberCount()).toBe(2);
	});

	it("observes the element with the default margin and parks an offscreen subscriber", () => {
		const el = document.createElement("div");
		const a = vi.fn();
		const b = vi.fn();
		subscribe({ el, onFrame: a });
		subscribe({ onFrame: b });
		expect(MockIO.instances).toHaveLength(1);
		expect(MockIO.instances[0]!.options).toMatchObject({ rootMargin: "256px", threshold: 0 });
		expect(MockIO.instances[0]!.observe).toHaveBeenCalledWith(el);

		frame(16);
		MockIO.instances[0]!.trigger(false);
		frame(32);
		expect(a).toHaveBeenCalledTimes(1);
		expect(b).toHaveBeenCalledTimes(2);
	});

	it("stops requesting frames when every subscriber is parked and restarts on resume", () => {
		const sub = subscribe({ onFrame: vi.fn() });
		frame(16);
		sub.setPaused(true);
		expect(sub.paused).toBe(true);
		frame(32); // the pending frame sees nobody live and does not reschedule
		expect(callbacks.size).toBe(0);
		const before = raf.mock.calls.length;
		sub.setPaused(false);
		expect(raf.mock.calls.length).toBe(before + 1);
		expect(sub.paused).toBe(false);
	});

	it("restarts when a parked element scrolls back into view", () => {
		const el = document.createElement("div");
		const onFrame = vi.fn();
		subscribe({ el, onFrame });
		MockIO.instances[0]!.trigger(false);
		frame(16);
		expect(callbacks.size).toBe(0);
		MockIO.instances[0]!.trigger(true);
		expect(callbacks.size).toBe(1);
		frame(32);
		expect(onFrame).toHaveBeenCalledTimes(1);
	});

	it("stops while the document is hidden and restarts when it is visible", () => {
		const onFrame = vi.fn();
		subscribe({ onFrame });
		frame(16);
		setHidden(true);
		expect(caf).toHaveBeenCalled();
		expect(callbacks.size).toBe(0);
		// Waking a parked subscriber while hidden requests nothing.
		const other = subscribe({ onFrame: vi.fn() });
		other.setPaused(true);
		other.setPaused(false);
		expect(callbacks.size).toBe(0);
		setHidden(false);
		expect(callbacks.size).toBe(1);
		frame(5000);
		expect(onFrame).toHaveBeenLastCalledWith(0, 5000);
	});

	it("throttles to the requested fps", () => {
		const onFrame = vi.fn();
		subscribe({ onFrame, fps: 30 });
		let t = 0;
		for (let i = 0; i < 12; i++) {
			frame(t);
			t += 1000 / 120;
		}
		// 120 Hz source at 30 fps: every 4th frame.
		expect(onFrame).toHaveBeenCalledTimes(3);
	});

	it("passes dt in seconds, zero on the first frame, clamped on big jumps", () => {
		const dts: number[] = [];
		subscribe({ onFrame: (dt) => dts.push(dt) });
		frame(1000);
		frame(1016);
		frame(1016 + 5000);
		expect(dts[0]).toBe(0);
		expect(dts[1]).toBeCloseTo(0.016, 6);
		expect(dts[2]).toBe(0.064);
	});

	it("integrates dt 0 on the frame after a resume", () => {
		const dts: number[] = [];
		const sub = subscribe({ onFrame: (dt) => dts.push(dt) });
		frame(100);
		frame(116);
		sub.setPaused(true);
		sub.setPaused(false);
		frame(5000);
		expect(dts).toEqual([0, expect.closeTo(0.016, 6), 0]);
	});

	it("tolerates setPaused(true) and unsubscribe from inside a frame", () => {
		const other = vi.fn();
		let selfSub: ReturnType<typeof subscribe> | undefined;
		let otherSub: ReturnType<typeof subscribe> | undefined;
		selfSub = subscribe({
			onFrame: () => {
				selfSub?.setPaused(true);
				otherSub?.unsubscribe();
			},
		});
		otherSub = subscribe({ onFrame: other });
		frame(16);
		expect(other).not.toHaveBeenCalled();
		expect(tickerSubscriberCount()).toBe(1);
		frame(32);
		expect(callbacks.size).toBe(0);
	});

	it("cancels the frame and removes the listener on the last unsubscribe", () => {
		const remove = vi.spyOn(document, "removeEventListener");
		const a = subscribe({ onFrame: vi.fn() });
		const b = subscribe({ onFrame: vi.fn() });
		a.unsubscribe();
		expect(caf).not.toHaveBeenCalled();
		b.unsubscribe();
		expect(caf).toHaveBeenCalledTimes(1);
		expect(remove).toHaveBeenCalledWith("visibilitychange", expect.any(Function));
		expect(tickerSubscriberCount()).toBe(0);
		b.unsubscribe(); // idempotent
		expect(caf).toHaveBeenCalledTimes(1);
		remove.mockRestore();
	});

	it("disconnects the observer on unsubscribe", () => {
		const sub = subscribe({ el: document.createElement("div"), onFrame: vi.fn() });
		sub.unsubscribe();
		expect(MockIO.instances[0]!.disconnect).toHaveBeenCalled();
	});

	it("returns an inert handle when requestAnimationFrame is unavailable", () => {
		vi.stubGlobal("requestAnimationFrame", undefined);
		const sub = subscribe({ onFrame: vi.fn() });
		expect(() => {
			sub.setPaused(false);
			sub.unsubscribe();
		}).not.toThrow();
		expect(tickerSubscriberCount()).toBe(0);
	});
});
