/**
 * GlowingEffect core under `prefers-reduced-motion`: the angle tween is
 * JS-timed, so it must collapse to a snap (the glow arc lands on the pointer
 * angle in the very frame that samples it) while the state itself, `--active`
 * and `--start`, is still produced.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createGlowingEffect } from "./glowing-effect-core.js";

if (typeof PointerEvent === "undefined") {
	class PointerEventPolyfill extends MouseEvent {
		constructor(type: string, params: PointerEventInit = {}) {
			super(type, params);
		}
	}
	// @ts-expect-error -- polyfilling a missing DOM global for older jsdom versions
	globalThis.PointerEvent = PointerEventPolyfill;
}

function makeContainer() {
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
	} as DOMRect);
	return container;
}

function mockMatchMedia(reduce: boolean) {
	window.matchMedia = ((query: string) => ({
		matches: reduce && query.includes("reduce") && !query.includes("no-preference"),
		media: query,
		onchange: null,
		addEventListener: () => {},
		removeEventListener: () => {},
		addListener: () => {},
		removeListener: () => {},
		dispatchEvent: () => false,
	})) as unknown as typeof window.matchMedia;
}

describe("createGlowingEffect and prefers-reduced-motion", () => {
	const originalMatchMedia = window.matchMedia;
	let callbacks: FrameRequestCallback[];

	beforeEach(() => {
		callbacks = [];
		vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
			callbacks.push(cb);
			return callbacks.length;
		});
		vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});
	});

	afterEach(() => {
		document.body.innerHTML = "";
		window.matchMedia = originalMatchMedia;
		vi.restoreAllMocks();
	});

	function flush() {
		const pending = callbacks.splice(0, callbacks.length);
		for (const cb of pending) cb(0);
	}

	it("snaps the arc to the pointer angle in the sampling frame under reduce", () => {
		mockMatchMedia(true);
		const container = makeContainer();
		const engine = createGlowingEffect({ container }, { inactiveZone: 0.1, movementDuration: 2 });

		// Pointer due right of center: rawTarget = 90deg.
		document.body.dispatchEvent(new PointerEvent("pointermove", { clientX: 95, clientY: 50 }));
		flush();

		expect(Number(container.style.getPropertyValue("--start"))).toBe(90);
		expect(container.style.getPropertyValue("--active")).toBe("1");
		// No follow-up tween frame is queued: the motion is over.
		expect(callbacks).toHaveLength(0);

		engine?.destroy();
	});

	it("still tweens the arc without the reduce preference", () => {
		mockMatchMedia(false);
		const container = makeContainer();
		const engine = createGlowingEffect({ container }, { inactiveZone: 0.1, movementDuration: 2 });

		document.body.dispatchEvent(new PointerEvent("pointermove", { clientX: 95, clientY: 50 }));
		flush();

		const start = Number(container.style.getPropertyValue("--start"));
		expect(start).toBeGreaterThan(0);
		expect(start).toBeLessThan(90);
		expect(callbacks.length).toBeGreaterThan(0);

		engine?.destroy();
	});

	it("keeps working when matchMedia is unavailable", () => {
		// @ts-expect-error -- simulating an environment without matchMedia
		window.matchMedia = undefined;
		const container = makeContainer();
		const engine = createGlowingEffect({ container }, { inactiveZone: 0.1 });

		document.body.dispatchEvent(new PointerEvent("pointermove", { clientX: 95, clientY: 50 }));
		expect(() => flush()).not.toThrow();
		expect(Number(container.style.getPropertyValue("--start"))).toBeGreaterThan(0);

		engine?.destroy();
	});
});
