import { afterEach, describe, expect, it, vi } from "vitest";
import { createGrid, type PixelSceneFrame } from "./pixel-scene-core.js";
import {
	PIXEL_SCENE_HDR_PEAK,
	encodeGlowChannel,
	hdrCapacityFor,
	VIVID_SCALE,
	pixelSceneHdrAvailable,
	startPixelSceneHdr,
} from "./pixel-scene-hdr.js";

const realMatchMedia = window.matchMedia;
function stubMatchMedia(hdr: boolean) {
	window.matchMedia = vi.fn((q: string) => ({
		matches: q.includes("dynamic-range") ? hdr : false,
		media: q,
		addEventListener: () => {},
		removeEventListener: () => {},
	})) as unknown as typeof window.matchMedia;
}

/** A minimal WebGPU fake that records draws and buffer writes. */
function fakeGpu(opts: { extended?: boolean } = {}) {
	const draws: number[] = [];
	const writes: { size: number }[] = [];
	const buffers: { size: number; destroyed: boolean }[] = [];
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
			buffers.push(b);
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
		queue: {
			writeBuffer: vi.fn((_b: unknown, _o: number, _d: unknown, _do?: number, size?: number) =>
				writes.push({ size: size ?? 0 })
			),
			submit: vi.fn(),
		},
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
	return { device, context, gpu, canvas, draws, writes, buffers, lose: () => loseDevice() };
}

function frameWith(glowCells: number, cols = 200): PixelSceneFrame {
	const rows = Math.ceil(glowCells / cols);
	const g = createGrid(cols, rows);
	for (let i = 0; i < glowCells; i++) {
		g.color[i] = 0x336699;
		g.glow[i] = 2;
	}
	return {
		cols,
		rows,
		width: cols * 5,
		height: rows * 5,
		pitch: 5,
		size: 4,
		cellCss: 5,
		dpr: 1,
		color: g.color,
		glow: g.glow,
		hcol: g.hcol,
		soft: g.soft,
	};
}

afterEach(() => {
	vi.unstubAllGlobals();
	window.matchMedia = realMatchMedia;
});

describe("HDR gate", () => {
	it("is off without WebGPU", () => {
		stubMatchMedia(true);
		vi.stubGlobal("navigator", {});
		expect(pixelSceneHdrAvailable()).toBe(false);
	});

	it("is off on an SDR display and on with WebGPU + an HDR display", () => {
		fakeGpu();
		stubMatchMedia(false);
		expect(pixelSceneHdrAvailable()).toBe(false);
		stubMatchMedia(true);
		expect(pixelSceneHdrAvailable()).toBe(true);
	});

	it("resolves null when extended tone mapping does not stick", async () => {
		const f = fakeGpu({ extended: false });
		stubMatchMedia(true);
		expect(await startPixelSceneHdr(f.canvas)).toBeNull();
		expect(f.context.unconfigure).toHaveBeenCalled();
		expect(f.device.destroy).toHaveBeenCalled();
	});
});

describe("HDR encoding", () => {
	it("glow 1 reproduces the SDR value; higher glows encode extended sRGB, capped at the peak", () => {
		for (const c of [0, 17, 128, 200, 255]) expect(encodeGlowChannel(c, 1)).toBeCloseTo(c / 255, 5);
		const white = encodeGlowChannel(255, 4.4);
		expect(white).toBeGreaterThan(1.85);
		expect(white).toBeLessThan(1.95);
		expect(encodeGlowChannel(255, 99)).toBe(encodeGlowChannel(255, PIXEL_SCENE_HDR_PEAK));
	});

	it("grows capacity in powers of two", () => {
		expect(hdrCapacityFor(10)).toBe(4096);
		expect(hdrCapacityFor(4097)).toBe(8192);
		expect(hdrCapacityFor(10000)).toBe(16384);
	});
});

describe("HDR layer", () => {
	it("configures srgb + extended and draws one instance per glowing cell, past the start capacity", async () => {
		const f = fakeGpu();
		stubMatchMedia(true);
		const layer = await startPixelSceneHdr(f.canvas);
		expect(layer).not.toBeNull();
		expect(f.context.configure).toHaveBeenCalledWith(
			expect.objectContaining({
				colorSpace: "srgb",
				format: "rgba16float",
				toneMapping: { mode: "extended" },
			})
		);
		layer!.render(frameWith(10_000));
		expect(f.draws).toEqual([10_000]);
		expect(layer!.count).toBe(10_000);
		expect(f.canvas.width).toBe(1000);
		layer!.destroy();
	});

	it("vivid: display-p3 and the prototype's transfer, hotter than calibrated above glow 1", async () => {
		const f = fakeGpu();
		stubMatchMedia(true);
		const layer = await startPixelSceneHdr(f.canvas, "vivid");
		expect(f.context.configure).toHaveBeenCalledWith(
			expect.objectContaining({ colorSpace: "display-p3", toneMapping: { mode: "extended" } })
		);
		layer!.destroy();
		// sent value is linear(c) × (1 + (g − 1) × VIVID_SCALE), read by the canvas as encoded
		expect(encodeGlowChannel(255, 1, "vivid")).toBeCloseTo(1, 5);
		expect(encodeGlowChannel(255, 3.5, "vivid")).toBeCloseTo(1 + 2.5 * VIVID_SCALE, 5);
		expect(encodeGlowChannel(128, 0, "vivid")).toBe(0);
		const decode = (v: number) => ((v + 0.055) / 1.055) ** 2.4;
		expect(decode(encodeGlowChannel(255, 3.5, "vivid"))).toBeGreaterThan(
			decode(encodeGlowChannel(255, 3.5, "calibrated"))
		);
	});

	it("sends the soft halo radius (px) of house windows in the instance data", async () => {
		const f = fakeGpu();
		stubMatchMedia(true);
		const layer = await startPixelSceneHdr(f.canvas);
		const frame = frameWith(3);
		frame.soft[1] = 1.6;
		const sent: number[][] = [];
		f.device.queue.writeBuffer.mockImplementation(
			(_b: unknown, _o: number, d: unknown, _do?: number, size?: number) => {
				if (d instanceof Float32Array && size) sent.push([...d.slice(0, size)]);
				return sent.length;
			}
		);
		layer!.render(frame);
		const inst = sent.at(-1)!;
		expect([inst[2], inst[8 + 2], inst[16 + 2]]).toEqual([0, 1.6 * 5, 0]);
		layer!.destroy();
	});

	it("shares one device between layers and destroys it with the last one", async () => {
		const f = fakeGpu();
		stubMatchMedia(true);
		const a = await startPixelSceneHdr(f.canvas);
		const b = await startPixelSceneHdr(f.canvas);
		expect(f.gpu.requestAdapter).toHaveBeenCalledTimes(1);
		a!.destroy();
		await Promise.resolve();
		expect(f.device.destroy).not.toHaveBeenCalled();
		b!.destroy();
		await new Promise((r) => setTimeout(r, 0));
		expect(f.device.destroy).toHaveBeenCalledTimes(1);
	});

	it("resolves lost when the device is lost", async () => {
		const f = fakeGpu();
		stubMatchMedia(true);
		const layer = await startPixelSceneHdr(f.canvas);
		let lost = false;
		void layer!.lost.then(() => (lost = true));
		f.lose();
		await new Promise((r) => setTimeout(r, 0));
		expect(lost).toBe(true);
		layer!.render(frameWith(10));
		expect(f.draws).toEqual([]);
		layer!.destroy();
	});
});
