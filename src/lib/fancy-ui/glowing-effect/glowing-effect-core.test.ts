import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createGlowingEffect } from "./glowing-effect-core.js";

function makeContainer(rect: Partial<DOMRect> = {}) {
	const container = document.createElement("div");
	document.body.appendChild(container);
	vi.spyOn(container, "getBoundingClientRect").mockReturnValue({
		left: 0,
		top: 0,
		width: 100,
		height: 100,
		right: 100,
		bottom: 100,
		x: 0,
		y: 0,
		toJSON() {
			return this;
		},
		...rect,
	} as DOMRect);
	return container;
}

describe("createGlowingEffect", () => {
	let rafSpy: ReturnType<typeof vi.spyOn>;
	let cafSpy: ReturnType<typeof vi.spyOn>;
	let callbacks: FrameRequestCallback[];
	let nextId: number;

	beforeEach(() => {
		callbacks = [];
		nextId = 1;
		rafSpy = vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
			callbacks.push(cb);
			return nextId++;
		});
		cafSpy = vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});
	});

	afterEach(() => {
		document.body.innerHTML = "";
		rafSpy.mockRestore();
		cafSpy.mockRestore();
	});

	function flushOnce(time = 0) {
		const pending = callbacks.splice(0, callbacks.length);
		for (const cb of pending) cb(time);
	}

	it("never returns null: the engine only needs a DOM element and rAF", () => {
		const container = makeContainer();
		const engine = createGlowingEffect({ container }, {});
		expect(engine).not.toBeNull();
		engine?.destroy();
	});

	it("registers scroll and pointermove listeners on create", () => {
		const winAdd = vi.spyOn(window, "addEventListener");
		const bodyAdd = vi.spyOn(document.body, "addEventListener");
		const container = makeContainer();

		const engine = createGlowingEffect({ container }, {});

		expect(winAdd).toHaveBeenCalledWith("scroll", expect.any(Function), { passive: true });
		expect(bodyAdd).toHaveBeenCalledWith("pointermove", expect.any(Function), { passive: true });

		engine?.destroy();
		winAdd.mockRestore();
		bodyAdd.mockRestore();
	});

	it("setOptions accepts a partial options object without throwing", () => {
		const container = makeContainer();
		const engine = createGlowingEffect({ container }, {});
		expect(() => engine?.setOptions({})).not.toThrow();
		engine?.destroy();
	});

	it("setOptions applies a live inactiveZone (the pre-extraction props were read per frame)", () => {
		const container = makeContainer();
		const engine = createGlowingEffect({ container }, { inactiveZone: 0.1, proximity: 0 });

		// hypot(45, 45) = 63.6 > inactiveRadius 0.5 * 100 * 0.1 = 5 -> active.
		document.body.dispatchEvent(new PointerEvent("pointermove", { clientX: 95, clientY: 95 }));
		flushOnce();
		expect(container.style.getPropertyValue("--active")).toBe("1");

		// Same pointer, wider inactive zone: radius 0.5 * 100 * 1.5 = 75 > 63.6 -> inactive.
		engine?.setOptions({ inactiveZone: 1.5 });
		document.body.dispatchEvent(new PointerEvent("pointermove", { clientX: 95, clientY: 95 }));
		flushOnce();
		expect(container.style.getPropertyValue("--active")).toBe("0");

		engine?.destroy();
	});

	it("setOptions applies a live proximity margin", () => {
		const container = makeContainer();
		const engine = createGlowingEffect({ container }, { inactiveZone: 0.1, proximity: 0 });

		// x = 150 is outside the 0..100 bounds with no margin.
		document.body.dispatchEvent(new PointerEvent("pointermove", { clientX: 150, clientY: 50 }));
		flushOnce();
		expect(container.style.getPropertyValue("--active")).toBe("0");

		engine?.setOptions({ proximity: 100 });
		document.body.dispatchEvent(new PointerEvent("pointermove", { clientX: 150, clientY: 50 }));
		flushOnce();
		expect(container.style.getPropertyValue("--active")).toBe("1");

		engine?.destroy();
	});

	it("setOptions applies a live movementDuration to the very next tween step", () => {
		const container = makeContainer();
		const engine = createGlowingEffect(
			{ container },
			{ inactiveZone: 0.1, proximity: 0, movementDuration: 2 }
		);

		// Pointer due right of center -> rawTarget = 90deg, currentAngle starts at 0.
		// speed = 0.08 / max(0.5, 0.1) = 0.16 -> first step lands on 90 * 0.16 = 14.4.
		engine?.setOptions({ movementDuration: 0.5 });
		document.body.dispatchEvent(new PointerEvent("pointermove", { clientX: 95, clientY: 50 }));
		flushOnce();

		expect(Number(container.style.getPropertyValue("--start"))).toBeCloseTo(14.4, 10);

		engine?.destroy();
	});

	it("setOptions ignores absent keys and is inert after destroy", () => {
		const container = makeContainer();
		const engine = createGlowingEffect({ container }, { inactiveZone: 0.1, proximity: 0 });

		// Only proximity is pushed: inactiveZone must keep its create-time value.
		engine?.setOptions({ proximity: 5 });
		document.body.dispatchEvent(new PointerEvent("pointermove", { clientX: 95, clientY: 95 }));
		flushOnce();
		expect(container.style.getPropertyValue("--active")).toBe("1");

		engine?.destroy();
		expect(() => engine?.setOptions({ inactiveZone: 1.5 })).not.toThrow();

		// Destroyed engines no longer sample the pointer at all.
		container.style.removeProperty("--active");
		document.body.dispatchEvent(new PointerEvent("pointermove", { clientX: 95, clientY: 95 }));
		flushOnce();
		expect(container.style.getPropertyValue("--active")).toBe("");
	});

	it("resize is safe to call before and after destroy", () => {
		const container = makeContainer();
		const engine = createGlowingEffect({ container }, {});
		expect(() => engine?.resize()).not.toThrow();
		engine?.destroy();
		expect(() => engine?.resize()).not.toThrow();
	});

	it("destroy is idempotent and cancels pending rAFs", () => {
		const container = makeContainer();
		const engine = createGlowingEffect({ container }, {});

		document.body.dispatchEvent(new PointerEvent("pointermove", { clientX: 60, clientY: 10 }));

		engine?.destroy();
		engine?.destroy();

		expect(cafSpy).toHaveBeenCalled();
	});

	it("destroy removes the scroll and pointermove listeners", () => {
		const winRemove = vi.spyOn(window, "removeEventListener");
		const bodyRemove = vi.spyOn(document.body, "removeEventListener");
		const container = makeContainer();

		const engine = createGlowingEffect({ container }, {});
		engine?.destroy();

		expect(winRemove).toHaveBeenCalledWith("scroll", expect.any(Function));
		expect(bodyRemove).toHaveBeenCalledWith("pointermove", expect.any(Function));

		winRemove.mockRestore();
		bodyRemove.mockRestore();
	});

	it("sets --active to 0 inside the inactive zone (center pointer)", () => {
		const container = makeContainer();
		const engine = createGlowingEffect({ container }, { inactiveZone: 0.7 });

		document.body.dispatchEvent(new PointerEvent("pointermove", { clientX: 50, clientY: 50 }));
		flushOnce();

		expect(container.style.getPropertyValue("--active")).toBe("0");
		engine?.destroy();
	});

	it("sets --active to 1 outside the inactive zone but inside bounds", () => {
		const container = makeContainer();
		const engine = createGlowingEffect({ container }, { inactiveZone: 0.1, proximity: 0 });

		document.body.dispatchEvent(new PointerEvent("pointermove", { clientX: 95, clientY: 95 }));
		flushOnce();

		expect(container.style.getPropertyValue("--active")).toBe("1");
		engine?.destroy();
	});

	it("sets --active to 0 when outside the container plus proximity margin", () => {
		const container = makeContainer();
		const engine = createGlowingEffect({ container }, { inactiveZone: 0.1, proximity: 0 });

		document.body.dispatchEvent(new PointerEvent("pointermove", { clientX: 500, clientY: 500 }));
		flushOnce();

		expect(container.style.getPropertyValue("--active")).toBe("0");
		engine?.destroy();
	});

	it("moves --start toward the target angle on repeated frames (movementDuration invariant)", () => {
		const container = makeContainer();
		const engine = createGlowingEffect(
			{ container },
			{ inactiveZone: 0.1, proximity: 0, movementDuration: 2 }
		);

		// Pointer to the right of center → target angle ~90deg, away from the initial 0.
		document.body.dispatchEvent(new PointerEvent("pointermove", { clientX: 95, clientY: 50 }));
		flushOnce();
		// First angle-tween frame queued by the move handler's own rAF.
		flushOnce();

		const startAfterOneFrame = Number(container.style.getPropertyValue("--start"));
		expect(startAfterOneFrame).not.toBe(0);
		// Lerp speed is 0.08 / max(movementDuration, 0.1) = 0.04 for movementDuration=2,
		// so a single step should move only a fraction of the way to 90deg.
		expect(Math.abs(startAfterOneFrame)).toBeLessThan(90);
		// Exact first two steps from 0 toward 90: 3.6, then 3.6 + (90 - 3.6) * 0.04.
		expect(startAfterOneFrame).toBeCloseTo(3.6 + (90 - 3.6) * 0.04, 10);

		engine?.destroy();
	});
});
