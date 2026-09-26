import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { createSparkles } from "./sparkles-core.js";

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
		vi.restoreAllMocks();
		vi.unstubAllGlobals();
		document.body.innerHTML = "";
	});

	it("returns null when the 2d context is unavailable", () => {
		const { canvas, container } = makeElements(null);
		stubRect(container, 200, 100);
		const engine = createSparkles({ canvas, container }, {});
		expect(engine).toBeNull();
	});

	it("starts the rAF loop on creation", () => {
		const { canvas, container } = makeElements(makeFakeCtx());
		stubRect(container, 200, 100);
		const engine = createSparkles({ canvas, container }, {});
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
			{ canvas, container },
			{ particleColor: "#abcdef", particleDensity: 3 },
			() => 0.5
		);
		expect(engine).not.toBeNull();
		frames[0]?.(0);
		expect(fillStyles.length).toBeGreaterThan(0);
		expect(fillStyles.every((s) => s.startsWith("#abcdef"))).toBe(true);
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
			{ canvas, container },
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

		const engine = createSparkles({ canvas, container }, { particleDensity: 3 }, () => 0.5)!;
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
		const engine = createSparkles({ canvas, container }, {})!;
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
		const engine = createSparkles({ canvas, container }, {})!;
		expect(() => engine.resize()).not.toThrow();

		engine.destroy();
		expect(() => engine.resize()).not.toThrow();
	});

	it("scales canvas backing store by devicePixelRatio", () => {
		vi.stubGlobal("devicePixelRatio", 2);
		const { canvas, container } = makeElements(makeFakeCtx());
		stubRect(container, 200, 100);
		const engine = createSparkles({ canvas, container }, {});
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
		const engine = createSparkles({ canvas, container }, { speed: 100, particleDensity: 1 }, () => 1);
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
});
