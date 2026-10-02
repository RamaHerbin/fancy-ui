import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createFlickeringGrid } from "./flickering-grid-core.js";

// jsdom has no real canvas backend; the repo-wide test setup stubs
// HTMLCanvasElement.getContext to return null, which is exactly the
// "unsupported" branch the fail-quiet law exercises. To test the
// happy path, stand in a minimal fake 2D context per-test that counts
// the draw calls so frames can be observed.
interface FakeContext {
	fillRectCalls: number;
	clearRectCalls: number;
	lastRect: [number, number, number, number] | null;
	fillStyles: string[];
}

function fakeContext(): { ctx: CanvasRenderingContext2D; spy: FakeContext } {
	const spy: FakeContext = {
		fillRectCalls: 0,
		clearRectCalls: 0,
		lastRect: null,
		fillStyles: [],
	};
	const ctx = {
		clearRect: () => {
			spy.clearRectCalls++;
		},
		fillRect: (x: number, y: number, w: number, h: number) => {
			spy.fillRectCalls++;
			spy.lastRect = [x, y, w, h];
		},
		set fillStyle(value: string) {
			spy.fillStyles.push(value);
		},
		get fillStyle() {
			return spy.fillStyles[spy.fillStyles.length - 1] ?? "";
		},
	} as unknown as CanvasRenderingContext2D;
	return { ctx, spy };
}

function makeElements(options: { withContext?: boolean } = { withContext: true }) {
	const container = document.createElement("div");
	Object.defineProperty(container, "clientWidth", { value: 100, configurable: true });
	Object.defineProperty(container, "clientHeight", { value: 80, configurable: true });
	const canvas = document.createElement("canvas");
	const { ctx, spy } = fakeContext();
	if (options.withContext !== false) {
		vi.spyOn(canvas, "getContext").mockReturnValue(ctx as never);
	}
	return { container, canvas, draws: spy };
}

describe("createFlickeringGrid", () => {
	let rafSpy: ReturnType<typeof vi.spyOn>;
	let cafSpy: ReturnType<typeof vi.spyOn>;
	// Deterministic rAF driver: frames only run when `tick()` says so.
	let pending: Map<number, FrameRequestCallback>;

	function tick(time: number) {
		const queued = [...pending.entries()];
		pending.clear();
		for (const [, cb] of queued) cb(time);
	}

	beforeEach(() => {
		pending = new Map();
		let id = 0;
		rafSpy = vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
			const next = ++id;
			pending.set(next, cb);
			return next;
		});
		cafSpy = vi.spyOn(window, "cancelAnimationFrame").mockImplementation((frame: number) => {
			pending.delete(frame);
		});
	});

	afterEach(() => {
		rafSpy.mockRestore();
		cafSpy.mockRestore();
		vi.restoreAllMocks();
	});

	it("returns null when a 2d context is unavailable", () => {
		const { container, canvas } = makeElements({ withContext: false });
		const engine = createFlickeringGrid({ container, canvas }, {});
		expect(engine).toBeNull();
	});

	it("sizes the canvas from the container when width/height are unset", () => {
		const { container, canvas } = makeElements();
		const engine = createFlickeringGrid({ container, canvas }, {});
		expect(engine).not.toBeNull();
		expect(canvas.style.width).toBe("100px");
		expect(canvas.style.height).toBe("80px");
	});

	it("sizes the canvas from explicit width/height options", () => {
		const { container, canvas } = makeElements();
		const engine = createFlickeringGrid({ container, canvas }, { width: 40, height: 20 });
		expect(engine).not.toBeNull();
		expect(canvas.style.width).toBe("40px");
		expect(canvas.style.height).toBe("20px");
	});

	it("starts the rAF loop only once setInView(true) is called", () => {
		const { container, canvas } = makeElements();
		const engine = createFlickeringGrid({ container, canvas }, {});
		expect(engine).not.toBeNull();
		expect(rafSpy).not.toHaveBeenCalled();
		engine!.setInView(true);
		expect(rafSpy).toHaveBeenCalledTimes(1);
	});

	it("keeps the loop running frame after frame while in view", () => {
		const { container, canvas, draws } = makeElements();
		const engine = createFlickeringGrid({ container, canvas }, {});
		engine!.setInView(true);
		tick(16);
		// container 100x80, squareSize 4 + gridGap 6 -> 10 cols x 8 rows = 80 squares
		expect(draws.fillRectCalls).toBe(80);
		expect(pending.size).toBe(1);
		tick(32);
		expect(draws.fillRectCalls).toBe(160);
		expect(pending.size).toBe(1);
	});

	it("stops drawing once setInView(false) and drains the queued frame", () => {
		const { container, canvas, draws } = makeElements();
		const engine = createFlickeringGrid({ container, canvas }, {});
		engine!.setInView(true);
		tick(16);
		expect(draws.fillRectCalls).toBe(80);
		engine!.setInView(false);
		tick(32); // the already-queued frame fires and bails out
		expect(draws.fillRectCalls).toBe(80);
		expect(pending.size).toBe(0);
	});

	it("resumes after scrolling out of view and back in (regression: frozen grid)", () => {
		const { container, canvas, draws } = makeElements();
		const engine = createFlickeringGrid({ container, canvas }, {});
		engine!.setInView(true);
		tick(16);
		expect(draws.fillRectCalls).toBe(80);

		engine!.setInView(false);
		tick(32); // stale frame fires off-screen and schedules nothing
		expect(pending.size).toBe(0);

		engine!.setInView(true); // scrolled back into view
		expect(pending.size).toBe(1);
		tick(48);
		expect(draws.fillRectCalls).toBe(160);
		expect(pending.size).toBe(1);
	});

	it("schedules unconditionally on repeated setInView(true), as the original observer did", () => {
		const { container, canvas } = makeElements();
		const engine = createFlickeringGrid({ container, canvas }, {});
		engine!.setInView(true);
		engine!.setInView(true);
		// The original callback was `if (isInView) requestAnimationFrame(animate)`
		// with no de-duplication, so two consecutive intersecting callbacks
		// stacked two loops. Fidelity law: preserve that, do not "fix" it.
		expect(rafSpy).toHaveBeenCalledTimes(2);
		expect(pending.size).toBe(2);
	});

	it("setOptions merges live options without resizing the grid", () => {
		const { container, canvas, draws } = makeElements();
		const engine = createFlickeringGrid({ container, canvas }, {});
		engine!.setOptions({ color: "#ff0000", flickerChance: 0.9, maxOpacity: 0.5, squareSize: 40 });
		engine!.setInView(true);
		tick(16);
		// cols/rows and the squares buffer are only recomputed by resize(), exactly
		// as the original never re-ran setupCanvas on a bare prop change...
		expect(draws.fillRectCalls).toBe(80);
		// ...while the new squareSize and color take effect immediately in the pixel math.
		expect(draws.lastRect?.[2]).toBe(40 * (window.devicePixelRatio || 1));
		expect(draws.fillStyles[0]).toMatch(/^rgba\(255, 0, 0,/);
	});

	it("resize recomputes the grid from the current options", () => {
		const { container, canvas, draws } = makeElements();
		const engine = createFlickeringGrid({ container, canvas }, {});
		engine!.setOptions({ squareSize: 14, gridGap: 6 }); // step 20 -> 5 cols x 4 rows
		engine!.resize();
		engine!.setInView(true);
		tick(16);
		expect(draws.fillRectCalls).toBe(20);
	});

	it("resize is safe to call before and after destroy", () => {
		const { container, canvas } = makeElements();
		const engine = createFlickeringGrid({ container, canvas }, {});
		expect(() => engine!.resize()).not.toThrow();
		engine!.destroy();
		expect(() => engine!.resize()).not.toThrow();
	});

	it("destroy cancels the running rAF loop", () => {
		const { container, canvas } = makeElements();
		const engine = createFlickeringGrid({ container, canvas }, {});
		engine!.setInView(true);
		expect(pending.size).toBe(1);
		engine!.destroy();
		expect(cafSpy).toHaveBeenCalledTimes(1);
		expect(pending.size).toBe(0);
	});

	it("destroy is idempotent", () => {
		const { container, canvas } = makeElements();
		const engine = createFlickeringGrid({ container, canvas }, {});
		engine!.setInView(true);
		engine!.destroy();
		expect(() => engine!.destroy()).not.toThrow();
		expect(cafSpy).toHaveBeenCalledTimes(1);
	});

	it("setInView after destroy schedules nothing", () => {
		const { container, canvas, draws } = makeElements();
		const engine = createFlickeringGrid({ container, canvas }, {});
		engine!.destroy();
		engine!.setInView(true);
		expect(rafSpy).not.toHaveBeenCalled();
		expect(pending.size).toBe(0);
		expect(() => engine!.setInView(false)).not.toThrow();
		expect(draws.fillRectCalls).toBe(0);
	});

	it("a frame already queued when destroy() lands draws nothing", () => {
		const { container, canvas, draws } = makeElements();
		const engine = createFlickeringGrid({ container, canvas }, {});
		engine!.setInView(true);
		const queued = [...pending.values()];
		engine!.destroy();
		for (const cb of queued) cb(16); // simulate a frame the host already dispatched
		expect(draws.fillRectCalls).toBe(0);
	});

	it("uses the injected random function for initial square opacities and flicker", () => {
		const { container, canvas } = makeElements();
		const random = vi.fn(() => 0.5);
		const engine = createFlickeringGrid({ container, canvas }, { maxOpacity: 0.8 }, random);
		expect(engine).not.toBeNull();
		expect(random).toHaveBeenCalledTimes(80);
		random.mockClear();
		engine!.setInView(true);
		tick(16);
		// one roll per square per frame, plus one extra roll per square that flickers
		expect(random.mock.calls.length).toBeGreaterThanOrEqual(80);
	});

	it("defaults squareSize, gridGap, flickerChance, color and maxOpacity to match the original component", () => {
		const { container, canvas, draws } = makeElements();
		const random = vi.fn(() => 1);
		const engine = createFlickeringGrid({ container, canvas }, {}, random);
		expect(engine).not.toBeNull();
		// container is 100x80; default squareSize=4, gridGap=6 -> step 10 -> 10 cols x 8 rows
		expect(random).toHaveBeenCalledTimes(80);
		engine!.setInView(true);
		tick(16);
		const dpr = window.devicePixelRatio || 1;
		expect(draws.lastRect).toEqual([9 * 10 * dpr, 7 * 10 * dpr, 4 * dpr, 4 * dpr]);
		// default color #000000, maxOpacity 0.3 with random() === 1 -> opacity 0.3
		expect(draws.fillStyles[0]).toBe("rgba(0, 0, 0,0.30000001192092896)");
	});
});
