/**
 * MosaicGlow HDR light — framework-free, byte-identical in the Svelte, React
 * and Vue trees (see shared-cores.json).
 *
 * The mosaic itself is painted in a 2D canvas, which stops at SDR white. This
 * module lays a WebGPU canvas over it, configured with `rgba16float` +
 * `toneMapping: { mode: "extended" }`, and adds only the light ABOVE white:
 * hot tiles inside the halo climb toward {@link MOSAIC_GLOW_HDR_PEAK} (≈1000
 * nits against a 203-nit SDR reference white) and the halo gets a hot core.
 * Resting and ambient tiles get nothing, so the SDR picture is unchanged.
 *
 * It starts only when the browser keeps extended tone mapping AND the display
 * reports `(dynamic-range: high)`; otherwise `startMosaicGlowHdr` resolves to
 * null and the 2D mosaic runs alone. No browser global is touched at import.
 */

import { DEFAULT_COLOR, parseRgb, type MosaicGlowFrame } from "./mosaic-glow-core.js";

/** SDR white ≈ 203 nits; 1000 nits / 203 ≈ 4.9. */
export const MOSAIC_GLOW_HDR_PEAK = 4.9;

export interface MosaicGlowHdr {
	/** Draws the light for one painted mosaic frame. */
	render(frame: MosaicGlowFrame): void;
	destroy(): void;
}

const FORMAT = "rgba16float" as GPUTextureFormat;

const WGSL = /* wgsl */ `
struct Frame {
	size: vec2f,
	pitch: f32,
	tile: f32,
	halo: vec4f,     // x, y, r, fade
	accent: vec4f,   // linear rgb, peak
	grid: vec4u,     // cols, rows, -, -
};
@group(0) @binding(0) var<uniform> frame: Frame;
@group(0) @binding(1) var<storage, read> heat: array<f32>;

@vertex
fn vs(@builtin(vertex_index) vi: u32) -> @builtin(position) vec4f {
	let p = array<vec2f, 3>(vec2f(-1.0, -1.0), vec2f(3.0, -1.0), vec2f(-1.0, 3.0));
	return vec4f(p[vi], 0.0, 1.0);
}

@fragment
fn fs(@builtin(position) pos: vec4f) -> @location(0) vec4f {
	let p = pos.xy;
	let cell = floor(p / frame.pitch);
	let local = p - cell * frame.pitch;
	var h = 0.0;
	if (cell.x >= 0.0 && cell.y >= 0.0 && u32(cell.x) < frame.grid.x && u32(cell.y) < frame.grid.y
		&& local.x < frame.tile && local.y < frame.tile) {
		h = heat[u32(cell.y) * frame.grid.x + u32(cell.x)];
	}
	let peak = frame.accent.w;
	// Only the hottest tiles leave SDR: the excess above white ramps in late.
	let hot = smoothstep(0.5, 1.0, h);
	let tileLight = hot * (peak - 1.0);
	let d = distance(p, frame.halo.xy);
	let core = frame.halo.z * 0.22;
	let haloLight = frame.halo.w * 0.9 * exp(-(d * d) / max(core * core, 1.0));
	let v = tileLight + haloLight;
	let colour = mix(frame.accent.rgb, vec3f(1.0), 0.25 * hot);
	return vec4f(colour * v, clamp(v * 0.05, 0.0, 1.0));
}
`;

function srgbToLinear(c: number): number {
	const s = c / 255;
	return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

export async function startMosaicGlowHdr(canvas: HTMLCanvasElement): Promise<MosaicGlowHdr | null> {
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
		const pipeline = device.createRenderPipeline({
			layout: "auto",
			vertex: { module, entryPoint: "vs" },
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
		const uniform = device.createBuffer({
			size: 64,
			usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
		});
		const uniformData = new ArrayBuffer(64);
		const f32 = new Float32Array(uniformData);
		const u32 = new Uint32Array(uniformData);

		let heatBuffer: GPUBuffer | null = null;
		let heatCapacity = 0;
		let scaled = new Float32Array(0);
		let bindGroup: GPUBindGroup | null = null;
		let colourKey = "";
		let accent: [number, number, number] = [1, 0.6, 0.1];
		let destroyed = false;

		function ensureHeat(count: number): void {
			if (heatBuffer && count <= heatCapacity) return;
			heatBuffer?.destroy();
			heatCapacity = Math.max(count, 64);
			heatBuffer = device.createBuffer({
				size: heatCapacity * 4,
				usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
			});
			scaled = new Float32Array(heatCapacity);
			bindGroup = device.createBindGroup({
				layout: pipeline.getBindGroupLayout(0),
				entries: [
					{ binding: 0, resource: { buffer: uniform } },
					{ binding: 1, resource: { buffer: heatBuffer } },
				],
			});
		}

		return {
			render(frame) {
				if (destroyed || frame.width <= 0 || frame.height <= 0) return;
				if (canvas.width !== frame.width) canvas.width = frame.width;
				if (canvas.height !== frame.height) canvas.height = frame.height;
				if (frame.color !== colourKey) {
					colourKey = frame.color;
					const rgb = parseRgb(frame.color) ?? DEFAULT_COLOR;
					accent = [srgbToLinear(rgb[0]), srgbToLinear(rgb[1]), srgbToLinear(rgb[2])];
				}
				const count = frame.cols * frame.rows;
				ensureHeat(count);
				for (let i = 0; i < count; i++) scaled[i] = (frame.heat[i] ?? 0) * frame.intensity;

				f32[0] = frame.width;
				f32[1] = frame.height;
				f32[2] = frame.pitch;
				f32[3] = frame.tile;
				f32[4] = frame.halo.x;
				f32[5] = frame.halo.y;
				f32[6] = frame.halo.r;
				f32[7] = frame.halo.fade * frame.intensity;
				f32[8] = accent[0];
				f32[9] = accent[1];
				f32[10] = accent[2];
				f32[11] = MOSAIC_GLOW_HDR_PEAK;
				u32[12] = frame.cols;
				u32[13] = frame.rows;
				device.queue.writeBuffer(uniform, 0, uniformData);
				if (heatBuffer && count) device.queue.writeBuffer(heatBuffer, 0, scaled, 0, count);

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
				if (bindGroup && count) {
					pass.setPipeline(pipeline);
					pass.setBindGroup(0, bindGroup);
					pass.draw(3);
				}
				pass.end();
				device.queue.submit([encoder.finish()]);
			},
			destroy() {
				destroyed = true;
				try {
					context.unconfigure();
				} catch {
					// already gone
				}
				heatBuffer?.destroy();
				device.destroy();
			},
		};
	} catch {
		return null;
	}
}
