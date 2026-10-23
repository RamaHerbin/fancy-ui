/**
 * SunSwitch HDR layer — framework-free, byte-identical in the Svelte, React
 * and Vue trees (see shared-cores.json).
 *
 * The sun and the wave halo are painted in 2D canvases, which stop at SDR
 * white. On HDR displays a WebGPU canvas is laid over each one
 * (`rgba16float`, `colorSpace: "srgb"`, `toneMapping: { mode: "extended" }`)
 * and the painted squares that carry a glow are drawn again there as hard
 * squares at `glow ×` their colour, alpha 1: one instanced quad per square,
 * no blur, no falloff term in the shader. The halo stays made of dithered
 * cells; nothing soft is added.
 *
 * Encoding: the canvas reads its values as extended (gamma-encoded) sRGB, so
 * each channel is sent as `encodeExt(srgbToLinear(c) × glow)`, computed on
 * the CPU when a square is pushed. A glow of exactly 1 reproduces the 2D dot.
 *
 * One GPUDevice per page, reference-counted across layers; each layer owns
 * its context, uniform, instance buffer and bind group. Nothing touches
 * `window` or `navigator` at import.
 */

import type { GlowSink } from "./sun-switch-core.js";

/** SDR white ≈ 203 nits; 1000 nits / 203 ≈ 4.9. Every glow is clamped to it. */
export const SUN_HDR_PEAK = 4.9;

/**
 * A lost device usually comes back (GPU process restarted, driver reset). The
 * component starts its layer again after `SUN_HDR_RESTART_MS × attempt`, up to
 * `SUN_HDR_RESTARTS` times per mount, before dropping the HDR canvas for good.
 */
export const SUN_HDR_RESTARTS = 3;
export const SUN_HDR_RESTART_MS = 600;

/** Floats per instance: `x0, y0, 0, 0, r, g, b, 1`. */
const FPI = 8;
const START_CAPACITY = 1024;
const FORMAT = "rgba16float" as GPUTextureFormat;

const WGSL = /* wgsl */ `
struct Frame { size: vec2f, dot: f32, pad: f32 };
@group(0) @binding(0) var<uniform> frame: Frame;
struct In { @location(0) cell: vec4f, @location(1) colour: vec4f };
struct Out { @builtin(position) pos: vec4f, @location(0) colour: vec4f };
@vertex fn vs(@builtin(vertex_index) vi: u32, inst: In) -> Out {
	let corners = array<vec2f, 6>(vec2f(0, 0), vec2f(1, 0), vec2f(0, 1), vec2f(0, 1), vec2f(1, 0), vec2f(1, 1));
	let p = inst.cell.xy + corners[vi] * frame.dot;
	var o: Out;
	o.pos = vec4f(p.x / frame.size.x * 2.0 - 1.0, 1.0 - p.y / frame.size.y * 2.0, 0.0, 1.0);
	o.colour = inst.colour;
	return o;
}
// a hard square at the pre-encoded colour; nothing else
@fragment fn fs(o: Out) -> @location(0) vec4f { return vec4f(o.colour.rgb, 1.0); }
`;

// --- encoding ----------------------------------------------------------------

const LINEAR = new Float32Array(256);
for (let i = 0; i < 256; i++) {
	const c = i / 255;
	LINEAR[i] = c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/** sRGB channel (0–255) → linear light. */
export function srgbToLinear(c8: number): number {
	return LINEAR[Math.min(255, Math.max(0, Math.round(c8)))]!;
}

/** Linear light → extended-sRGB encoded value; keeps going above 1 for HDR. */
export function encodeExt(v: number): number {
	return v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
}

/** One channel (0–255) at `glow ×` SDR, encoded for the extended-sRGB canvas. */
export function encodeGlowChannel(c8: number, glow: number): number {
	const g = Math.min(SUN_HDR_PEAK, Math.max(0, glow));
	return encodeExt(srgbToLinear(c8) * g);
}

/**
 * Sync and SSR-safe: WebGPU is exposed and the display reports
 * `(dynamic-range: high)`. Decides whether an HDR canvas is created at all.
 */
export function sunHdrAvailable(): boolean {
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

/** Next power of two ≥ n, at least the start capacity. */
export function hdrCapacityFor(n: number): number {
	let c = START_CAPACITY;
	while (c < n) c *= 2;
	return c;
}

/**
 * The squares of one frame, encoded as they are pushed. Painters fill it
 * through {@link GlowSink}; the layer uploads it as is.
 */
export interface SunHdrSquares extends GlowSink {
	/** Squares pushed since the last `clear`. */
	readonly n: number;
	/** `FPI` floats per square; valid up to `n × 8`. */
	readonly data: Float32Array<ArrayBuffer>;
}

export function createSunHdrSquares(): SunHdrSquares {
	let data = new Float32Array(START_CAPACITY * FPI);
	let n = 0;
	return {
		get n() {
			return n;
		},
		get data() {
			return data;
		},
		clear() {
			n = 0;
		},
		push(px, py, rgb, glow) {
			if (!(glow > 0) || rgb < 0) return;
			if ((n + 1) * FPI > data.length) {
				const next = new Float32Array(hdrCapacityFor(n + 1) * FPI);
				next.set(data);
				data = next;
			}
			const o = n * FPI;
			data[o] = px;
			data[o + 1] = py;
			data[o + 2] = 0;
			data[o + 3] = 0;
			data[o + 4] = encodeGlowChannel((rgb >> 16) & 255, glow);
			data[o + 5] = encodeGlowChannel((rgb >> 8) & 255, glow);
			data[o + 6] = encodeGlowChannel(rgb & 255, glow);
			data[o + 7] = 1;
			n++;
		},
	};
}

export interface SunHdrLayer {
	/** Filled by the painter for the next `render`. */
	readonly sink: SunHdrSquares;
	/** Draws the squares in `sink` on a `width × height` backing, `size` device px each. */
	render(width: number, height: number, size: number): void;
	destroy(): void;
	/** Resolves when the shared device is lost; the 2D picture carries on. */
	readonly lost: Promise<void>;
	/** Squares drawn by the last `render` (diagnostics, tests). */
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

/**
 * Starts a layer on `canvas`. Resolves null when WebGPU, the adapter, the
 * context or extended tone mapping is missing; never throws.
 */
export async function startSunHdr(canvas: HTMLCanvasElement): Promise<SunHdrLayer | null> {
	if (!sunHdrAvailable()) return null;
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
			colorSpace: "srgb",
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
		const sink = createSunHdrSquares();
		let capacity = START_CAPACITY;
		let instances = device.createBuffer({
			size: capacity * FPI * 4,
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

		const layer: SunHdrLayer = {
			sink,
			get lost() {
				return lost;
			},
			get count() {
				return count;
			},
			render(width, height, size) {
				if (destroyed || width <= 0 || height <= 0) return;
				if (canvas.width !== width) canvas.width = width;
				if (canvas.height !== height) canvas.height = height;
				const k = sink.n;
				if (k > capacity) {
					capacity = hdrCapacityFor(k);
					instances.destroy();
					instances = device.createBuffer({
						size: capacity * FPI * 4,
						usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
					});
				}
				count = k;
				uniformData[0] = width;
				uniformData[1] = height;
				uniformData[2] = size;
				uniformData[3] = 0;
				try {
					device.queue.writeBuffer(uniform, 0, uniformData);
					if (k) device.queue.writeBuffer(instances, 0, sink.data, 0, k * FPI);
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
