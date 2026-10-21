/**
 * TickNav HDR light — framework-free, byte-identical in the Svelte, React and
 * Vue trees (see shared-cores.json).
 *
 * CSS and SVG colours are clamped to SDR white, so a DOM glow can never be
 * brighter than the page's white. This module draws the neon's light into a
 * WebGPU canvas configured with `rgba16float` + `toneMapping: { mode:
 * "extended" }`: on an HDR display, values above 1.0 render brighter than SDR
 * white. 1.0 is the SDR reference white (~203 nits in BT.2408 terms), so the
 * beam's peak of ~4.9 lands around 1000 nits on a display with the headroom.
 *
 * It only starts when the browser keeps extended tone mapping AND the display
 * reports `(dynamic-range: high)`; otherwise `startTickNavHdr` resolves to
 * null and the CSS glow carries the effect alone. No browser global is touched
 * at import time.
 */

import type { TickNavLineState } from "./tick-nav-core.js";

/** One glowing segment, in CSS px relative to the canvas's top-left corner. */
export interface TickNavLight {
	x0: number;
	x1: number;
	y: number;
	/** Tube radius, px (Gaussian core). */
	radius: number;
	/** Halo falloff, px (exponential skirt). */
	halo: number;
	/** Linear-light multiplier on the accent: 1 = SDR white level. */
	intensity: number;
	/** Mix toward white for the hot core of the light, 0..1. */
	white: number;
}

export interface TickNavHdr {
	/** Replaces everything drawn with these lights. */
	render(lights: TickNavLight[]): void;
	/** Canvas size in CSS px (the backing store follows devicePixelRatio). */
	resize(width: number, height: number): void;
	/** Accent colour as 8-bit sRGB. */
	setAccent(rgb: [number, number, number]): void;
	destroy(): void;
}

/** SDR white ≈ 203 nits; 1000 nits / 203 ≈ 4.9. */
export const TICK_NAV_HDR_PEAK = 4.9;

const MAX_LIGHTS = 256;
const MAX_DPR = 2;
const FORMAT = "rgba16float" as GPUTextureFormat;

const WGSL = /* wgsl */ `
struct Frame {
	size: vec2f,
	accent: vec3f,
};
@group(0) @binding(0) var<uniform> frame: Frame;

struct Light {
	@location(0) seg: vec4f,   // x0, y, x1, radius
	@location(1) look: vec4f,  // halo, intensity, white, unused
};

struct Out {
	@builtin(position) pos: vec4f,
	@location(0) p: vec2f,
	@location(1) seg: vec4f,
	@location(2) look: vec4f,
};

@vertex
fn vs(@builtin(vertex_index) vi: u32, light: Light) -> Out {
	let corners = array<vec2f, 6>(
		vec2f(0.0, 0.0), vec2f(1.0, 0.0), vec2f(0.0, 1.0),
		vec2f(0.0, 1.0), vec2f(1.0, 0.0), vec2f(1.0, 1.0)
	);
	let reach = light.seg.w * 2.0 + light.look.x * 6.0;
	let lo = vec2f(min(light.seg.x, light.seg.z) - reach, light.seg.y - reach);
	let hi = vec2f(max(light.seg.x, light.seg.z) + reach, light.seg.y + reach);
	let p = mix(lo, hi, corners[vi]);
	var out: Out;
	out.pos = vec4f(p.x / frame.size.x * 2.0 - 1.0, 1.0 - p.y / frame.size.y * 2.0, 0.0, 1.0);
	out.p = p;
	out.seg = light.seg;
	out.look = light.look;
	return out;
}

@fragment
fn fs(in: Out) -> @location(0) vec4f {
	let a = vec2f(in.seg.x, in.seg.y);
	let b = vec2f(in.seg.z, in.seg.y);
	let ab = b - a;
	let t = clamp(dot(in.p - a, ab) / max(dot(ab, ab), 1e-4), 0.0, 1.0);
	let d = length(in.p - (a + ab * t));
	let core = exp(-(d * d) / max(in.seg.w * in.seg.w, 1e-3));
	let halo = exp(-d / max(in.look.x, 1e-3)) * 0.35;
	let v = (core + halo) * in.look.y;
	let colour = mix(frame.accent, vec3f(1.0), in.look.z * core);
	// Premultiplied, nearly additive: light adds to the page under it.
	return vec4f(colour * v, clamp(v * 0.08, 0.0, 1.0));
}
`;

function srgbToLinear(c: number): number {
	const s = c / 255;
	return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

export async function startTickNavHdr(canvas: HTMLCanvasElement): Promise<TickNavHdr | null> {
	try {
		if (typeof navigator === "undefined" || typeof window === "undefined") return null;
		const hdrDisplay =
			typeof window.matchMedia === "function" && window.matchMedia("(dynamic-range: high)").matches;
		if (!hdrDisplay) return null;
		const gpu = (navigator as Navigator & { gpu?: GPU }).gpu;
		if (!gpu) return null;
		const adapter = await gpu.requestAdapter();
		if (!adapter) return null;
		const device = await adapter.requestDevice();
		const context = canvas.getContext("webgpu");
		if (!context) {
			device.destroy();
			return null;
		}
		context.configure({
			device,
			format: FORMAT,
			alphaMode: "premultiplied",
			colorSpace: "display-p3",
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
			context.unconfigure();
			device.destroy();
			return null;
		}

		const module = device.createShaderModule({ code: WGSL });
		const uniform = device.createBuffer({
			size: 32,
			usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
		});
		const instances = device.createBuffer({
			size: MAX_LIGHTS * 8 * 4,
			usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
		});
		const pipeline = device.createRenderPipeline({
			layout: "auto",
			vertex: {
				module,
				entryPoint: "vs",
				buffers: [
					{
						arrayStride: 32,
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
							color: { srcFactor: "one", dstFactor: "one", operation: "add" },
							alpha: { srcFactor: "one", dstFactor: "one", operation: "add" },
						},
					},
				],
			},
			primitive: { topology: "triangle-list" },
		});
		const bindGroup = device.createBindGroup({
			layout: pipeline.getBindGroupLayout(0),
			entries: [{ binding: 0, resource: { buffer: uniform } }],
		});

		let width = 1;
		let height = 1;
		let accent: [number, number, number] = [0.6, 0.3, 1];
		let destroyed = false;
		const data = new Float32Array(MAX_LIGHTS * 8);

		function writeUniform(): void {
			device.queue.writeBuffer(
				uniform,
				0,
				new Float32Array([width, height, 0, 0, accent[0], accent[1], accent[2], 0])
			);
		}
		writeUniform();

		return {
			render(lights) {
				if (destroyed) return;
				const n = Math.min(lights.length, MAX_LIGHTS);
				for (let i = 0; i < n; i++) {
					const l = lights[i];
					if (!l) continue;
					data.set([l.x0, l.y, l.x1, l.radius, l.halo, l.intensity, l.white, 0], i * 8);
				}
				if (n) device.queue.writeBuffer(instances, 0, data, 0, n * 8);
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
				if (n) {
					pass.setPipeline(pipeline);
					pass.setBindGroup(0, bindGroup);
					pass.setVertexBuffer(0, instances);
					pass.draw(6, n);
				}
				pass.end();
				device.queue.submit([encoder.finish()]);
			},
			resize(w, h) {
				width = Math.max(1, w);
				height = Math.max(1, h);
				const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
				canvas.width = Math.round(width * dpr);
				canvas.height = Math.round(height * dpr);
				writeUniform();
			},
			setAccent(rgb) {
				accent = [srgbToLinear(rgb[0]), srgbToLinear(rgb[1]), srgbToLinear(rgb[2])];
				writeUniform();
			},
			destroy() {
				destroyed = true;
				try {
					context.unconfigure();
				} catch {
					// already gone
				}
				device.destroy();
			},
		};
	} catch {
		return null;
	}
}

/** Margin, px, the HDR canvas extends past the nav on every side for the halo. */
export const TICK_NAV_HDR_PAD = 24;

/**
 * Turns the core's per-line state into lights: a tube along every lit line
 * (proximity, or the current row) and a hot spark on every running pluck's
 * wave head, peaking at {@link TICK_NAV_HDR_PEAK}.
 */
export function tickNavLights(lines: TickNavLineState[]): TickNavLight[] {
	const out: TickNavLight[] = [];
	const pad = TICK_NAV_HDR_PAD;
	for (const line of lines) {
		const row = line.kind === "row";
		// Tubes sit around SDR white (1.0) at most; the headroom above is kept
		// for the sparks, so the peak reads as a flash, not a white-hot rail.
		const tube = Math.max(line.current ? 0.9 : 0, line.near * (row ? 1.1 : 0.45));
		if (tube > 0.02) {
			out.push({
				x0: line.x + pad,
				x1: line.x + line.length + pad,
				y: line.y + pad,
				radius: row ? 1.1 : 0.8,
				halo: 3 + line.near * 5,
				intensity: tube,
				white: 0.2,
			});
		}
		if (line.progress !== null) {
			const head = line.x + line.length * line.progress + pad;
			out.push({
				x0: head - 3,
				x1: head + 3,
				y: line.y + pad,
				radius: row ? 1.6 : 1.2,
				halo: 7,
				intensity: TICK_NAV_HDR_PEAK * Math.pow(1 - line.progress, 0.6) * (row ? 1 : 0.6),
				white: 0.85,
			});
		}
	}
	return out;
}

/** Resolves any CSS colour the browser understands to 8-bit sRGB. */
export function resolveCssColor(css: string): [number, number, number] | null {
	if (typeof document === "undefined") return null;
	const ctx = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
	if (!ctx) return null;
	ctx.fillStyle = "#000";
	ctx.fillStyle = css;
	ctx.fillRect(0, 0, 1, 1);
	const px = ctx.getImageData(0, 0, 1, 1).data;
	return [px[0] ?? 0, px[1] ?? 0, px[2] ?? 0];
}
