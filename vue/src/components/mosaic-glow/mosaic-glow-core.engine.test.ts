import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	AMBIENT_FRAME_MS,
	FLICKER_CHANCE,
	IDLE_DELAY_MS,
	LUT_SIZE,
	createMosaicGlow,
	normalizeGap,
	normalizeRadius,
	normalizeTileSize,
	type MosaicGlowEngine,
	type MosaicGlowLiveOptions,
} from "./mosaic-glow-core";

// --- harness ------------------------------------------------------------------

let rafCallbacks: FrameRequestCallback[] = [];
let rafCounter = 0;
const raf = vi.fn((cb: FrameRequestCallback) => {
	rafCallbacks.push(cb);
	return ++rafCounter;
});
const caf = vi.fn();

/** Run every pending rAF callback with the given timestamp (ms). */
function frame(t: number) {
	const cbs = rafCallbacks.splice(0);
	for (const cb of cbs) cb(t);
}

type FakeCtx = {
	fillRect: ReturnType<typeof vi.fn>;
	drawImage: ReturnType<typeof vi.fn>;
	createRadialGradient: ReturnType<typeof vi.fn>;
	fillStyle: unknown;
	globalCompositeOperation: string;
	styles: unknown[];
};

function fakeCtx(): FakeCtx {
	const ctx: FakeCtx = {
		fillRect: vi.fn(),
		drawImage: vi.fn(),
		createRadialGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
		fillStyle: "",
		globalCompositeOperation: "source-over",
		styles: [],
	};
	let style: unknown = "";
	Object.defineProperty(ctx, "fillStyle", {
		get: () => style,
		set: (v) => {
			style = v;
			ctx.styles.push(v);
		},
	});
	return ctx;
}

const originalGetContext = HTMLCanvasElement.prototype.getContext;

let host: HTMLDivElement;
let canvas: HTMLCanvasElement;
let ctx: FakeCtx;
let engine: MosaicGlowEngine | null = null;

function elements() {
	host = document.createElement("div");
	canvas = document.createElement("canvas");
	host.appendChild(canvas);
	document.body.appendChild(host);
	return { host, canvas };
}

/** Install a fake 2D context and build the engine on a 200×120 host. */
function mount(options: MosaicGlowLiveOptions = {}, random?: () => number) {
	ctx = fakeCtx();
	HTMLCanvasElement.prototype.getContext = vi.fn(() => ctx) as never;
	engine = createMosaicGlow(elements(), options, random);
	if (!engine) throw new Error("engine was not created");
	return engine;
}

function pointerMove(x: number, y: number) {
	host.dispatchEvent(new MouseEvent("pointermove", { clientX: x, clientY: y, bubbles: true }));
}

function pointerLeave() {
	host.dispatchEvent(new MouseEvent("pointerleave"));
}

function strings(values: unknown[]) {
	return values.filter((s): s is string => typeof s === "string");
}

beforeEach(() => {
	rafCallbacks = [];
	raf.mockClear();
	caf.mockClear();
	vi.stubGlobal("requestAnimationFrame", raf);
	vi.stubGlobal("cancelAnimationFrame", caf);
	Object.defineProperty(HTMLElement.prototype, "clientWidth", {
		configurable: true,
		get: () => 200,
	});
	Object.defineProperty(HTMLElement.prototype, "clientHeight", {
		configurable: true,
		get: () => 120,
	});
});

afterEach(() => {
	engine?.destroy();
	engine = null;
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
	HTMLCanvasElement.prototype.getContext = originalGetContext;
	// jsdom defines clientWidth/clientHeight on Element.prototype; drop our overrides
	delete (HTMLElement.prototype as unknown as Record<string, unknown>).clientWidth;
	delete (HTMLElement.prototype as unknown as Record<string, unknown>).clientHeight;
	document.body.innerHTML = "";
});

// --- tests --------------------------------------------------------------------

describe("mosaic-glow-core / engine lifecycle", () => {
	it("returns null when no 2D context is available", () => {
		// jsdom has no canvas backend: getContext("2d") yields null.
		expect(createMosaicGlow(elements())).toBeNull();
		expect(raf).not.toHaveBeenCalled();
	});

	it("sizes the backing store, paints the first frame and schedules exactly one frame", () => {
		mount({ idle: "none", flicker: false });
		expect(canvas.width).toBe(200);
		expect(canvas.height).toBe(120);
		expect(raf).toHaveBeenCalledTimes(1);
		frame(16);
		// background + 10×6 tiles at the default pitch of 20 device px
		expect(ctx.fillRect.mock.calls.length).toBeGreaterThan(60);
		expect(strings(ctx.styles).some((s) => s.startsWith("rgb("))).toBe(true);
		expect(rafCallbacks.length).toBe(0); // idle none, no flicker → settled
	});

	it("paints a static frame and starts no loop when reducedMotion is set at create", () => {
		mount({ reducedMotion: true });
		expect(raf).not.toHaveBeenCalled();
		expect(ctx.fillRect).toHaveBeenCalled();
	});

	it("destroy is idempotent, cancels the frame and detaches the pointer listeners", () => {
		const e = mount({ idle: "drift" });
		frame(16);
		expect(rafCallbacks.length).toBe(1); // drifting keeps the loop alive
		e.destroy();
		expect(caf).toHaveBeenCalledTimes(1);
		e.destroy();
		expect(caf).toHaveBeenCalledTimes(1);
		raf.mockClear();
		ctx.fillRect.mockClear();
		pointerMove(50, 30);
		e.setOptions({ color: "#00ffff", visible: true, reducedMotion: false });
		e.resize();
		expect(raf).not.toHaveBeenCalled();
		expect(ctx.fillRect).not.toHaveBeenCalled();
	});

	it("resize is a no-op at a constant box and pixel ratio, and caps the ratio at 2", () => {
		const e = mount({ idle: "none", flicker: false });
		frame(16);
		ctx.fillRect.mockClear();
		e.resize();
		expect(ctx.fillRect).not.toHaveBeenCalled();
		expect(canvas.width).toBe(200);
		vi.stubGlobal("devicePixelRatio", 3);
		e.resize();
		expect(canvas.width).toBe(400); // min(devicePixelRatio, 2)
	});
});

describe("mosaic-glow-core / engine setOptions", () => {
	it("rebuilds the colour ramp on a colour change", () => {
		const e = mount({ idle: "none", flicker: false });
		frame(16);
		const before = new Set(strings(ctx.styles));
		ctx.styles.length = 0;
		e.setOptions({ color: "#00ffff", background: "#123456" });
		frame(32);
		const after = strings(ctx.styles);
		expect(after).toContain("#123456"); // the surface fill is the raw prop
		expect(after.filter((s) => s.startsWith("rgb(")).some((s) => !before.has(s))).toBe(true);
	});

	it("rebuilds the grid on a structural change", () => {
		const e = mount({ idle: "none", flicker: false });
		frame(16);
		ctx.fillRect.mockClear();
		e.setOptions({ intensity: 0.5 }); // visual only: repaint, same grid
		frame(32);
		expect(ctx.fillRect).toHaveBeenCalledTimes(1 + 10 * 6); // background + tiles at pitch 20
		ctx.fillRect.mockClear();
		e.setOptions({ tileSize: 38 }); // pitch 40 → 5×3 tiles
		frame(48);
		expect(ctx.fillRect).toHaveBeenCalledTimes(1 + 1 + 5 * 3); // glass sprite + background + tiles
	});

	it("restarts a stopped loop when idle turns on", () => {
		const e = mount({ idle: "none", flicker: false });
		frame(16);
		expect(rafCallbacks.length).toBe(0);
		e.setOptions({ idle: "drift" });
		expect(rafCallbacks.length).toBe(1);
	});

	it("restarts a stopped loop when flicker turns on", () => {
		const e = mount({ idle: "none", flicker: false });
		frame(16);
		expect(rafCallbacks.length).toBe(0);
		e.setOptions({ flicker: true });
		expect(rafCallbacks.length).toBe(1);
	});

	it("parks and resumes the loop with the visibility gate", () => {
		const e = mount({ idle: "drift" });
		frame(16);
		expect(rafCallbacks.length).toBe(1);
		e.setOptions({ visible: false });
		expect(caf).toHaveBeenCalled();
		rafCallbacks = [];
		raf.mockClear();
		e.setOptions({ visible: true });
		expect(raf).toHaveBeenCalledTimes(1);
	});

	it("swaps the loop for a synchronous static frame under reducedMotion", () => {
		const e = mount({ idle: "drift" });
		frame(16);
		raf.mockClear();
		e.setOptions({ reducedMotion: true });
		expect(caf).toHaveBeenCalled();
		rafCallbacks = [];
		ctx.fillRect.mockClear();
		e.setOptions({ intensity: 0.4 });
		expect(raf).not.toHaveBeenCalled();
		expect(ctx.fillRect).toHaveBeenCalled(); // painted straight away instead
		e.setOptions({ reducedMotion: false });
		expect(raf).toHaveBeenCalledTimes(1);
	});

	it("attaches and detaches the pointer listeners with interactive", () => {
		const e = mount({ idle: "none", flicker: false, interactive: false });
		frame(16);
		raf.mockClear();
		pointerMove(50, 30);
		expect(raf).not.toHaveBeenCalled();
		e.setOptions({ interactive: true });
		expect(raf).not.toHaveBeenCalled(); // attaching alone schedules nothing
		pointerMove(50, 30);
		expect(raf).toHaveBeenCalledTimes(1);
		frame(32);
		rafCallbacks = [];
		raf.mockClear();
		e.setOptions({ interactive: false });
		pointerMove(60, 40);
		pointerLeave();
		expect(raf).not.toHaveBeenCalled();
	});

	it("takes trail and smoothing without scheduling or painting anything", () => {
		const e = mount({ idle: "none", flicker: false });
		frame(16);
		raf.mockClear();
		ctx.fillRect.mockClear();
		e.setOptions({ trail: 0.9, smoothing: 0.4 });
		expect(raf).not.toHaveBeenCalled();
		expect(ctx.fillRect).not.toHaveBeenCalled();
	});

	it("ignores an empty patch", () => {
		const e = mount({ idle: "none", flicker: false });
		frame(16);
		raf.mockClear();
		ctx.fillRect.mockClear();
		e.setOptions({});
		expect(raf).not.toHaveBeenCalled();
		expect(ctx.fillRect).not.toHaveBeenCalled();
	});
});

describe("mosaic-glow-core / engine timing invariants", () => {
	it(`waits ${IDLE_DELAY_MS}ms after the pointer leaves before the idle drift takes over`, () => {
		mount({ idle: "drift", flicker: false, trail: 0, smoothing: 0 });
		let t = 0;
		frame((t += 16));
		pointerMove(50, 30);
		for (let i = 0; i < 4; i++) frame((t += 16));
		expect(ctx.createRadialGradient).toHaveBeenCalled(); // halo is lit

		vi.spyOn(performance, "now").mockReturnValue(1000);
		pointerLeave();
		t = 1000;
		for (let i = 0; i < 10; i++) frame((t += 64)); // t = 1640: still inside the idle delay
		ctx.createRadialGradient.mockClear();
		frame((t += 64));
		expect(ctx.createRadialGradient).not.toHaveBeenCalled(); // faded out, no drift yet

		t = 1000 + IDLE_DELAY_MS + 100;
		frame(t);
		expect(ctx.createRadialGradient).toHaveBeenCalled(); // drift took over
	});

	it(`throttles ambient-only frames to one every ${AMBIENT_FRAME_MS}ms`, () => {
		mount({ idle: "none", flicker: true });
		frame(16); // first paint (dirty)
		ctx.fillRect.mockClear();
		frame(16 + AMBIENT_FRAME_MS - 1);
		expect(ctx.fillRect).not.toHaveBeenCalled();
		frame(16 + AMBIENT_FRAME_MS);
		expect(ctx.fillRect).toHaveBeenCalled();
	});

	it("drives the ambient flicker from the injected random, never Math.random", () => {
		const rng = vi.fn(() => 0.5);
		const mathRandom = vi.spyOn(Math, "random");
		mount({ idle: "none", flicker: true }, rng);
		frame(16);
		expect(rng).toHaveBeenCalledTimes(10 * 6); // one roll per tile
		expect(mathRandom).not.toHaveBeenCalled();
	});

	it("keeps the documented constants and prop normalisers", () => {
		expect(IDLE_DELAY_MS).toBe(1500);
		expect(AMBIENT_FRAME_MS).toBe(50);
		expect(FLICKER_CHANCE).toBe(0.15);
		expect(LUT_SIZE).toBe(64);
		expect(normalizeTileSize(0)).toBe(1);
		expect(normalizeTileSize(Number.NaN)).toBe(18);
		expect(normalizeGap(-4)).toBe(0);
		expect(normalizeGap(Number.NaN)).toBe(2);
		expect(normalizeRadius(0)).toBe(1);
		expect(normalizeRadius(Number.NaN)).toBe(170);
	});
});
