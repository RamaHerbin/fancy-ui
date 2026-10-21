/**
 * GlowingEffect under `prefers-reduced-motion`: the angle tween is JS-timed,
 * so it must collapse to a snap while `--active` and `--start` are still set.
 */
import { render, cleanup } from "@testing-library/react";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { GlowingEffect } from "./GlowingEffect.js";

if (typeof PointerEvent === "undefined") {
	class PointerEventPolyfill extends MouseEvent {
		constructor(type: string, params: PointerEventInit = {}) {
			super(type, params);
		}
	}
	// @ts-expect-error -- polyfilling a missing DOM global for older jsdom versions
	globalThis.PointerEvent = PointerEventPolyfill;
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

describe("GlowingEffect and prefers-reduced-motion", () => {
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
		cleanup();
		window.matchMedia = originalMatchMedia;
		vi.restoreAllMocks();
	});

	function flush() {
		const pending = callbacks.splice(0, callbacks.length);
		for (const cb of pending) cb(0);
	}

	function mount() {
		const { container } = render(<GlowingEffect disabled={false} inactiveZone={0.1} />);
		const glow = container.querySelector("[style]") as HTMLElement;
		vi.spyOn(glow, "getBoundingClientRect").mockReturnValue({
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
		return glow;
	}

	it("snaps the arc to the pointer angle in the sampling frame under reduce", () => {
		mockMatchMedia(true);
		const glow = mount();
		document.body.dispatchEvent(new PointerEvent("pointermove", { clientX: 95, clientY: 50 }));
		flush();
		expect(Number(glow.style.getPropertyValue("--start"))).toBe(90);
		expect(glow.style.getPropertyValue("--active")).toBe("1");
		expect(callbacks).toHaveLength(0);
	});

	it("still tweens the arc without the reduce preference", () => {
		mockMatchMedia(false);
		const glow = mount();
		document.body.dispatchEvent(new PointerEvent("pointermove", { clientX: 95, clientY: 50 }));
		flush();
		const start = Number(glow.style.getPropertyValue("--start"));
		expect(start).toBeGreaterThan(0);
		expect(start).toBeLessThan(90);
		expect(callbacks.length).toBeGreaterThan(0);
	});
});
