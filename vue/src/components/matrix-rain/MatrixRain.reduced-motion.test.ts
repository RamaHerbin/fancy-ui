/**
 * Under `prefers-reduced-motion: reduce` the rain paints one still frame and no
 * animation frame is ever scheduled; the no-preference control proves the loop
 * really runs otherwise.
 */
import { cleanup, render } from "@testing-library/vue";
import { nextTick } from "vue";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import MatrixRain from "./MatrixRain.vue";

function stubMotion(reduce: boolean) {
	vi.stubGlobal("matchMedia", (query: string) => ({
		matches: reduce && query.includes("reduce") && !query.includes("no-preference"),
		media: query,
		onchange: null,
		addEventListener: () => {},
		removeEventListener: () => {},
		addListener: () => {},
		removeListener: () => {},
		dispatchEvent: () => false,
	}));
}

function stubCanvas() {
	const ctx = {
		fillStyle: "",
		font: "",
		shadowBlur: 0,
		shadowColor: "",
		setTransform: () => {},
		fillRect: () => {},
		fillText: () => {},
	};
	vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(ctx as never);
	vi.spyOn(HTMLCanvasElement.prototype, "clientWidth", "get").mockReturnValue(300);
	vi.spyOn(HTMLCanvasElement.prototype, "clientHeight", "get").mockReturnValue(150);
}

describe("MatrixRain reduced motion", () => {
	beforeEach(() => {
		global.ResizeObserver = class {
			observe = vi.fn();
			unobserve = vi.fn();
			disconnect = vi.fn();
		} as unknown as typeof ResizeObserver;
	});

	afterEach(() => {
		cleanup();
		vi.restoreAllMocks();
		vi.unstubAllGlobals();
	});

	it("schedules no animation frame under reduce", async () => {
		stubMotion(true);
		stubCanvas();
		const raf = vi.spyOn(window, "requestAnimationFrame").mockReturnValue(1);
		render(MatrixRain);
		await nextTick();
		expect(raf).not.toHaveBeenCalled();
	});

	it("runs the loop with no preference (control)", async () => {
		stubMotion(false);
		stubCanvas();
		const raf = vi.spyOn(window, "requestAnimationFrame").mockReturnValue(1);
		render(MatrixRain);
		await nextTick();
		expect(raf).toHaveBeenCalled();
	});
});
