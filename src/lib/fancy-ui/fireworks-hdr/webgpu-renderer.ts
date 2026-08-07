/// <reference types="@webgpu/types" />
// WebGPU HDR renderer for FireworksHdr.
//
// Consumes 8-float particle instances from the DOM/GPU-free Sim (see
// fireworks-shared.ts §7) and renders them into an `rgba16float` accumulation
// buffer, then to a canvas configured with `colorSpace: "display-p3"` and
// `toneMapping: { mode: "extended" }`. On an HDR display the exposure boost
// pushes encoded values above 1.0, which extended tone mapping renders brighter
// than SDR white; browsers that ignore `toneMapping` clamp to SDR and the
// effect still runs (just without the over-white separation).
//
// Honesty invariants (mirrored from fluid-cursor/webgpu-engine.ts):
//   - the configuration is probed on a DETACHED canvas first, because a canvas
//     that has vended a "webgpu" context can never provide a WebGL one — the
//     WebGL2 fallback must stay possible if configure() fails;
//   - `extendedToneMapping` is read back from getConfiguration() and surfaced
//     as data so "webgpu-hdr" can be told apart from a clamped fallback;
//   - renderLevel is "webgpu-hdr" only when extended tone mapping is active AND
//     the display reports `(dynamic-range: high)`;
//   - that same predicate drives the shaders' `sdr` uniform, so an SDR display
//     always gets the exposure-1 soft-knee path even when the browser did keep
//     extended tone mapping (otherwise its highlights clip to white).
//
// Three passes per frame:
//   (a) decay:     accum.read → accum.write × exp(-TRAIL_FADE_RATE·dt)
//   (b) particles: instanced velocity-stretched quads, additive (one/one),
//                  two-lobe gaussian (hot core + soft halo), into accum.write
//                  (loadOp "load"), then swap
//   (c) display:   accum.read → canvas, HDR c·exposure premultiplied, or SDR
//                  soft-knee (§7) + saturation boost.

import { STRETCH, EXPOSURE_AMBIENT, type FireworksRenderLevel } from "./fireworks-shared.js";

/**
 * Single global accumulation fade rate (1/s). Per-frame factor is
 * exp(-TRAIL_FADE_RATE·dt); at 60 fps that is ≈0.889, fading a trail to 10% in
 * ~330 ms (AD §3.3 ascent range 350–500 ms). Held deliberately short: the
 * accumulation buffer is what smears a moving particle into a line, so a slower
 * fade turns falling debris into long straight filaments instead of sparks.
 */
export const TRAIL_FADE_RATE = 7.0;

/** Device-pixel-ratio clamp — HDR float buffers are fill-rate heavy. */
const MAX_DPR = 2;

export interface WebGpuFireworksOptions {
	/** Max instances the buffer must hold (the Sim's capacity). */
	maxInstances: number;
	/** Accumulation resolution scale relative to the canvas (default 1). */
	renderScale?: number;
	/** Initial display exposure multiplier (clamped [1,4]). */
	exposure?: number;
}

export interface FrameUniforms {
	/** Display exposure multiplier (clamped [1,4] internally). */
	exposure: number;
}

/**
 * Renderer control surface owned by the component. The rAF loop lives in the
 * component; it calls `frame` once per tick with the live instance data.
 */
export interface FireworksEngineHandle {
	/** Render one frame: decay, additive particles, display. */
	frame(
		dt: number,
		instanceData: Float32Array<ArrayBuffer>,
		liveCount: number,
		uniforms: FrameUniforms
	): void;
	/** Reconcile the drawing buffer + accumulation textures with the CSS size. */
	resizeIfNeeded(): void;
	/**
	 * Set the accumulation-buffer resolution scale (relative to the canvas) and
	 * rebuild the accumulation textures at the new scale. Used by the component's
	 * adaptive downgrade to shed GPU fill-rate. No-op where there is no separate
	 * accumulation buffer (WebGL2 Path B).
	 */
	setRenderScale(scale: number): void;
	/** Whether the browser actually kept extended tone mapping (true HDR path). */
	readonly extendedToneMapping: boolean;
	/** "webgpu-hdr" or "webgpu-sdr" (never a webgl-* / none level here). */
	readonly renderLevel: FireworksRenderLevel;
	readonly lost: boolean;
	readonly instanceCapacity: number;
	destroy(): void;
}

const ACCUM_FORMAT: GPUTextureFormat = "rgba16float";
const INSTANCE_FLOATS = 8;
const INSTANCE_STRIDE = INSTANCE_FLOATS * 4; // bytes

const WGSL = /* wgsl */ `
// ---- shared fullscreen-triangle vertex ------------------------------------
struct FSOut {
	@builtin(position) pos: vec4f,
	@location(0) uv: vec2f,
}

@vertex
fn vs_fullscreen(@builtin(vertex_index) i: u32) -> FSOut {
	var p = array<vec2f, 3>(vec2f(-1.0, -3.0), vec2f(-1.0, 1.0), vec2f(3.0, 1.0));
	var out: FSOut;
	out.pos = vec4f(p[i], 0.0, 1.0);
	// v=0 is the top texel row (top-left origin, matching normalized positions).
	out.uv = vec2f(p[i].x, -p[i].y) * 0.5 + 0.5;
	return out;
}

// ---- (a) decay ------------------------------------------------------------
struct DecayU { fade: f32, _pad0: f32, _pad1: f32, _pad2: f32 }
@group(0) @binding(0) var<uniform> du: DecayU;
@group(0) @binding(1) var accumSmp: sampler;
@group(0) @binding(2) var accumTex: texture_2d<f32>;

@fragment
fn fs_decay(in: FSOut) -> @location(0) vec4f {
	return textureSample(accumTex, accumSmp, in.uv) * du.fade;
}

// ---- (b) particles --------------------------------------------------------
struct ParticleU { aspect: f32, sdr: f32, coreScale: f32, _pad: f32 }
@group(0) @binding(0) var<uniform> pu: ParticleU;

// Quad oversize so the halo can fall to zero before the geometry ends.
const QUAD_PAD: f32 = 1.35;

struct PVOut {
	@builtin(position) pos: vec4f,
	@location(0) local: vec2f,  // quad-local coords in [-1,1]
	@location(1) color: vec3f,
}

@vertex
fn vs_particle(
	@builtin(vertex_index) vi: u32,
	@location(0) iPos: vec2f,     // normalized [0,1], top-left origin
	@location(1) iSize: f32,      // half-size in screen-heights
	@location(2) iColor: vec3f,   // linear RGB · brightness
	@location(3) iVel: vec2f,     // velocity · STRETCH (screen-height displacement)
) -> PVOut {
	// 4-vertex triangle strip corners.
	var corners = array<vec2f, 4>(
		vec2f(-1.0, -1.0), vec2f(1.0, -1.0), vec2f(-1.0, 1.0), vec2f(1.0, 1.0)
	);
	let c = corners[vi];

	// SDR trades brightness headroom for size — bigger, not brighter (§7.4).
	let size = iSize * select(1.0, pu.coreScale, pu.sdr > 0.5);

	// Velocity-stretch: major axis along velocity, clamped 1–2.5× the minor.
	let velLen = length(iVel);
	var dir = vec2f(1.0, 0.0);
	if (velLen > 1e-6) { dir = iVel / velLen; }
	let perp = vec2f(-dir.y, dir.x);
	// QUAD_PAD gives the halo room to reach zero INSIDE the quad; the fragment
	// keeps the gaussian in un-padded units so the visible size is unchanged.
	let minorHalf = size * QUAD_PAD;
	let majorHalf = clamp(size + velLen, size, size * 2.5) * QUAD_PAD;

	// Offset in isotropic screen-height units, then map to [0,1] (x compressed
	// by aspect) and to NDC (flip y for the top-left origin).
	let off = dir * (majorHalf * c.x) + perp * (minorHalf * c.y);
	let p01 = iPos + vec2f(off.x / pu.aspect, off.y);
	let ndc = vec2f(p01.x * 2.0 - 1.0, 1.0 - p01.y * 2.0);

	var out: PVOut;
	out.pos = vec4f(ndc, 0.0, 1.0);
	out.local = c * QUAD_PAD;
	out.color = iColor;
	return out;
}

@fragment
fn fs_particle(in: PVOut) -> @location(0) vec4f {
	// Two-lobe gaussian: tight hot core + soft wide halo.
	let r2 = dot(in.local, in.local);
	let core = exp(-r2 * 6.0);
	let halo = exp(-r2 * 1.6) * 0.35;
	// Window it to exactly zero at the quad edge. The halo alone still carries
	// ~7% of its peak there, and additive blending turns that step into a
	// hard-edged square around anything bright (a flash reads as a lit box).
	let win = smoothstep(QUAD_PAD, QUAD_PAD * 0.6, sqrt(r2));
	let intensity = (core + halo) * win;
	// Additive (one/one): premultiplied contribution.
	return vec4f(in.color * intensity, intensity);
}

// ---- (c) display ----------------------------------------------------------
struct DisplayU { exposure: f32, sdr: f32, knee: f32, satBoost: f32 }
@group(0) @binding(0) var<uniform> disp: DisplayU;
@group(0) @binding(1) var dispSmp: sampler;
@group(0) @binding(2) var dispTex: texture_2d<f32>;

fn softKnee(x: f32, knee: f32) -> f32 {
	// Below the knee: identity. Above: asymptotic approach to 1.0 (§7.2).
	if (x <= knee) { return x; }
	let over = x - knee;
	let span = max(1.0 - knee, 1e-3);
	return knee + span * (1.0 - exp(-over / span));
}

@fragment
fn fs_display(in: FSOut) -> @location(0) vec4f {
	let c = max(textureSample(dispTex, dispSmp, in.uv).rgb, vec3f(0.0));

	if (disp.sdr > 0.5) {
		// SDR: exposure pinned to 1.0, soft-knee compression, saturation lift.
		var k = vec3f(softKnee(c.r, disp.knee), softKnee(c.g, disp.knee), softKnee(c.b, disp.knee));
		let luma = dot(k, vec3f(0.2126, 0.7152, 0.0722));
		k = mix(vec3f(luma), k, 1.0 + disp.satBoost);
		let a = min(max(k.r, max(k.g, k.b)), 1.0);
		return vec4f(clamp(k, vec3f(0.0), vec3f(1.0)), a);
	}

	// HDR: encoded values above 1.0 render brighter than SDR white. Alpha stays
	// clamped for premultiplied compositing; color intentionally exceeds it.
	let a = min(max(c.r, max(c.g, c.b)), 1.0);
	return vec4f(c * disp.exposure, a);
}
`;

function scaleByPixelRatio(input: number): number {
	const dpr = Math.min(typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1, MAX_DPR);
	return Math.floor(input * dpr);
}

interface DoubleTex {
	read: GPUTexture;
	write: GPUTexture;
	readView: GPUTextureView;
	writeView: GPUTextureView;
	width: number;
	height: number;
	swap(): void;
}

/**
 * Build the WebGPU renderer, or `null` when WebGPU is unavailable / rejected
 * (the caller then tries the WebGL2 path, or gives up silently).
 */
export async function startWebGpuFireworks(
	canvas: HTMLCanvasElement,
	opts: WebGpuFireworksOptions
): Promise<FireworksEngineHandle | null> {
	try {
		const gpu = navigator.gpu;
		if (!gpu) return null;
		const adapter = await gpu.requestAdapter();
		if (!adapter) return null;
		const device = await adapter.requestDevice();

		const configuration = {
			device,
			format: ACCUM_FORMAT,
			alphaMode: "premultiplied",
			colorSpace: "display-p3",
			toneMapping: { mode: "extended" },
		} as GPUCanvasConfiguration;

		// Probe on a detached canvas first (see file header — keeps the WebGL2
		// fallback possible if configure() throws).
		try {
			const probe = document.createElement("canvas").getContext("webgpu");
			if (!probe) {
				device.destroy();
				return null;
			}
			probe.configure(configuration);
			probe.unconfigure();
		} catch (error) {
			device.destroy();
			if (import.meta.env.DEV) {
				console.warn("[FireworksHdr] WebGPU canvas configuration rejected:", error);
			}
			return null;
		}

		const maybeContext = canvas.getContext("webgpu");
		if (!maybeContext) {
			device.destroy();
			return null;
		}
		const context: GPUCanvasContext = maybeContext;
		context.configure(configuration);

		// Surface whether extended tone mapping actually stuck (data, not just a
		// DEV log) so the render level is honest.
		let extendedToneMapping = false;
		try {
			const applied = context.getConfiguration?.() as
				| (GPUCanvasConfiguration & { toneMapping?: { mode?: string } })
				| null;
			extendedToneMapping = applied?.toneMapping?.mode === "extended";
		} catch {
			// getConfiguration unsupported (e.g. Safari): assume clamped output.
		}

		// Extended tone mapping only proves the browser kept the configuration —
		// an SDR display still clamps — so true HDR output requires both. Sampled
		// once; it does not follow the window to another monitor.
		const hdrDisplay =
			typeof window !== "undefined" && typeof window.matchMedia === "function"
				? window.matchMedia("(dynamic-range: high)").matches
				: false;
		// The single HDR predicate: the shaders' SDR path and the reported render
		// level must never disagree, or an SDR display gets HDR exposure and
		// clips its highlights while the handle claims "webgpu-sdr".
		const hdrOutput = extendedToneMapping && hdrDisplay;

		let destroyed = false;
		let lost = false;
		device.lost.then((info) => {
			lost = true;
			if (!destroyed && import.meta.env.DEV) {
				console.warn(`[FireworksHdr] WebGPU device lost (${info.reason}): ${info.message}`);
			}
		});
		if (import.meta.env.DEV) {
			device.addEventListener("uncapturederror", (event) => {
				console.error(
					"[FireworksHdr] WebGPU uncaptured error:",
					(event as GPUUncapturedErrorEvent).error.message
				);
			});
		}

		const module = device.createShaderModule({ code: WGSL });
		let renderScale = opts.renderScale ?? 1;
		const instanceCapacity = Math.max(1, opts.maxInstances);
		let exposure = clampExposure(opts.exposure ?? EXPOSURE_AMBIENT);

		// --- layouts + pipelines ---------------------------------------------
		const fsLayout = device.createBindGroupLayout({
			entries: [
				{ binding: 0, visibility: GPUShaderStage.FRAGMENT, buffer: { type: "uniform" } },
				{ binding: 1, visibility: GPUShaderStage.FRAGMENT, sampler: { type: "filtering" } },
				{ binding: 2, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: "float" } },
			],
		});
		const particleLayout = device.createBindGroupLayout({
			entries: [{ binding: 0, visibility: GPUShaderStage.VERTEX, buffer: { type: "uniform" } }],
		});

		const decayPipeline = device.createRenderPipeline({
			layout: device.createPipelineLayout({ bindGroupLayouts: [fsLayout] }),
			vertex: { module, entryPoint: "vs_fullscreen" },
			fragment: { module, entryPoint: "fs_decay", targets: [{ format: ACCUM_FORMAT }] },
			primitive: { topology: "triangle-list" },
		});

		const particlePipeline = device.createRenderPipeline({
			layout: device.createPipelineLayout({ bindGroupLayouts: [particleLayout] }),
			vertex: {
				module,
				entryPoint: "vs_particle",
				buffers: [
					{
						arrayStride: INSTANCE_STRIDE,
						stepMode: "instance",
						attributes: [
							{ shaderLocation: 0, offset: 0, format: "float32x2" }, // pos
							{ shaderLocation: 1, offset: 8, format: "float32" }, // size
							{ shaderLocation: 2, offset: 12, format: "float32x3" }, // color
							{ shaderLocation: 3, offset: 24, format: "float32x2" }, // vel
						],
					},
				],
			},
			fragment: {
				module,
				entryPoint: "fs_particle",
				targets: [
					{
						format: ACCUM_FORMAT,
						blend: {
							color: { srcFactor: "one", dstFactor: "one", operation: "add" },
							alpha: { srcFactor: "one", dstFactor: "one", operation: "add" },
						},
					},
				],
			},
			primitive: { topology: "triangle-strip" },
		});

		const displayPipeline = device.createRenderPipeline({
			layout: device.createPipelineLayout({ bindGroupLayouts: [fsLayout] }),
			vertex: { module, entryPoint: "vs_fullscreen" },
			fragment: { module, entryPoint: "fs_display", targets: [{ format: ACCUM_FORMAT }] },
			primitive: { topology: "triangle-list" },
		});

		const sampler = device.createSampler({
			magFilter: "linear",
			minFilter: "linear",
			addressModeU: "clamp-to-edge",
			addressModeV: "clamp-to-edge",
		});

		// --- buffers ----------------------------------------------------------
		const decayU = device.createBuffer({
			size: 16,
			usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
		});
		const particleU = device.createBuffer({
			size: 16,
			usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
		});
		const displayU = device.createBuffer({
			size: 16,
			usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
		});
		const instanceBuffer = device.createBuffer({
			size: instanceCapacity * INSTANCE_STRIDE,
			usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
		});
		const particleBindGroup = device.createBindGroup({
			layout: particleLayout,
			entries: [{ binding: 0, resource: { buffer: particleU } }],
		});

		const scratch4 = new Float32Array(4);

		// --- accumulation textures -------------------------------------------
		let accum: DoubleTex | null = null;
		// The ping-pong has exactly two orientations, so the decay/display bind
		// groups are precomputed once per texture generation (one pair per stable
		// view) and selected by reference each frame — no per-frame createBindGroup.
		let accumViewA: GPUTextureView | null = null;
		let bgDecayA: GPUBindGroup | null = null;
		let bgDecayB: GPUBindGroup | null = null;
		let bgDisplayA: GPUBindGroup | null = null;
		let bgDisplayB: GPUBindGroup | null = null;

		function makeTexture(w: number, h: number): GPUTexture {
			return device.createTexture({
				size: { width: w, height: h },
				format: ACCUM_FORMAT,
				usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
			});
		}

		function makeDoubleTex(w: number, h: number): DoubleTex {
			const a = makeTexture(w, h);
			const b = makeTexture(w, h);
			return {
				read: a,
				write: b,
				readView: a.createView(),
				writeView: b.createView(),
				width: w,
				height: h,
				swap() {
					const t = this.read;
					const tv = this.readView;
					this.read = this.write;
					this.readView = this.writeView;
					this.write = t;
					this.writeView = tv;
				},
			};
		}

		function bindGroupFor(uniform: GPUBuffer, texView: GPUTextureView): GPUBindGroup {
			return device.createBindGroup({
				layout: fsLayout,
				entries: [
					{ binding: 0, resource: { buffer: uniform } },
					{ binding: 1, resource: sampler },
					{ binding: 2, resource: texView },
				],
			});
		}

		function initTextures(w: number, h: number) {
			const aw = Math.max(1, Math.round(w * renderScale));
			const ah = Math.max(1, Math.round(h * renderScale));
			if (accum && accum.width === aw && accum.height === ah) return;
			accum?.read.destroy();
			accum?.write.destroy();
			accum = makeDoubleTex(aw, ah);
			// Capture the two stable views (readView/writeView never change identity,
			// only which role they play), and build the decay/display bind group for
			// each. `frame` picks the pair matching the current read view.
			accumViewA = accum.readView;
			bgDecayA = bindGroupFor(decayU, accum.readView);
			bgDecayB = bindGroupFor(decayU, accum.writeView);
			bgDisplayA = bindGroupFor(displayU, accum.readView);
			bgDisplayB = bindGroupFor(displayU, accum.writeView);
		}

		function resizeIfNeeded() {
			if (destroyed || lost) return;
			const w = scaleByPixelRatio(canvas.clientWidth);
			const h = scaleByPixelRatio(canvas.clientHeight);
			if (w > 0 && h > 0 && (canvas.width !== w || canvas.height !== h)) {
				canvas.width = w;
				canvas.height = h;
				initTextures(w, h);
			}
		}

		function setRenderScale(scale: number) {
			if (destroyed || lost) return;
			const next = Number.isFinite(scale) ? Math.max(0.25, Math.min(1, scale)) : 1;
			if (next === renderScale) return;
			renderScale = next;
			// Rebuild the accumulation textures at the new scale (initTextures sees a
			// different aw/ah and swaps in fresh textures).
			if (canvas.width > 0 && canvas.height > 0) initTextures(canvas.width, canvas.height);
		}

		function frame(
			dt: number,
			instanceData: Float32Array<ArrayBuffer>,
			liveCount: number,
			uniforms: FrameUniforms
		) {
			if (destroyed || lost || !accum) return;
			exposure = clampExposure(uniforms.exposure);
			const sdr = hdrOutput ? 0 : 1;
			const count = Math.max(0, Math.min(liveCount, instanceCapacity));

			// Upload live instances (float count must be a multiple of 4 for
			// writeBuffer; INSTANCE_FLOATS=8 keeps that true).
			if (count > 0) {
				device.queue.writeBuffer(instanceBuffer, 0, instanceData, 0, count * INSTANCE_FLOATS);
			}

			// Decay uniform: per-frame multiplicative fade.
			scratch4.fill(0);
			scratch4[0] = Math.exp(-TRAIL_FADE_RATE * Math.max(0, dt));
			device.queue.writeBuffer(decayU, 0, scratch4);

			// Particle uniform: aspect + SDR flags.
			scratch4.fill(0);
			scratch4[0] = canvas.width / Math.max(1, canvas.height);
			scratch4[1] = sdr;
			scratch4[2] = 1.4; // SDR_CORE_SCALE
			device.queue.writeBuffer(particleU, 0, scratch4);

			// Display uniform.
			scratch4.fill(0);
			scratch4[0] = exposure;
			scratch4[1] = sdr;
			scratch4[2] = 0.8; // SDR_KNEE_START
			scratch4[3] = 0.12; // SDR_SAT_BOOST
			device.queue.writeBuffer(displayU, 0, scratch4);

			const encoder = device.createCommandEncoder();

			// (a) decay: accum.read → accum.write. Pick the precomputed bind group
			// whose bound texture is the current read view (reference compare — the
			// swap only reassigns roles, never the view identities).
			const readIsA = accum.readView === accumViewA;
			const decayBindGroup = readIsA ? bgDecayA! : bgDecayB!;
			runFullscreen(encoder, decayPipeline, decayBindGroup, accum.writeView, "clear");

			// (b) particles: additive into accum.write, preserving the decayed copy.
			if (count > 0) {
				const pass = encoder.beginRenderPass({
					colorAttachments: [{ view: accum.writeView, loadOp: "load", storeOp: "store" }],
				});
				pass.setPipeline(particlePipeline);
				pass.setBindGroup(0, particleBindGroup);
				pass.setVertexBuffer(0, instanceBuffer);
				pass.draw(4, count);
				pass.end();
			}

			// The freshly-written buffer becomes the read buffer for display and for
			// next frame's decay. After the swap the read view has flipped, so the
			// display bind group is the OTHER orientation.
			accum.swap();
			const displayBindGroup = readIsA ? bgDisplayB! : bgDisplayA!;

			// (c) display: accum.read → canvas.
			runFullscreen(
				encoder,
				displayPipeline,
				displayBindGroup,
				context.getCurrentTexture().createView(),
				"clear"
			);

			device.queue.submit([encoder.finish()]);
		}

		function runFullscreen(
			encoder: GPUCommandEncoder,
			pipeline: GPURenderPipeline,
			bindGroup: GPUBindGroup,
			target: GPUTextureView,
			loadOp: GPULoadOp
		) {
			const pass = encoder.beginRenderPass({
				colorAttachments: [
					{ view: target, loadOp, storeOp: "store", clearValue: { r: 0, g: 0, b: 0, a: 0 } },
				],
			});
			pass.setPipeline(pipeline);
			pass.setBindGroup(0, bindGroup);
			pass.draw(3);
			pass.end();
		}

		const renderLevel: FireworksRenderLevel = hdrOutput ? "webgpu-hdr" : "webgpu-sdr";

		// Prime the drawing buffer + accumulation textures at the current size.
		{
			const w = scaleByPixelRatio(canvas.clientWidth) || 1;
			const h = scaleByPixelRatio(canvas.clientHeight) || 1;
			canvas.width = w;
			canvas.height = h;
			initTextures(w, h);
		}

		return {
			frame,
			resizeIfNeeded,
			setRenderScale,
			extendedToneMapping,
			renderLevel,
			get lost() {
				return lost;
			},
			instanceCapacity,
			destroy() {
				destroyed = true;
				accum?.read.destroy();
				accum?.write.destroy();
				device.destroy();
			},
		};
	} catch (error) {
		if (import.meta.env.DEV) {
			console.warn("[FireworksHdr] WebGPU init failed:", error);
		}
		return null;
	}
}

function clampExposure(v: number): number {
	if (!Number.isFinite(v)) return 1;
	return Math.max(1, Math.min(4, v));
}

// STRETCH is re-exported for callers that build instance data by hand; the
// component uses the Sim's writeInstances which already bakes it in.
export { STRETCH };
