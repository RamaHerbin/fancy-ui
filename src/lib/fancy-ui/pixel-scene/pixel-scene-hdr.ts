/// <reference types="@webgpu/types" />
/**
 * PixelScene HDR layer — framework-free, byte-identical in the Svelte, React
 * and Vue trees (see shared-cores.json).
 *
 * The picture is painted in a 2D canvas, which stops at SDR white. This module
 * lays a WebGPU canvas over it (`rgba16float`, `colorSpace: "srgb"`,
 * `toneMapping: { mode: "extended" }`) and redraws every cell whose glow is
 * above zero as a hard square at `glow ×` its colour, alpha 1: one instanced
 * quad per cell, no blur, no falloff term in the shader. Halos are made of
 * cells by `pixelHalos` in the core.
 *
 * Encoding: the canvas reads its values as extended (gamma-encoded) sRGB, so
 * each channel is sent as `encodeExt(srgbToLinear(c) × glow)`, computed on
 * the CPU. A glow of exactly 1 reproduces the 2D dot.
 *
 * One GPUDevice per page, reference-counted across instances; each instance
 * owns its context, uniform, instance buffer and bind group. Nothing touches
 * `window` or `navigator` at import.
 */

import { encodeExt, srgbToLinear, type PixelSceneFrame } from "./pixel-scene-core.js";

/** SDR white ≈ 203 nits; 1000 nits / 203 ≈ 4.9. Every glow is clamped to it. */
export const PIXEL_SCENE_HDR_PEAK = 4.9;

/**
 * A lost device usually comes back (GPU process restarted, driver reset, tab
 * woken from a discarded state). The components start the layer again after
 * `PIXEL_SCENE_HDR_RESTART_MS × attempt`, up to `PIXEL_SCENE_HDR_RESTARTS`
 * times per mount, before dropping the HDR canvas for good.
 */
export const PIXEL_SCENE_HDR_RESTARTS = 3;
export const PIXEL_SCENE_HDR_RESTART_MS = 600;

/** Floats per instance: `x0, y0, soft radius px, 0, r, g, b, 1`. */
const FPI = 8;
const START_CAPACITY = 4096;
const FORMAT = "rgba16float" as GPUTextureFormat;

const WGSL = /* wgsl */ `
struct Frame { size: vec2f, dot: f32, pad: f32 };
@group(0) @binding(0) var<uniform> frame: Frame;
struct In { @location(0) cell: vec4f, @location(1) colour: vec4f };
struct Out { @builtin(position) pos: vec4f, @location(0) colour: vec4f };
struct Out2 { @builtin(position) pos: vec4f, @location(0) colour: vec4f, @location(1) p: vec2f, @location(2) cell: vec4f };
@vertex fn vs(@builtin(vertex_index) vi: u32, inst: In) -> Out2 {
	let corners = array<vec2f, 6>(vec2f(0, 0), vec2f(1, 0), vec2f(0, 1), vec2f(0, 1), vec2f(1, 0), vec2f(1, 1));
	// a soft cell (cell.z > 0, px) widens its quad to carry its halo
	let reach = select(0.0, inst.cell.z * 4.0 + 1.0, inst.cell.z > 0.0);
	let p = inst.cell.xy - vec2f(reach) + corners[vi] * (frame.dot + 2.0 * reach);
	var o: Out2;
	o.pos = vec4f(p.x / frame.size.x * 2.0 - 1.0, 1.0 - p.y / frame.size.y * 2.0, 0.0, 1.0);
	o.colour = inst.colour;
	o.p = p;
	o.cell = inst.cell;
	return o;
}
// a hard square at the pre-encoded colour; soft cells (house windows) also get
// the first prototype's golden halo, exp(-d / radius) around the square
@fragment fn fs(o: Out2) -> @location(0) vec4f {
	let half = vec2f(frame.dot * 0.5);
	let q = abs(o.p - (o.cell.xy + half)) - half;
	let d = length(max(q, vec2f(0.0)));
	let core = select(0.0, 1.0, d <= 0.001);
	let h = select(0.0, exp(-d / max(o.cell.z, 0.001)) * 0.55, o.cell.z > 0.0);
	let v = core + h * (1.0 - core);
	return vec4f(o.colour.rgb * v, max(core, clamp(h * 0.25, 0.0, 1.0)));
}
`;

/**
 * Sync and SSR-safe: WebGPU is exposed and the display reports
 * `(dynamic-range: high)`. Decides whether the HDR canvas is rendered at all.
 */
export function pixelSceneHdrAvailable(): boolean {
	try {
		if (typeof navigator === "undefined" || typeof window === "undefined") return false;
		if (!(navigator as Navigator & { gpu?: GPU }).gpu) return false;
		return (
			typeof window.matchMedia === "function" && window.matchMedia("(dynamic-range: high)").matches
		);
	} catch {
		return false;
	}
}

/**
 * Two HDR looks, kept side by side to compare:
 * - `calibrated`: `colorSpace: "srgb"`, each channel sent as
 *   `encodeExt(linear(c) × glow)`, so a glow of 1 is the 2D dot exactly and
 *   a glow of 4.9 is 4.9 × SDR white;
 * - `vivid`: the prototype's transfer, `colorSpace: "display-p3"`, each channel
 *   sent as `linear(c) × g` with `g = 1 + (glow − 1) × VIVID_SCALE`. The canvas
 *   reads that as encoded, so lights land far hotter (lamps reach the panel
 *   peak) and colours more saturated; the scale brings the calibrated levels
 *   back to the prototype's.
 */
export type PixelSceneHdrLook = "calibrated" | "vivid";
export const PIXEL_SCENE_HDR_LOOKS: readonly PixelSceneHdrLook[] = ["calibrated", "vivid"];
/** Maps the calibrated glow levels onto the prototype's (star 3.5 → 2.1, sun 4.9 → 2.8). */
export const VIVID_SCALE = 0.45;

/** One channel (0–255) at `glow ×` SDR, encoded for the canvas of `look`. */
export function encodeGlowChannel(
	c8: number,
	glow: number,
	look: PixelSceneHdrLook = "calibrated"
): number {
	const g = Math.min(PIXEL_SCENE_HDR_PEAK, Math.max(0, glow));
	if (look === "vivid") return srgbToLinear(c8) * (g > 0 ? 1 + (g - 1) * VIVID_SCALE : 0);
	return encodeExt(srgbToLinear(c8) * g);
}

export interface PixelSceneHdr {
	/** Draws the HDR squares for one painted frame. */
	render(frame: PixelSceneFrame): void;
	destroy(): void;
	/** Resolves when the shared device is lost; the 2D picture carries on. */
	readonly lost: Promise<void>;
	/** Instances drawn by the last `render` (diagnostics, tests). */
	readonly count: number;
}

// --- one device per page -----------------------------------------------------

interface SharedDevice {
	device: Promise<GPUDevice | null>;
	refs: number;
	onLost: Set<() => void>;
}

let shared: SharedDevice | null = null;
const PIPELINES = new WeakMap<GPUDevice, GPURenderPipeline>();

function acquire(gpu: GPU): SharedDevice {
	if (!shared) {
		const s: SharedDevice = { device: Promise.resolve(null), refs: 0, onLost: new Set() };
		s.device = (async () => {
			const adapter = await gpu.requestAdapter();
			if (!adapter) return null;
			const device = await adapter.requestDevice();
			void device.lost.then(() => {
				if (shared === s) shared = null;
				for (const fn of [...s.onLost]) fn();
				s.onLost.clear();
			});
			return device;
		})().catch(() => null);
		shared = s;
	}
	shared.refs++;
	return shared;
}

function release(s: SharedDevice): void {
	s.refs--;
	if (s.refs > 0) return;
	if (shared === s) shared = null;
	s.onLost.clear();
	void s.device.then((d) => d?.destroy());
}

function pipelineFor(device: GPUDevice): GPURenderPipeline {
	let p = PIPELINES.get(device);
	if (p) return p;
	const module = device.createShaderModule({ code: WGSL });
	p = device.createRenderPipeline({
		layout: "auto",
		vertex: {
			module,
			entryPoint: "vs",
			buffers: [
				{
					arrayStride: FPI * 4,
					stepMode: "instance",
					attributes: [
						{ shaderLocation: 0, offset: 0, format: "float32x4" },
						{ shaderLocation: 1, offset: 16, format: "float32x4" },
					],
				},
			],
		},
		fragment: {
			module,
			entryPoint: "fs",
			targets: [
				{
					format: FORMAT,
					blend: {
						color: { srcFactor: "one", dstFactor: "one", operation: "max" },
						alpha: { srcFactor: "one", dstFactor: "one", operation: "max" },
					},
				},
			],
		},
		primitive: { topology: "triangle-list" },
	});
	PIPELINES.set(device, p);
	return p;
}

/** Next power of two ≥ n, at least the start capacity. */
export function hdrCapacityFor(n: number): number {
	let c = START_CAPACITY;
	while (c < n) c *= 2;
	return c;
}

/**
 * Starts the layer on `canvas`. Resolves null when WebGPU, the adapter, the
 * context or extended tone mapping is missing; never throws.
 */
export async function startPixelSceneHdr(
	canvas: HTMLCanvasElement,
	look: PixelSceneHdrLook = "calibrated"
): Promise<PixelSceneHdr | null> {
	if (!pixelSceneHdrAvailable()) return null;
	const gpu = (navigator as Navigator & { gpu?: GPU }).gpu;
	if (!gpu) return null;
	const s = acquire(gpu);
	let held = true;
	const drop = () => {
		if (held) {
			held = false;
			release(s);
		}
	};
	try {
		const device = await s.device;
		if (!device) {
			drop();
			return null;
		}
		const context = canvas.getContext("webgpu") as GPUCanvasContext | null;
		if (!context) {
			drop();
			return null;
		}
		context.configure({
			device,
			format: FORMAT,
			alphaMode: "premultiplied",
			colorSpace: look === "vivid" ? "display-p3" : "srgb",
			toneMapping: { mode: "extended" },
		} as GPUCanvasConfiguration);
		let extended = false;
		try {
			const applied = context.getConfiguration?.() as
				| (GPUCanvasConfiguration & { toneMapping?: { mode?: string } })
				| null;
			extended = applied?.toneMapping?.mode === "extended";
		} catch {
			extended = false;
		}
		if (!extended) {
			try {
				context.unconfigure();
			} catch {
				// nothing to undo
			}
			drop();
			return null;
		}

		const pipeline = pipelineFor(device);
		const uniform = device.createBuffer({
			size: 16,
			usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
		});
		const uniformData = new Float32Array(4);
		const bindGroup = device.createBindGroup({
			layout: pipeline.getBindGroupLayout(0),
			entries: [{ binding: 0, resource: { buffer: uniform } }],
		});
		let capacity = START_CAPACITY;
		let data = new Float32Array(capacity * FPI);
		let instances = device.createBuffer({
			size: data.byteLength,
			usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
		});
		let destroyed = false;
		let count = 0;

		let resolveLost: () => void = () => {};
		const lost = new Promise<void>((r) => {
			resolveLost = r;
		});
		const onLost = () => {
			destroyed = true;
			resolveLost();
		};
		s.onLost.add(onLost);

		const layer: PixelSceneHdr = {
			get lost() {
				return lost;
			},
			get count() {
				return count;
			},
			render(frame) {
				if (destroyed || frame.width <= 0 || frame.height <= 0) return;
				if (canvas.width !== frame.width) canvas.width = frame.width;
				if (canvas.height !== frame.height) canvas.height = frame.height;
				const rendering = frame.pixelated ? "pixelated" : "";
				if (canvas.style && canvas.style.imageRendering !== rendering)
					canvas.style.imageRendering = rendering;
				const { cols, rows, color, glow, hcol, cellCss, dpr } = frame;
				const soft = frame.soft;
				const n = cols * rows;
				let k = 0;
				for (let y = 0; y < rows; y++) {
					const oy = Math.round(y * cellCss * dpr);
					for (let x = 0; x < cols; x++) {
						const i = y * cols + x;
						if (i >= n) break;
						const g = glow[i]!;
						if (!(g > 0)) continue;
						const h = hcol[i]!;
						const c = h >= 0 ? h : color[i]!;
						if (c < 0) continue;
						if (k >= capacity) {
							capacity = hdrCapacityFor(k + 1);
							const next = new Float32Array(capacity * FPI);
							next.set(data);
							data = next;
							instances.destroy();
							instances = device.createBuffer({
								size: data.byteLength,
								usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
							});
						}
						const o = k * FPI;
						data[o] = Math.round(x * cellCss * dpr);
						data[o + 1] = oy;
						data[o + 2] = soft ? soft[i]! * cellCss * dpr : 0;
						data[o + 3] = 0;
						data[o + 4] = encodeGlowChannel((c >> 16) & 255, g, look);
						data[o + 5] = encodeGlowChannel((c >> 8) & 255, g, look);
						data[o + 6] = encodeGlowChannel(c & 255, g, look);
						data[o + 7] = 1;
						k++;
					}
				}
				count = k;
				uniformData[0] = frame.width;
				uniformData[1] = frame.height;
				uniformData[2] = frame.size;
				uniformData[3] = 0;
				try {
					device.queue.writeBuffer(uniform, 0, uniformData);
					if (k) device.queue.writeBuffer(instances, 0, data, 0, k * FPI);
					const encoder = device.createCommandEncoder();
					const pass = encoder.beginRenderPass({
						colorAttachments: [
							{
								view: context.getCurrentTexture().createView(),
								clearValue: { r: 0, g: 0, b: 0, a: 0 },
								loadOp: "clear",
								storeOp: "store",
							},
						],
					});
					if (k) {
						pass.setPipeline(pipeline);
						pass.setBindGroup(0, bindGroup);
						pass.setVertexBuffer(0, instances);
						pass.draw(6, k);
					}
					pass.end();
					device.queue.submit([encoder.finish()]);
				} catch {
					// a lost or reconfigured context: the next frame tries again
				}
			},
			destroy() {
				if (destroyed && !held) return;
				destroyed = true;
				s.onLost.delete(onLost);
				try {
					context.unconfigure();
				} catch {
					// already gone
				}
				try {
					uniform.destroy();
					instances.destroy();
				} catch {
					// device already lost
				}
				drop();
			},
		};
		return layer;
	} catch {
		drop();
		return null;
	}
}
