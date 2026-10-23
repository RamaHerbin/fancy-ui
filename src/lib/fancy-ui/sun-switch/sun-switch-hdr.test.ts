import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HALO_HDR_ATTR, HALO_ATTR, isWaving, pixelWave } from "./pixel-wave-core.js";
import {
	HORIZON_GLOW_LENS,
	SUN_GLOW_DAY,
	SUN_GLOW_LENS,
	SUN_PALETTE,
	createLens,
	createSunPainter,
	haloGlow,
	mixRgb,
	paintHalo,
	paintSun,
	rasterSun,
	rgbOf,
	type Ctx2D,
	type GlowSink,
} from "./sun-switch-core.js";
import {
	SUN_HDR_PEAK,
	createSunHdrSquares,
	encodeGlowChannel,
	hdrCapacityFor,
	startSunHdr,
	sunHdrAvailable,
} from "./sun-switch-hdr.js";

const realMatchMedia = window.matchMedia;
const realGetContext = HTMLCanvasElement.prototype.getContext;

function stubMatchMedia(hdr: boolean) {
	window.matchMedia = vi.fn((q: string) => ({
		matches: q.includes("dynamic-range") ? hdr : false,
		media: q,
		addEventListener: () => {},
		removeEventListener: () => {},
	})) as unknown as typeof window.matchMedia;
}

/** A minimal WebGPU fake that records draws. */
function fakeGpu(opts: { extended?: boolean } = {}) {
	const draws: number[] = [];
	let loseDevice: () => void = () => {};
	const device = {
		lost: new Promise<void>((r) => {
			loseDevice = r;
		}),
		destroy: vi.fn(),
		createShaderModule: vi.fn(() => ({})),
		createRenderPipeline: vi.fn(() => ({ getBindGroupLayout: () => ({}) })),
		createBindGroup: vi.fn(() => ({})),
		createBuffer: vi.fn((d: { size: number }) => {
			const b = { size: d.size, destroyed: false, destroy: () => (b.destroyed = true) };
			return b;
		}),
		createCommandEncoder: vi.fn(() => ({
			beginRenderPass: () => ({
				setPipeline: () => {},
				setBindGroup: () => {},
				setVertexBuffer: () => {},
				draw: (_v: number, n: number) => draws.push(n),
				end: () => {},
			}),
			finish: () => ({}),
		})),
		queue: { writeBuffer: vi.fn(), submit: vi.fn() },
	};
	const context = {
		configure: vi.fn(),
		unconfigure: vi.fn(),
		getConfiguration: () => ({
			toneMapping: { mode: opts.extended === false ? "standard" : "extended" },
		}),
		getCurrentTexture: () => ({ createView: () => ({}) }),
	};
	const gpu = { requestAdapter: vi.fn(async () => ({ requestDevice: async () => device })) };
	vi.stubGlobal("navigator", { gpu });
	vi.stubGlobal("GPUBufferUsage", { UNIFORM: 64, COPY_DST: 8, VERTEX: 32 });
	const canvas = document.createElement("canvas");
	canvas.getContext = vi.fn(() => context) as never;
	return { device, context, gpu, canvas, draws, lose: () => loseDevice() };
}

function recordingCtx(): Ctx2D & { rects: number } {
	const ctx = {
		fillStyle: "" as string,
		globalAlpha: 1,
		rects: 0,
		fillRect() {
			ctx.rects++;
		},
		clearRect() {},
		setTransform() {},
	};
	return ctx as unknown as Ctx2D & { rects: number };
}

function recordingSink(): GlowSink & { items: [number, number, number, number][] } {
	const items: [number, number, number, number][] = [];
	return {
		items,
		clear: () => (items.length = 0),
		push: (px, py, rgb, glow) => items.push([px, py, rgb, glow]),
	};
}

afterEach(() => {
	vi.unstubAllGlobals();
	window.matchMedia = realMatchMedia;
	HTMLCanvasElement.prototype.getContext = realGetContext;
});

describe("HDR gate", () => {
	it("is off without WebGPU, off on an SDR display, on with both", () => {
		vi.stubGlobal("navigator", {});
		stubMatchMedia(true);
		expect(sunHdrAvailable()).toBe(false);
		vi.stubGlobal("navigator", { gpu: {} });
		stubMatchMedia(false);
		expect(sunHdrAvailable()).toBe(false);
		stubMatchMedia(true);
		expect(sunHdrAvailable()).toBe(true);
	});

	it("resolves null when extended tone mapping does not stick", async () => {
		const f = fakeGpu({ extended: false });
		stubMatchMedia(true);
		expect(await startSunHdr(f.canvas)).toBeNull();
		expect(f.context.unconfigure).toHaveBeenCalled();
	});
});

describe("HDR encoding", () => {
	it("glow 1 reproduces the SDR value; higher glows go past 1, capped at the peak", () => {
		for (const c of [0, 17, 128, 200, 255]) expect(encodeGlowChannel(c, 1)).toBeCloseTo(c / 255, 3);
		expect(encodeGlowChannel(255, 2)).toBeGreaterThan(1);
		expect(encodeGlowChannel(255, 99)).toBe(encodeGlowChannel(255, SUN_HDR_PEAK));
	});

	it("squares grow past the start capacity and skip unparsed colours", () => {
		const sq = createSunHdrSquares();
		for (let i = 0; i < 3000; i++) sq.push(i, 0, 0xffffff, 2);
		sq.push(0, 0, -1, 2);
		sq.push(0, 0, 0xffffff, 0);
		expect(sq.n).toBe(3000);
		expect(sq.data.length).toBeGreaterThanOrEqual(3000 * 8);
		expect(sq.data[2999 * 8]).toBe(2999);
		expect(hdrCapacityFor(3000)).toBe(4096);
		sq.clear();
		expect(sq.n).toBe(0);
	});

	it("parses colours to 0xRRGGBB and mixes in sRGB", () => {
		expect(rgbOf("#f7cf4a")).toBe(0xf7cf4a);
		expect(rgbOf("rgb(0, 0, 0)")).toBe(0);
		expect(rgbOf("oklch(0.5 0.1 20)")).toBe(-1);
		expect(rgbOf("transparent")).toBe(-1);
		expect(mixRgb(0xffffff, 0x000000, 0.5)).toBe(0x808080);
	});
});

describe("glow sinks", () => {
	const raster = rasterSun({ radius: 6, horizon: true });
	const base = {
		cell: 5,
		dot: 4,
		dpr: 1,
		palette: SUN_PALETTE,
		nightAlpha: 0.42,
		ink: "rgb(20, 20, 20)",
		lens: null,
		front: null,
	};

	it("day at rest: every sun cell glows at the day level, tinted like the 2D dot", () => {
		const sink = recordingSink();
		paintSun(recordingCtx(), raster, { ...base, checked: true, glow: sink });
		const sun = raster.cells.filter((c) => c.layer === "sun");
		expect(sink.items).toHaveLength(sun.length);
		expect(sink.items.every(([, , , g]) => g === SUN_GLOW_DAY)).toBe(true);
		const first = sun[0]!;
		const pure = rgbOf(SUN_PALETTE[first.color as 0 | 1 | 2 | 3]);
		expect(sink.items[0]![2]).toBe(mixRgb(pure, 0x141414, 0.3));
	});

	it("night at rest glows nowhere; under the lens the sun peaks and the horizon lifts", () => {
		const sink = recordingSink();
		paintSun(recordingCtx(), raster, { ...base, checked: false, glow: sink });
		expect(sink.items).toHaveLength(0);
		const all = { covers: () => true } as unknown as ReturnType<typeof createLens>;
		paintSun(recordingCtx(), raster, { ...base, checked: false, lens: all, glow: sink });
		const glows = new Set(sink.items.map(([, , , g]) => g));
		expect(glows).toEqual(new Set([SUN_GLOW_LENS, HORIZON_GLOW_LENS]));
		expect(sink.items).toHaveLength(raster.cells.length);
	});

	it("the halo pushes every square it paints, brighter toward the inner rim", () => {
		const sink = recordingSink();
		const ctx = recordingCtx();
		const n = paintHalo(ctx, {
			cx: 40.5,
			cy: 40.5,
			R: 30,
			halo: 9,
			cell: 5,
			dot: 4,
			ox: 0,
			oy: 0,
			W: 400,
			H: 400,
			palette: SUN_PALETTE,
			glow: sink,
		});
		expect(n).toBeGreaterThan(0);
		expect(sink.items).toHaveLength(n);
		for (const [, , , g] of sink.items) {
			expect(g).toBeGreaterThanOrEqual(haloGlow(0));
			expect(g).toBeLessThanOrEqual(haloGlow(1));
		}
		expect(haloGlow(1)).toBeCloseTo(SUN_HDR_PEAK, 5);
	});

	it("the painter hands each frame to its glow target", () => {
		const canvas = document.createElement("canvas");
		canvas.getContext = vi.fn(() => recordingCtx()) as never;
		const p = createSunPainter(canvas, {
			radius: 6,
			cell: 5,
			dot: 4,
			palette: SUN_PALETTE,
			nightAlpha: 0.42,
			horizon: true,
			lens: true,
			lensRadius: 7,
			checked: true,
			reducedMotion: true,
		})!;
		const sink = recordingSink();
		const render = vi.fn();
		p.setGlowTarget({ sink, render });
		expect(render).toHaveBeenCalledWith(canvas.width, canvas.height, 4);
		expect(sink.items.length).toBeGreaterThan(0);
		p.setGlowTarget(null);
		p.destroy();
	});
});

describe("HDR layer", () => {
	it("configures srgb + extended and draws the pushed squares", async () => {
		const f = fakeGpu();
		stubMatchMedia(true);
		const layer = await startSunHdr(f.canvas);
		expect(layer).not.toBeNull();
		expect(f.context.configure).toHaveBeenCalledWith(
			expect.objectContaining({
				colorSpace: "srgb",
				format: "rgba16float",
				toneMapping: { mode: "extended" },
			})
		);
		for (let i = 0; i < 5000; i++) layer!.sink.push(i, 0, 0xf7cf4a, 3);
		layer!.render(105, 105, 4);
		expect(f.draws).toEqual([5000]);
		expect(layer!.count).toBe(5000);
		expect(f.canvas.width).toBe(105);
		layer!.destroy();
	});

	it("shares one device between layers and destroys it with the last one", async () => {
		const f = fakeGpu();
		stubMatchMedia(true);
		const a = await startSunHdr(f.canvas);
		const b = await startSunHdr(f.canvas);
		expect(f.gpu.requestAdapter).toHaveBeenCalledTimes(1);
		a!.destroy();
		await Promise.resolve();
		expect(f.device.destroy).not.toHaveBeenCalled();
		b!.destroy();
		await new Promise((r) => setTimeout(r, 0));
		expect(f.device.destroy).toHaveBeenCalledTimes(1);
	});

	it("resolves lost when the device is lost and stops drawing", async () => {
		const f = fakeGpu();
		stubMatchMedia(true);
		const layer = await startSunHdr(f.canvas);
		let lost = false;
		void layer!.lost.then(() => (lost = true));
		f.lose();
		await new Promise((r) => setTimeout(r, 0));
		expect(lost).toBe(true);
		layer!.sink.push(0, 0, 0xffffff, 2);
		layer!.render(10, 10, 4);
		expect(f.draws).toEqual([]);
		layer!.destroy();
	});
});

describe("wave halo HDR", () => {
	let queue: (() => void)[] = [];
	let clock = 0;
	const now = () => clock;

	beforeEach(() => {
		queue = [];
		clock = 0;
		vi.stubGlobal("requestAnimationFrame", (cb: () => void) => queue.push(cb));
		vi.stubGlobal("cancelAnimationFrame", () => {});
		vi.stubGlobal("innerWidth", 400);
		vi.stubGlobal("innerHeight", 300);
	});

	afterEach(() => {
		document.body.innerHTML = "";
	});

	async function settle() {
		for (let i = 0; i < 4; i++) await Promise.resolve();
		await new Promise((r) => setTimeout(r, 0));
	}

	it("lays a WebGPU canvas over the halo, draws the halo squares there and removes it", async () => {
		const f = fakeGpu();
		stubMatchMedia(true);
		HTMLCanvasElement.prototype.getContext = vi.fn(function (this: HTMLCanvasElement, kind) {
			return kind === "webgpu" ? f.context : recordingCtx();
		}) as never;
		const done = pixelWave({
			origin: { x: 200, y: 150 },
			apply: () => {},
			reducedMotion: false,
			fill: "#fff",
			duration: 1000,
			now,
		});
		const halo = document.querySelector(`[${HALO_ATTR}]`);
		const hdr = document.querySelector(`[${HALO_HDR_ATTR}]`) as HTMLCanvasElement;
		expect(hdr).not.toBeNull();
		expect(halo!.nextElementSibling).toBe(hdr);
		expect(hdr.getAttribute("aria-hidden")).toBe("true");
		await settle();
		clock = 500;
		queue.shift()?.();
		expect(f.draws.length).toBeGreaterThan(0);
		expect(f.draws.at(-1)).toBeGreaterThan(0);
		while (queue.length) {
			clock += 1000;
			queue.shift()?.();
		}
		await done;
		expect(isWaving()).toBe(false);
		expect(document.querySelector(`[${HALO_HDR_ATTR}]`)).toBeNull();
	});

	it("adds no HDR canvas with hdr off or on an SDR display", async () => {
		fakeGpu();
		stubMatchMedia(true);
		const a = pixelWave({
			origin: { x: 0, y: 0 },
			apply: () => {},
			reducedMotion: false,
			hdr: false,
			duration: 0,
			now,
		});
		expect(document.querySelector(`[${HALO_HDR_ATTR}]`)).toBeNull();
		await a;
		stubMatchMedia(false);
		const b = pixelWave({
			origin: { x: 0, y: 0 },
			apply: () => {},
			reducedMotion: false,
			duration: 0,
			now,
		});
		expect(document.querySelector(`[${HALO_HDR_ATTR}]`)).toBeNull();
		await b;
	});
});
