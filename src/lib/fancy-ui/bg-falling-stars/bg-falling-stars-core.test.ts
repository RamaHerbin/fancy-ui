import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createFallingStars } from "./bg-falling-stars-core.js";

function makeCanvas(ctx: CanvasRenderingContext2D | null) {
	const canvas = document.createElement("canvas");
	Object.defineProperty(canvas, "clientWidth", { value: 200, configurable: true });
	Object.defineProperty(canvas, "clientHeight", { value: 100, configurable: true });
	vi.spyOn(canvas, "getContext").mockImplementation((() => ctx) as never);
	return canvas;
}

function makeCtx(): CanvasRenderingContext2D & { strokeStyleHistory: string[] } {
	const strokeStyleHistory: string[] = [];
	const ctx = {
		setTransform: vi.fn(),
		clearRect: vi.fn(),
		beginPath: vi.fn(),
		moveTo: vi.fn(),
		lineTo: vi.fn(),
		stroke: vi.fn(),
		arc: vi.fn(),
		fill: vi.fn(),
		fillStyle: "",
		lineWidth: 0,
		strokeStyleHistory,
	} as unknown as CanvasRenderingContext2D & { strokeStyleHistory: string[] };
	Object.defineProperty(ctx, "strokeStyle", {
		set(v: string) {
			strokeStyleHistory.push(v);
		},
		get() {
			return strokeStyleHistory[strokeStyleHistory.length - 1] ?? "";
		},
	});
	return ctx;
}

describe("createFallingStars", () => {
	let rafSpy: ReturnType<typeof vi.spyOn>;
	let cafSpy: ReturnType<typeof vi.spyOn>;
	let rafCallbacks: FrameRequestCallback[];

	beforeEach(() => {
		rafCallbacks = [];
		let nextId = 1;
		rafSpy = vi
			.spyOn(globalThis, "requestAnimationFrame")
			.mockImplementation((cb: FrameRequestCallback) => {
				rafCallbacks.push(cb);
				return nextId++;
			});
		cafSpy = vi.spyOn(globalThis, "cancelAnimationFrame").mockImplementation(() => {});
	});

	afterEach(() => {
		rafSpy.mockRestore();
		cafSpy.mockRestore();
		vi.restoreAllMocks();
	});

	it("returns null when a 2D context is unavailable", () => {
		const canvas = makeCanvas(null);
		const engine = createFallingStars({ canvas }, {});
		expect(engine).toBeNull();
	});

	it("returns an engine and starts the rAF loop when a context is available", () => {
		const canvas = makeCanvas(makeCtx());
		const engine = createFallingStars({ canvas }, {});
		expect(engine).not.toBeNull();
		expect(rafSpy).toHaveBeenCalledTimes(1);
	});

	it("setOptions applies a new color used by subsequent draws", () => {
		const ctx = makeCtx();
		const canvas = makeCanvas(ctx);
		const engine = createFallingStars({ canvas }, { color: "#FFF", count: 1 }, () => 0.5);
		expect(engine).not.toBeNull();

		engine?.setOptions({ color: "#ff0000" });

		// Advance one frame; drawStar's sharp center-line stroke uses cachedRgb.
		rafCallbacks[0]?.(0);
		expect(ctx.strokeStyleHistory.some((s) => s.includes("255, 0, 0"))).toBe(true);
		expect(ctx.strokeStyleHistory.some((s) => s.includes("255, 255, 255"))).toBe(false);
	});

	it("setOptions ignores keys not present on the partial update", () => {
		const canvas = makeCanvas(makeCtx());
		const engine = createFallingStars({ canvas }, { color: "#123456" });
		expect(() => engine?.setOptions({})).not.toThrow();
	});

	it("destroy cancels the pending rAF and is idempotent", () => {
		const canvas = makeCanvas(makeCtx());
		const engine = createFallingStars({ canvas }, {});
		engine?.destroy();
		expect(cafSpy).toHaveBeenCalledTimes(1);
		expect(() => engine?.destroy()).not.toThrow();
		expect(cafSpy).toHaveBeenCalledTimes(1);
	});

	it("resize is safe to call before and after destroy", () => {
		const canvas = makeCanvas(makeCtx());
		const engine = createFallingStars({ canvas }, {});
		expect(() => engine?.resize()).not.toThrow();
		engine?.destroy();
		expect(() => engine?.resize()).not.toThrow();
	});

	it("initializes exactly `count` stars (loop continues to run one rAF per frame)", () => {
		const canvas = makeCanvas(makeCtx());
		createFallingStars({ canvas }, { count: 5 });
		// One initial rAF request; further frames only scheduled from inside loop.
		expect(rafSpy).toHaveBeenCalledTimes(1);
		rafCallbacks[0]?.(0);
		expect(rafSpy).toHaveBeenCalledTimes(2);
	});

	it("recycles a star past the viewport using the injected random source", () => {
		const canvas = makeCanvas(makeCtx());
		// speed = random()*5+2; with random()=0 => speed=2, z starts at random()*width=0
		// so the star is immediately past the viewport (z<=0) on the first frame.
		const engine = createFallingStars({ canvas }, { count: 1 }, () => 0);
		expect(engine).not.toBeNull();
		expect(() => rafCallbacks[0]?.(0)).not.toThrow();
	});
});
