import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { createSparkles } from "./sparkles-core.js";
import { resetTickerForTests, subscribe } from "../_internals/motion/ticker.js";

interface FakeCtx {
	setTransform: ReturnType<typeof vi.fn>;
	clearRect: ReturnType<typeof vi.fn>;
	beginPath: ReturnType<typeof vi.fn>;
	arc: ReturnType<typeof vi.fn>;
	fill: ReturnType<typeof vi.fn>;
	fillStyle: string;
}

function makeFakeCtx(): FakeCtx {
	return {
		setTransform: vi.fn(),
		clearRect: vi.fn(),
		beginPath: vi.fn(),
		arc: vi.fn(),
		fill: vi.fn(),
		fillStyle: "",
	};
}

function makeElements(ctx: FakeCtx | null) {
	const canvas = document.createElement("canvas");
	const container = document.createElement("div");
	container.appendChild(canvas);
	document.body.appendChild(container);
	vi.spyOn(canvas, "getContext").mockReturnValue(ctx as never);
	return { canvas, container };
}

function stubRect(container: HTMLElement, width: number, height: number) {
	vi.spyOn(container, "getBoundingClientRect").mockReturnValue({
		width,
		height,
		top: 0,
		left: 0,
		right: width,
		bottom: height,
		x: 0,
		y: 0,
		toJSON: () => ({}),
	} as DOMRect);
}

describe("createSparkles", () => {
	let frames: FrameRequestCallback[];
	let cancelled: number[];

	beforeEach(() => {
		frames = [];
		cancelled = [];
		vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
			frames.push(cb);
			return frames.length;
		});
		vi.stubGlobal("cancelAnimationFrame", (id: number) => {
			cancelled.push(id);
		});
	});

	afterEach(() => {
		resetTickerForTests();
		vi.restoreAllMocks();
		vi.unstubAllGlobals();
		document.body.innerHTML = "";
	});

	it("returns null when the 2d context is unavailable", () => {
		const { canvas, container } = makeElements(null);
		stubRect(container, 200, 100);
		const engine = createSparkles({ canvas, container, subscribe }, {});
		expect(engine).toBeNull();
	});

	it("starts the rAF loop on creation", () => {
		const { canvas, container } = makeElements(makeFakeCtx());
		stubRect(container, 200, 100);
		const engine = createSparkles({ canvas, container, subscribe }, {});
		expect(engine).not.toBeNull();
		expect(frames.length).toBe(1);
	});

	it("draws particles filled with the configured particleColor", () => {
		const fakeCtx = makeFakeCtx();
		const { canvas, container } = makeElements(fakeCtx);
		stubRect(container, 200, 100);
		const fillStyles: string[] = [];
		Object.defineProperty(fakeCtx, "fillStyle", {
			set(v: string) {
				fillStyles.push(v);
			},
			get() {
				return fillStyles[fillStyles.length - 1] ?? "";
			},
		});

		const engine = createSparkles(
			{ canvas, container, subscribe },
			{ particleColor: "#abcdef", particleDensity: 3 },
			() => 0.5
		);
		expect(engine).not.toBeNull();
		frames[0]?.(0);
		expect(fillStyles.length).toBeGreaterThan(0);
		expect(fillStyles.every((s) => s.startsWith("#abcdef"))).toBe(true);
	});

	it("resolves a currentColor particleColor from the canvas's computed text colour, once, and again after a theme flip", async () => {
		const fakeCtx = makeFakeCtx();
		const { canvas, container } = makeElements(fakeCtx);
		stubRect(container, 200, 100);
		canvas.style.color = "rgb(18, 52, 86)";
		const fillStyles: string[] = [];
		Object.defineProperty(fakeCtx, "fillStyle", {
			set(v: string) {
				fillStyles.push(v);
			},
			get() {
				return fillStyles[fillStyles.length - 1] ?? "";
			},
		});

		const engine = createSparkles(
			{ canvas, container, subscribe },
			{ particleColor: "currentColor", particleDensity: 2 },
			() => 0.5
		);
		expect(engine).not.toBeNull();
		frames[0]?.(0);
		expect(fillStyles.length).toBeGreaterThan(0);
		expect(fillStyles.every((s) => /^#123456[0-9a-f]{2}$/.test(s))).toBe(true);

		// The colour is resolved lazily and cached: it stays out of the frame path.
		canvas.style.color = "rgb(250, 250, 250)";
		fillStyles.length = 0;
		frames[1]?.(16);
		expect(fillStyles.every((s) => /^#123456[0-9a-f]{2}$/.test(s))).toBe(true);

		// A theme switch (a class flip on <html>) drops the cache; the next frame follows.
		try {
			document.documentElement.classList.add("dark");
			await new Promise<void>((r) => setTimeout(r, 0));
			fillStyles.length = 0;
			frames[2]?.(32);
			expect(fillStyles.every((s) => /^#fafafa[0-9a-f]{2}$/.test(s))).toBe(true);
		} finally {
			document.documentElement.classList.remove("dark");
		}
	});

	it("re-resolves the colour on a resume (a frame with dt 0)", () => {
		const fakeCtx = makeFakeCtx();
		const { canvas, container } = makeElements(fakeCtx);
		stubRect(container, 200, 100);
		canvas.style.color = "rgb(18, 52, 86)";
		const fillStyles: string[] = [];
		Object.defineProperty(fakeCtx, "fillStyle", {
			set(v: string) {
				fillStyles.push(v);
			},
			get() {
				return fillStyles[fillStyles.length - 1] ?? "";
			},
		});
		createSparkles(
			{ canvas, container, subscribe },
			{ particleColor: "currentColor", particleDensity: 1 },
			() => 0.5
		);
		frames[0]?.(0);
		canvas.style.color = "rgb(250, 250, 250)";
		fillStyles.length = 0;
		// First frame after a park: the ticker reports dt 0 again.
		document.dispatchEvent(new Event("visibilitychange"));
		frames[frames.length - 1]?.(5000);
		expect(fillStyles.length).toBeGreaterThan(0);
		expect(fillStyles[0]).toMatch(/^#fafafa/);
	});

	it("re-resolves an inherited colour that changes while the loop runs, within half a second", () => {
		const fakeCtx = makeFakeCtx();
		const { canvas, container } = makeElements(fakeCtx);
		stubRect(container, 200, 100);
		canvas.style.color = "rgb(18, 52, 86)";
		const fillStyles: string[] = [];
		Object.defineProperty(fakeCtx, "fillStyle", {
			set(v: string) {
				fillStyles.push(v);
			},
			get() {
				return fillStyles[fillStyles.length - 1] ?? "";
			},
		});
		createSparkles(
			{ canvas, container, subscribe },
			{ particleColor: "currentColor", particleDensity: 1 },
			() => 0.5
		);
		frames[0]?.(0);
		frames[frames.length - 1]?.(16);
		// An ancestor's colour changes with no theme flip and no park.
		canvas.style.color = "rgb(250, 250, 250)";
		fillStyles.length = 0;
		frames[frames.length - 1]?.(32);
		expect(fillStyles[0]).toMatch(/^#123456/);
		// Half a second of 16 ms frames later (dt is clamped per frame, so one
		// long gap does not count) the cache has been dropped and the new colour shows.
		for (let t = 48; t <= 600; t += 16) {
			fillStyles.length = 0;
			frames[frames.length - 1]?.(t);
		}
		expect(fillStyles[0]).toMatch(/^#fafafa/);
	});

	it("moves by velocity * dt * 60 per frame: twice the step for twice the dt", () => {
		const step = (dtMs: number) => {
			frames.length = 0;
			const fakeCtx = makeFakeCtx();
			const xs: number[] = [];
			fakeCtx.arc.mockImplementation((x: number) => {
				xs.push(x);
			});
			const { canvas, container } = makeElements(fakeCtx);
			stubRect(container, 200, 100);
			const engine = createSparkles(
				{ canvas, container, subscribe },
				{ particleDensity: 1 },
				() => 0.9
			)!;
			frames[0]?.(1000);
			frames[frames.length - 1]?.(1000 + dtMs);
			engine.destroy();
			resetTickerForTests();
			return xs[1]! - xs[0]!;
		};
		const one = step(1000 / 60);
		const two = step(2000 / 60);
		expect(one).toBeGreaterThan(0);
		expect(two / one).toBeCloseTo(2, 3);
	});

	it("setOptions updates particleColor used on the next frame", () => {
		const fakeCtx = makeFakeCtx();
		const { canvas, container } = makeElements(fakeCtx);
		stubRect(container, 200, 100);
		const fillStyles: string[] = [];
		Object.defineProperty(fakeCtx, "fillStyle", {
			set(v: string) {
				fillStyles.push(v);
			},
			get() {
				return fillStyles[fillStyles.length - 1] ?? "";
			},
		});

		const engine = createSparkles(
			{ canvas, container, subscribe },
			{ particleColor: "#111111", particleDensity: 2 },
			() => 0.5
		)!;
		frames[0]?.(0);
		fillStyles.length = 0;

		engine.setOptions({ particleColor: "#222222" });
		// Invoke the loop's own newly scheduled frame.
		frames[frames.length - 1]?.(16);
		expect(fillStyles.every((s) => s.startsWith("#222222"))).toBe(true);
	});

	it("does not regenerate particles when setOptions is called (no live density prop today)", () => {
		const fakeCtx = makeFakeCtx();
		const { canvas, container } = makeElements(fakeCtx);
		stubRect(container, 200, 100);

		const engine = createSparkles(
			{ canvas, container, subscribe },
			{ particleDensity: 3 },
			() => 0.5
		)!;
		frames[0]?.(0);
		const firstCount = fakeCtx.arc.mock.calls.length;
		fakeCtx.arc.mockClear();

		// LiveOptions carries no particleDensity field — nothing to feed a
		// regeneration even if it were called, matching the original wrapper's
		// behaviour of never re-running generateParticles after mount.
		engine.setOptions({});
		frames[frames.length - 1]?.(16);
		expect(fakeCtx.arc.mock.calls.length).toBe(firstCount);
		expect(firstCount).toBe(3);
	});

	it("destroy is idempotent and cancels the rAF loop", () => {
		const { canvas, container } = makeElements(makeFakeCtx());
		stubRect(container, 200, 100);
		const engine = createSparkles({ canvas, container, subscribe }, {})!;
		const scheduledId = frames.length;

		engine.destroy();
		expect(cancelled).toContain(scheduledId);
		const cancelCountAfterFirst = cancelled.length;

		engine.destroy();
		expect(cancelled.length).toBe(cancelCountAfterFirst);
	});

	it("resize is safe before and after destroy", () => {
		const { canvas, container } = makeElements(makeFakeCtx());
		stubRect(container, 200, 100);
		const engine = createSparkles({ canvas, container, subscribe }, {})!;
		expect(() => engine.resize()).not.toThrow();

		engine.destroy();
		expect(() => engine.resize()).not.toThrow();
	});

	it("caps the backing-store scale at 2", () => {
		vi.stubGlobal("devicePixelRatio", 3);
		const { canvas, container } = makeElements(makeFakeCtx());
		stubRect(container, 200, 100);
		createSparkles({ canvas, container, subscribe }, {});
		expect(canvas.width).toBe(400);
		expect(canvas.height).toBe(200);
	});

	it("scales canvas backing store by devicePixelRatio", () => {
		vi.stubGlobal("devicePixelRatio", 2);
		const { canvas, container } = makeElements(makeFakeCtx());
		stubRect(container, 200, 100);
		const engine = createSparkles({ canvas, container, subscribe }, {});
		expect(engine).not.toBeNull();
		expect(canvas.width).toBe(400);
		expect(canvas.height).toBe(200);
	});

	it("keeps drawn coordinates within the CSS-pixel wrap band across many frames", () => {
		const fakeCtx = makeFakeCtx();
		const { canvas, container } = makeElements(fakeCtx);
		stubRect(container, 200, 100);

		const arcArgs: Array<{ x: number; y: number }> = [];
		fakeCtx.arc.mockImplementation((x: number, y: number) => {
			arcArgs.push({ x, y });
		});

		// random() = 1 pushes the initial x/y to 100 and velocities to their
		// extreme (still finite) values; running many frames must never send
		// a coordinate outside the wrap band once divided back to CSS pixels.
		const engine = createSparkles(
			{ canvas, container, subscribe },
			{ speed: 100, particleDensity: 1 },
			() => 1
		);
		expect(engine).not.toBeNull();
		for (let i = 0; i < 50 && frames[i]; i++) {
			frames[i]?.(i * 16);
		}
		// Drawn coordinates are CSS pixels: the -2..102 percentage wrap band
		// scaled by the 200x100 CSS-pixel surface.
		for (const { x, y } of arcArgs) {
			expect(x).toBeGreaterThanOrEqual(-4.2);
			expect(x).toBeLessThanOrEqual(204.2);
			expect(y).toBeGreaterThanOrEqual(-2.1);
			expect(y).toBeLessThanOrEqual(102.1);
		}
	});
	it("reducedMotion paints one still frame without scheduling, and resumes when cleared", () => {
		const fakeCtx = makeFakeCtx();
		const { canvas, container } = makeElements(fakeCtx);
		stubRect(container, 200, 100);
		const engine = createSparkles(
			{ canvas, container, subscribe },
			{ particleDensity: 4, reducedMotion: true },
			() => 0.5
		)!;

		expect(frames.length).toBe(0);
		expect(fakeCtx.fill).toHaveBeenCalledTimes(4);

		// Resize repaints the idle frame.
		engine.resize();
		expect(fakeCtx.fill).toHaveBeenCalledTimes(8);
		expect(frames.length).toBe(0);

		engine.setOptions({ reducedMotion: false });
		expect(frames.length).toBe(1);

		// Flipping back to reduced lets the pending frame paint and parks the
		// subscription; the ticker's residual request finds nobody live.
		engine.setOptions({ reducedMotion: true });
		frames[0]?.(0);
		const queued = frames.length;
		frames[queued - 1]?.(16);
		expect(frames.length).toBe(queued);
	});

	it("repaints the idle still frame when the document theme class flips (currentColor)", async () => {
		const flushObservers = () => new Promise<void>((r) => setTimeout(r, 0));
		const fakeCtx = makeFakeCtx();
		const { canvas, container } = makeElements(fakeCtx);
		stubRect(container, 200, 100);
		const engine = createSparkles(
			{ canvas, container, subscribe },
			{ particleDensity: 4, particleColor: "currentColor", reducedMotion: true },
			() => 0.5
		)!;
		expect(fakeCtx.fill).toHaveBeenCalledTimes(4);

		try {
			document.documentElement.classList.add("dark");
			await flushObservers();
			expect(fakeCtx.fill).toHaveBeenCalledTimes(8);
			expect(frames.length).toBe(0);

			// A hex colour has nothing to re-read: the flip is ignored.
			engine.setOptions({ particleColor: "#ff0000" });
			expect(fakeCtx.fill).toHaveBeenCalledTimes(12);
			document.documentElement.classList.remove("dark");
			await flushObservers();
			expect(fakeCtx.fill).toHaveBeenCalledTimes(12);

			// Nothing after destroy.
			engine.setOptions({ particleColor: "currentColor" });
			expect(fakeCtx.fill).toHaveBeenCalledTimes(16);
			engine.destroy();
			document.documentElement.classList.add("dark");
			await flushObservers();
			expect(fakeCtx.fill).toHaveBeenCalledTimes(16);
		} finally {
			document.documentElement.classList.remove("dark");
		}
	});
});
