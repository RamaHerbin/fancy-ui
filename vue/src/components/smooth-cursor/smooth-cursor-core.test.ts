import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
	createSmoothCursor,
	type SmoothCursorElements,
	type SmoothCursorInitOptions,
	type SmoothCursorLiveOptions,
} from "./smooth-cursor-core.js";

/** Runs queued rAF callbacks once, like advancing exactly one frame. */
function flushRaf(time: number) {
	const callbacks = [...rafCallbacks];
	rafCallbacks.length = 0;
	for (const cb of callbacks) cb(time);
}

/** Current translate3d X of the rendered transform, 0 when nothing was written. */
function readX(el: HTMLElement): number {
	return parseFloat(/translate3d\(([-\d.]+)px/.exec(el.style.transform)?.[1] ?? "0");
}

/** Current rotate() angle of the rendered transform, 0 when none was written. */
function readRotation(el: HTMLElement): number {
	return parseFloat(/rotate\(([-\d.]+)deg/.exec(el.style.transform)?.[1] ?? "0");
}

let rafCallbacks: FrameRequestCallback[] = [];
let rafId = 0;
let cancelSpy: ReturnType<typeof vi.fn>;

beforeEach(() => {
	rafCallbacks = [];
	rafId = 0;
	vi.stubGlobal(
		"requestAnimationFrame",
		vi.fn((cb: FrameRequestCallback) => {
			rafCallbacks.push(cb);
			return ++rafId;
		})
	);
	cancelSpy = vi.fn();
	vi.stubGlobal("cancelAnimationFrame", cancelSpy);
});

let liveEngines: { destroy(): void }[] = [];

afterEach(() => {
	// Every engine attaches listeners to `document`, which jsdom keeps alive
	// across tests in this file — destroy what each test created so the next
	// test's dispatches don't also reach a previous test's engine.
	for (const engine of liveEngines) engine.destroy();
	liveEngines = [];
	vi.unstubAllGlobals();
	document.body.style.cursor = "";
});

function makeCursorEl(): HTMLElement {
	const el = document.createElement("div");
	document.body.appendChild(el);
	return el;
}

/** createSmoothCursor, tracked for automatic afterEach cleanup. */
function create(el: SmoothCursorElements, options: SmoothCursorInitOptions & SmoothCursorLiveOptions) {
	const engine = createSmoothCursor(el, options);
	liveEngines.push(engine);
	return engine;
}

describe("createSmoothCursor", () => {
	it("hides the native cursor on creation and restores it on destroy", () => {
		const cursor = makeCursorEl();
		const engine = create({ cursor }, {});
		expect(document.body.style.cursor).toBe("none");
		engine.destroy();
		expect(document.body.style.cursor).toBe("");
	});

	it("stays invisible and reports no visibility change before any pointer event", () => {
		const cursor = makeCursorEl();
		const onVisibleChange = vi.fn();
		create({ cursor }, { onVisibleChange });
		expect(onVisibleChange).not.toHaveBeenCalled();
	});

	it("becomes visible and starts the rAF loop on mousemove", () => {
		const cursor = makeCursorEl();
		const onVisibleChange = vi.fn();
		create({ cursor }, { onVisibleChange });

		document.dispatchEvent(new MouseEvent("mousemove", { clientX: 10, clientY: 20 }));

		expect(onVisibleChange).toHaveBeenCalledExactlyOnceWith(true);
		expect(rafCallbacks.length).toBe(1);
		// No frame has run yet: the transform write only happens inside animate().
		expect(cursor.style.transform).toBe("");

		flushRaf(1000); // first frame only records lastTime, per the original loop
		flushRaf(1016); // pos already equals target: spring force is zero, no drift
		expect(cursor.style.transform).toBe("translate3d(10px, 20px, 0) rotate(0deg)");
	});

	it("becomes invisible and stops the loop on mouseleave from the document", () => {
		const cursor = makeCursorEl();
		const onVisibleChange = vi.fn();
		create({ cursor }, { onVisibleChange });

		document.dispatchEvent(new MouseEvent("mousemove", { clientX: 10, clientY: 20 }));
		document.documentElement.dispatchEvent(new MouseEvent("mouseleave"));

		expect(onVisibleChange).toHaveBeenLastCalledWith(false);
		expect(cancelSpy).toHaveBeenCalled();
	});

	it("snaps directly to the pointer with no rotation when reducedMotion is set at creation", () => {
		const cursor = makeCursorEl();
		create({ cursor }, { reducedMotion: true });

		document.dispatchEvent(new MouseEvent("mousemove", { clientX: 5, clientY: 7 }));

		expect(cursor.style.transform).toBe("translate3d(5px, 7px, 0)");
		expect(rafCallbacks.length).toBe(0);
	});

	it("setOptions({ reducedMotion: true }) stops the loop and snaps to the current target", () => {
		const cursor = makeCursorEl();
		const engine = create({ cursor }, {});

		document.dispatchEvent(new MouseEvent("mousemove", { clientX: 100, clientY: 50 }));
		expect(rafCallbacks.length).toBe(1);

		engine.setOptions({ reducedMotion: true });

		expect(cancelSpy).toHaveBeenCalled();
		expect(cursor.style.transform).toBe("translate3d(100px, 50px, 0)");
	});

	it("setOptions({ reducedMotion: false }) resumes the loop while visible", () => {
		const cursor = makeCursorEl();
		const engine = create({ cursor }, { reducedMotion: true });

		document.dispatchEvent(new MouseEvent("mousemove", { clientX: 1, clientY: 1 }));
		expect(rafCallbacks.length).toBe(0);

		engine.setOptions({ reducedMotion: false });
		document.dispatchEvent(new MouseEvent("mousemove", { clientX: 2, clientY: 2 }));

		expect(rafCallbacks.length).toBe(1);
	});

	it("setOptions({ springConfig }) is picked up by the next animation frame", () => {
		const cursor = makeCursorEl();
		const engine = create({ cursor }, {});

		document.dispatchEvent(new MouseEvent("mousemove", { clientX: 0, clientY: 0 }));
		flushRaf(1000); // first frame only records lastTime, per the original loop

		// Move the target far away, then advance with two very different spring
		// configs — a much stiffer spring should close more distance per tick.
		document.dispatchEvent(new MouseEvent("mousemove", { clientX: 1000, clientY: 0 }));

		engine.setOptions({ springConfig: { stiffness: 10, damping: 45, mass: 1 } });
		flushRaf(1016);
		const lowStiffnessX = readX(cursor);

		// Reset and repeat with a much stiffer spring for comparison.
		cursor.style.transform = "";
		document.documentElement.dispatchEvent(new MouseEvent("mouseleave"));
		document.dispatchEvent(new MouseEvent("mousemove", { clientX: 0, clientY: 0 }));
		flushRaf(2000);
		document.dispatchEvent(new MouseEvent("mousemove", { clientX: 1000, clientY: 0 }));
		engine.setOptions({ springConfig: { stiffness: 4000, damping: 45, mass: 1 } });
		flushRaf(2016);
		const highStiffnessX = readX(cursor);

		expect(highStiffnessX).toBeGreaterThan(lowStiffnessX);
	});

	it("clamps the frame delta to 64ms so a long stall integrates a single 64ms step", () => {
		const cursor = makeCursorEl();
		create({ cursor }, {});

		document.dispatchEvent(new MouseEvent("mousemove", { clientX: 0, clientY: 0 }));
		// NB: never time-stamp a frame 0 here — `lastTime === 0` is the loop's
		// "first frame, only record the timestamp" sentinel, so a frame at 0 would
		// re-enter that branch forever and no integration step would ever run.
		flushRaf(100);
		expect(cursor.style.transform).toBe(""); // sentinel frame writes nothing

		document.dispatchEvent(new MouseEvent("mousemove", { clientX: 1000, clientY: 0 }));
		flushRaf(1100); // a 1000ms stall — dt would be 1s without the clamp

		const x = readX(cursor);
		// dt clamped to 0.064s with the default spring (stiffness 400, damping 45,
		// mass 1): vel = 400 * 1000 * 0.064 = 25600, pos = 25600 * 0.064 = 1638.4.
		expect(x).toBeCloseTo(1638.4, 6);
		// Without the clamp the very same frame integrates dt = 1s -> pos = 400000.
		expect(x).toBeLessThan(2000);
	});

	it("setOptions({ reducedMotion: true }) snaps even while the pointer is off-screen", () => {
		const cursor = makeCursorEl();
		const engine = create({ cursor }, {});

		// No pointer event has ever fired, so the engine is not visible.
		engine.setOptions({ reducedMotion: true });

		// The original `onMotionChange` called snapToTarget() unconditionally, which
		// writes the transform even at the untouched (0, 0) origin.
		expect(cursor.style.transform).toBe("translate3d(0px, 0px, 0)");
	});

	it("setOptions({ reducedMotion: true }) while hidden zeroes the in-flight velocity", () => {
		const cursor = makeCursorEl();
		const engine = create({ cursor }, {});

		// Build up real spring velocity: settle at the origin, then fling the
		// target 1000px away and run one integrating frame.
		document.dispatchEvent(new MouseEvent("mousemove", { clientX: 0, clientY: 0 }));
		flushRaf(100);
		document.dispatchEvent(new MouseEvent("mousemove", { clientX: 1000, clientY: 0 }));
		flushRaf(116);
		expect(readX(cursor)).toBeGreaterThan(0);
		expect(readX(cursor)).toBeLessThan(1000); // still mid-flight

		// Pointer leaves the window mid-flight, then reduced motion turns on.
		document.documentElement.dispatchEvent(new MouseEvent("mouseleave"));
		engine.setOptions({ reducedMotion: true });
		expect(cursor.style.transform).toBe("translate3d(1000px, 0px, 0)");

		// Reduced motion back off, pointer returns at the same spot: because the
		// snap zeroed velX/velY (the only code path that does), the first frame
		// renders exactly at the pointer instead of overshooting on residual
		// velocity. onMouseMove resets pos/prev but never the velocity.
		engine.setOptions({ reducedMotion: false });
		document.dispatchEvent(new MouseEvent("mousemove", { clientX: 1000, clientY: 0 }));
		flushRaf(200);
		flushRaf(216);
		expect(readX(cursor)).toBe(1000);
	});

	it("integrates the default spring (damping 45, stiffness 400, mass 1) exactly", () => {
		const cursor = makeCursorEl();
		create({ cursor }, {});

		document.dispatchEvent(new MouseEvent("mousemove", { clientX: 0, clientY: 0 }));
		flushRaf(100); // sentinel frame: records lastTime only
		document.dispatchEvent(new MouseEvent("mousemove", { clientX: 1000, clientY: 0 }));

		// Frame A, dt = 16ms: force = -400 * (0 - 1000) = 400000, acc = force / mass,
		// vel = 400000 * 0.016 = 6400, pos = 6400 * 0.016 = 102.4.
		// Rotation: dx = 102.4 (> 0.1), target angle 90deg, eased by 0.3 -> 27deg.
		flushRaf(116);
		expect(readX(cursor)).toBeCloseTo(102.4, 6);
		expect(readRotation(cursor)).toBeCloseTo(27, 6);

		// Frame B, dt = 16ms: the damping term finally bites —
		// force = -400 * (102.4 - 1000) - 45 * 6400 = 359040 - 288000 = 71040,
		// vel = 6400 + 71040 * 0.016 = 7536.64, pos = 102.4 + 7536.64 * 0.016.
		// Rotation eases the remaining 63deg by 0.3 -> 27 + 18.9 = 45.9deg.
		flushRaf(132);
		expect(readX(cursor)).toBeCloseTo(222.98624, 6);
		expect(readRotation(cursor)).toBeCloseTo(45.9, 6);
	});

	it("leaves the rotation untouched for movement at or below 0.1px", () => {
		const cursor = makeCursorEl();
		create({ cursor }, {});

		// Settle exactly on the pointer: pos == target, vel == 0, rotation == 0.
		document.dispatchEvent(new MouseEvent("mousemove", { clientX: 0, clientY: 0 }));
		flushRaf(100);
		flushRaf(116);
		expect(readRotation(cursor)).toBe(0);

		// A 0.5px target nudge moves the spring 400 * 0.5 * 0.016 * 0.016 = 0.0512px
		// in one frame — under the 0.1px threshold, so the movement-direction angle
		// (which would be 90deg, eased to 27deg) is NOT recomputed.
		document.dispatchEvent(new MouseEvent("mousemove", { clientX: 0.5, clientY: 0 }));
		flushRaf(132);

		expect(readX(cursor)).toBeCloseTo(0.0512, 8);
		expect(readRotation(cursor)).toBe(0);
	});

	it("destroy() is idempotent and leaves the loop cancelled", () => {
		const cursor = makeCursorEl();
		const engine = create({ cursor }, {});
		document.dispatchEvent(new MouseEvent("mousemove", { clientX: 1, clientY: 1 }));

		engine.destroy();
		const callsAfterFirst = cancelSpy.mock.calls.length;
		expect(() => engine.destroy()).not.toThrow();
		expect(cancelSpy.mock.calls.length).toBe(callsAfterFirst);
	});

	it("removed listeners after destroy no longer move or show the cursor", () => {
		const cursor = makeCursorEl();
		const onVisibleChange = vi.fn();
		const engine = create({ cursor }, { onVisibleChange });
		engine.destroy();

		onVisibleChange.mockClear();
		document.dispatchEvent(new MouseEvent("mousemove", { clientX: 1, clientY: 1 }));

		expect(onVisibleChange).not.toHaveBeenCalled();
	});

	it("setOptions after destroy is a safe no-op", () => {
		const cursor = makeCursorEl();
		const engine = create({ cursor }, {});
		engine.destroy();
		expect(() => engine.setOptions({ reducedMotion: true })).not.toThrow();
	});

	it("resize() is a safe no-op before and after destroy", () => {
		const cursor = makeCursorEl();
		const engine = create({ cursor }, {});
		expect(() => engine.resize()).not.toThrow();
		engine.destroy();
		expect(() => engine.resize()).not.toThrow();
	});
});
