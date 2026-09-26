import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { rafThrottle } from "./raf.js";

// Frames are captured rather than actually run (matching float.test.ts's
// house pattern), so `runFrames()` only advances when a test says so. Kept
// as a Map (id → callback) rather than a plain array so the
// cancelAnimationFrame mock can remove a specific pending callback — a
// cancelled frame must never run, exactly like the real API, or
// "cancel() aborts a pending frame" would be untestable.
let frames = new Map<number, FrameRequestCallback>();
let nextId = 0;
let raf: ReturnType<typeof vi.spyOn>;
let caf: ReturnType<typeof vi.spyOn>;

function runFrames() {
	const pending = [...frames.values()];
	frames.clear();
	for (const frame of pending) frame(performance.now());
}

describe("rafThrottle", () => {
	beforeEach(() => {
		frames = new Map();
		nextId = 0;
		raf = vi.spyOn(globalThis, "requestAnimationFrame").mockImplementation((cb) => {
			const id = ++nextId;
			frames.set(id, cb);
			return id;
		});
		caf = vi.spyOn(globalThis, "cancelAnimationFrame").mockImplementation((id: number) => {
			frames.delete(id);
		});
	});

	afterEach(() => {
		vi.restoreAllMocks();
		vi.unstubAllGlobals();
	});

	it("schedules exactly one frame for a burst of synchronous calls", () => {
		const fn = vi.fn();
		const throttled = rafThrottle(fn);

		throttled(1);
		throttled(2);
		throttled(3);

		expect(raf).toHaveBeenCalledTimes(1);
		expect(fn).not.toHaveBeenCalled();
	});

	it("runs the scheduled frame with the LATEST call's arguments, not the first", () => {
		const fn = vi.fn();
		const throttled = rafThrottle(fn);

		throttled(1);
		throttled(2);
		throttled(3);
		runFrames();

		expect(fn).toHaveBeenCalledExactlyOnceWith(3);
	});

	it("never cancels the pending frame to reschedule it — reuses the one already in flight", () => {
		const fn = vi.fn();
		const throttled = rafThrottle(fn);

		throttled(1);
		throttled(2);
		throttled(3);

		expect(caf).not.toHaveBeenCalled();
		expect(raf).toHaveBeenCalledTimes(1);
	});

	it("schedules a fresh frame once the pending one has run", () => {
		const fn = vi.fn();
		const throttled = rafThrottle(fn);

		throttled(1);
		runFrames();
		throttled(2);
		runFrames();

		expect(raf).toHaveBeenCalledTimes(2);
		expect(fn).toHaveBeenLastCalledWith(2);
	});

	it("cancel() aborts a pending frame so fn never runs", () => {
		const fn = vi.fn();
		const throttled = rafThrottle(fn);

		throttled(1);
		throttled.cancel();
		runFrames();

		expect(caf).toHaveBeenCalledTimes(1);
		expect(fn).not.toHaveBeenCalled();
	});

	it("cancel() with nothing pending does not throw and does not call cancelAnimationFrame", () => {
		const throttled = rafThrottle(vi.fn());
		expect(() => throttled.cancel()).not.toThrow();
		expect(caf).not.toHaveBeenCalled();
	});

	it("a call after cancel() schedules a fresh frame", () => {
		const fn = vi.fn();
		const throttled = rafThrottle(fn);

		throttled(1);
		throttled.cancel();
		throttled(2);
		runFrames();

		expect(fn).toHaveBeenCalledExactlyOnceWith(2);
	});

	it("calls fn synchronously when requestAnimationFrame is unavailable", () => {
		raf.mockRestore();
		vi.stubGlobal("requestAnimationFrame", undefined);

		const fn = vi.fn();
		const throttled = rafThrottle(fn);
		throttled(42);

		expect(fn).toHaveBeenCalledExactlyOnceWith(42);
	});
});
