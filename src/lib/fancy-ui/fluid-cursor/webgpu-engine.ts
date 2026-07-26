/// <reference types="@webgpu/types" />
// WebGPU HDR engine for FluidCursor.
//
// Port of the WebGL fluid simulation to WGSL, rendering into an
// `rgba16float` canvas configured with `colorSpace: "display-p3"` and
// `toneMapping: { mode: "extended" }`. On HDR displays, dye values pushed
// above 1.0 by the exposure boost render brighter than SDR white; on wide
// gamut (P3) displays colors are noticeably more saturated. Browsers that
// ignore the `toneMapping` member simply clamp to SDR — the sim still runs.
//
// The math mirrors the GLSL shaders in FluidCursor.svelte pass for pass
// (splat, curl, vorticity, divergence, clear, pressure Jacobi iterations,
// gradient subtract, advection, display). Any behavioral change here must be
// mirrored in the WebGL path and vice versa.

import {
	type ColorRGB,
	type Pointer,
	type FluidCursorHandle,
	type FluidRenderLevel,
	pointerPrototype,
	correctDeltaX,
	correctDeltaY,
	correctRadius,
	getSimResolution,
	scaleRadiusForContainer,
} from "./fluid-shared.js";

export interface WebGpuFluidOptions {
	simResolution: number;
	dyeResolution: number;
	densityDissipation: number;
	velocityDissipation: number;
	pressure: number;
	pressureIterations: number;
	curl: number;
	splatRadius: number;
	splatForce: number;
	shading: boolean;
	colorUpdateSpeed: number;
	/** Display exposure multiplier — values above 1 create the HDR glow. */
	exposure: number;
	contained: boolean;
	interactive: boolean;
	autoSplat: boolean;
	autoSplatInterval: number;
	pauseWhenHidden: boolean;
	splatOnMount: boolean;
	generateColor: () => ColorRGB;
}

const WGSL = /* wgsl */ `
struct Uniforms {
	texelSize: vec2f,
	point: vec2f,
	color: vec4f,
	dt: f32,
	dissipation: f32,
	curlStrength: f32,
	clearValue: f32,
	aspect: f32,
	radius: f32,
	exposure: f32,
	shading: f32,
}

@group(0) @binding(0) var<uniform> u: Uniforms;
@group(0) @binding(1) var smpLinear: sampler;
@group(0) @binding(2) var smpNearest: sampler;
@group(0) @binding(3) var tex0: texture_2d<f32>;
@group(0) @binding(4) var tex1: texture_2d<f32>;

struct VSOut {
	@builtin(position) pos: vec4f,
	@location(0) uv: vec2f,
}

@vertex
fn vs(@builtin(vertex_index) i: u32) -> VSOut {
	// Fullscreen triangle.
	var p = array<vec2f, 3>(vec2f(-1.0, -3.0), vec2f(-1.0, 1.0), vec2f(3.0, 1.0));
	var out: VSOut;
	out.pos = vec4f(p[i], 0.0, 1.0);
	// Negated y so uv row order matches texture row order (WebGPU NDC +Y is
	// up but texture v=0 is the top row) — without it every pass mirrors its
	// input vertically. Pointer texcoords use the same top-origin convention.
	out.uv = vec2f(p[i].x, -p[i].y) * 0.5 + 0.5;
	return out;
}

@fragment
fn fs_copy(in: VSOut) -> @location(0) vec4f {
	return textureSample(tex0, smpLinear, in.uv);
}

@fragment
fn fs_splat(in: VSOut) -> @location(0) vec4f {
	var p = in.uv - u.point;
	p.x = p.x * u.aspect;
	let splat = exp(-dot(p, p) / u.radius) * u.color.rgb;
	let base = textureSample(tex0, smpLinear, in.uv).rgb;
	return vec4f(base + splat, 1.0);
}

@fragment
fn fs_curl(in: VSOut) -> @location(0) vec4f {
	let vL = in.uv - vec2f(u.texelSize.x, 0.0);
	let vR = in.uv + vec2f(u.texelSize.x, 0.0);
	let vT = in.uv + vec2f(0.0, u.texelSize.y);
	let vB = in.uv - vec2f(0.0, u.texelSize.y);
	let L = textureSample(tex0, smpLinear, vL).y;
	let R = textureSample(tex0, smpLinear, vR).y;
	let T = textureSample(tex0, smpLinear, vT).x;
	let B = textureSample(tex0, smpLinear, vB).x;
	let vorticity = R - L - T + B;
	return vec4f(0.5 * vorticity, 0.0, 0.0, 1.0);
}

@fragment
fn fs_vorticity(in: VSOut) -> @location(0) vec4f {
	let vL = in.uv - vec2f(u.texelSize.x, 0.0);
	let vR = in.uv + vec2f(u.texelSize.x, 0.0);
	let vT = in.uv + vec2f(0.0, u.texelSize.y);
	let vB = in.uv - vec2f(0.0, u.texelSize.y);
	let L = textureSample(tex1, smpNearest, vL).x;
	let R = textureSample(tex1, smpNearest, vR).x;
	let T = textureSample(tex1, smpNearest, vT).x;
	let B = textureSample(tex1, smpNearest, vB).x;
	let C = textureSample(tex1, smpNearest, in.uv).x;

	var force = 0.5 * vec2f(abs(T) - abs(B), abs(R) - abs(L));
	force = force / (length(force) + 0.0001);
	force = force * u.curlStrength * C;
	force.y = force.y * -1.0;

	var velocity = textureSample(tex0, smpLinear, in.uv).xy;
	velocity = velocity + force * u.dt;
	velocity = clamp(velocity, vec2f(-1000.0), vec2f(1000.0));
	return vec4f(velocity, 0.0, 1.0);
}

@fragment
fn fs_divergence(in: VSOut) -> @location(0) vec4f {
	let vL = in.uv - vec2f(u.texelSize.x, 0.0);
	let vR = in.uv + vec2f(u.texelSize.x, 0.0);
	let vT = in.uv + vec2f(0.0, u.texelSize.y);
	let vB = in.uv - vec2f(0.0, u.texelSize.y);
	var L = textureSample(tex0, smpLinear, vL).x;
	var R = textureSample(tex0, smpLinear, vR).x;
	var T = textureSample(tex0, smpLinear, vT).y;
	var B = textureSample(tex0, smpLinear, vB).y;

	let C = textureSample(tex0, smpLinear, in.uv).xy;
	if (vL.x < 0.0) { L = -C.x; }
	if (vR.x > 1.0) { R = -C.x; }
	if (vT.y > 1.0) { T = -C.y; }
	if (vB.y < 0.0) { B = -C.y; }

	let div = 0.5 * (R - L + T - B);
	return vec4f(div, 0.0, 0.0, 1.0);
}

@fragment
fn fs_clear(in: VSOut) -> @location(0) vec4f {
	return u.clearValue * textureSample(tex0, smpNearest, in.uv);
}

@fragment
fn fs_pressure(in: VSOut) -> @location(0) vec4f {
	let vL = in.uv - vec2f(u.texelSize.x, 0.0);
	let vR = in.uv + vec2f(u.texelSize.x, 0.0);
	let vT = in.uv + vec2f(0.0, u.texelSize.y);
	let vB = in.uv - vec2f(0.0, u.texelSize.y);
	let L = textureSample(tex0, smpNearest, vL).x;
	let R = textureSample(tex0, smpNearest, vR).x;
	let T = textureSample(tex0, smpNearest, vT).x;
	let B = textureSample(tex0, smpNearest, vB).x;
	let divergence = textureSample(tex1, smpNearest, in.uv).x;
	let pressure = (L + R + B + T - divergence) * 0.25;
	return vec4f(pressure, 0.0, 0.0, 1.0);
}

@fragment
fn fs_gradient(in: VSOut) -> @location(0) vec4f {
	let vL = in.uv - vec2f(u.texelSize.x, 0.0);
	let vR = in.uv + vec2f(u.texelSize.x, 0.0);
	let vT = in.uv + vec2f(0.0, u.texelSize.y);
	let vB = in.uv - vec2f(0.0, u.texelSize.y);
	let L = textureSample(tex0, smpNearest, vL).x;
	let R = textureSample(tex0, smpNearest, vR).x;
	let T = textureSample(tex0, smpNearest, vT).x;
	let B = textureSample(tex0, smpNearest, vB).x;
	var velocity = textureSample(tex1, smpLinear, in.uv).xy;
	velocity = velocity - vec2f(R - L, T - B);
	return vec4f(velocity, 0.0, 1.0);
}

@fragment
fn fs_advection(in: VSOut) -> @location(0) vec4f {
	let coord = in.uv - u.dt * textureSample(tex0, smpLinear, in.uv).xy * u.texelSize;
	let result = textureSample(tex1, smpLinear, coord);
	let decay = 1.0 + u.dissipation * u.dt;
	return result / decay;
}

@fragment
fn fs_display(in: VSOut) -> @location(0) vec4f {
	var c = textureSample(tex0, smpLinear, in.uv).rgb;

	// Neighbor samples are taken unconditionally and mixed by the shading
	// flag so texture sampling stays in uniform control flow.
	let vL = in.uv - vec2f(u.texelSize.x, 0.0);
	let vR = in.uv + vec2f(u.texelSize.x, 0.0);
	let vT = in.uv + vec2f(0.0, u.texelSize.y);
	let vB = in.uv - vec2f(0.0, u.texelSize.y);
	let lc = textureSample(tex0, smpLinear, vL).rgb;
	let rc = textureSample(tex0, smpLinear, vR).rgb;
	let tc = textureSample(tex0, smpLinear, vT).rgb;
	let bc = textureSample(tex0, smpLinear, vB).rgb;
	let dx = length(rc) - length(lc);
	let dy = length(tc) - length(bc);
	let n = normalize(vec3f(dx, dy, length(u.texelSize)));
	let l = vec3f(0.0, 0.0, 1.0);
	let diffuse = clamp(dot(n, l) + 0.7, 0.7, 1.0);
	c = c * mix(1.0, diffuse, u.shading);

	// The canvas color space keeps the sRGB transfer function even with a
	// float16 format (it only adds range/precision), so values are written
	// as-is like the WebGL path — no gamma conversion. The exposure boost
	// pushes encoded values above 1.0, which extended tone mapping renders
	// brighter than SDR white. Alpha stays clamped for premultiplied
	// compositing; color intentionally exceeds it for the HDR glow.
	let a = min(max(c.r, max(c.g, c.b)), 1.0);
	let boosted = max(c, vec3f(0.0)) * u.exposure;
	return vec4f(boosted, a);
}
`;

// Float offsets inside the 64-byte Uniforms struct.
const U_FLOATS = 16;
const OFF_TEXEL = 0;
const OFF_POINT = 2;
const OFF_COLOR = 4;
const OFF_DT = 8;
const OFF_DISSIPATION = 9;
const OFF_CURL = 10;
const OFF_CLEAR = 11;
const OFF_ASPECT = 12;
const OFF_RADIUS = 13;
const OFF_EXPOSURE = 14;
const OFF_SHADING = 15;

interface UniformValues {
	texelSize?: [number, number];
	point?: [number, number];
	color?: [number, number, number];
	dt?: number;
	dissipation?: number;
	curlStrength?: number;
	clearValue?: number;
	aspect?: number;
	radius?: number;
	exposure?: number;
	shading?: number;
}

interface DoubleTex {
	read: GPUTexture;
	write: GPUTexture;
	readView: GPUTextureView;
	writeView: GPUTextureView;
	width: number;
	height: number;
	texelSizeX: number;
	texelSizeY: number;
	swap: () => void;
}

interface FluidEngine {
	splat: (x: number, y: number, dx: number, dy: number, color: ColorRGB) => void;
	resizeIfNeeded: () => void;
	frame: (dt: number) => void;
	readonly lost: boolean;
	/** Whether the browser actually applied extended tone mapping (true HDR). */
	readonly extendedToneMapping: boolean;
	destroy: () => void;
}

function scaleByPixelRatio(input: number) {
	const pixelRatio = window.devicePixelRatio || 1;
	return Math.floor(input * pixelRatio);
}

async function createWebGpuFluid(
	canvas: HTMLCanvasElement,
	opts: WebGpuFluidOptions
): Promise<FluidEngine | null> {
	try {
		const gpu = navigator.gpu;
		if (!gpu) return null;
		const adapter = await gpu.requestAdapter();
		if (!adapter) return null;
		const device = await adapter.requestDevice();

		const format: GPUTextureFormat = "rgba16float";
		// `toneMapping` and `colorSpace` are ignored by browsers that do not
		// support them yet (WebIDL drops unknown dictionary members), in which
		// case output is clamped to SDR.
		const configuration = {
			device,
			format,
			alphaMode: "premultiplied",
			colorSpace: "display-p3",
			toneMapping: { mode: "extended" },
		} as GPUCanvasConfiguration;

		// Probe the configuration on a detached canvas first. Once a canvas
		// has vended a "webgpu" context it can never provide a WebGL one, so
		// claiming the visible canvas before knowing configure() succeeds
		// would break the advertised WebGL fallback.
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
				console.warn("[FluidCursor] WebGPU canvas configuration rejected:", error);
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

		// Browsers that do not support toneMapping drop the member, which
		// getConfiguration() makes observable. Surface it as data (not just a
		// DEV log) so callers can tell true HDR from a clamped fallback.
		let extendedToneMapping = false;
		try {
			const applied = context.getConfiguration?.() as
				| (GPUCanvasConfiguration & { toneMapping?: { mode?: string } })
				| null;
			extendedToneMapping = applied?.toneMapping?.mode === "extended";
		} catch {
			// getConfiguration unsupported (e.g. Safari): assume clamped output.
		}
		if (import.meta.env.DEV) {
			console.info(
				extendedToneMapping
					? "[FluidCursor] HDR level: webgpu-hdr (extended tone mapping active)"
					: "[FluidCursor] HDR level: webgpu-sdr (float16 + P3, tone mapping clamped by browser)"
			);
		}

		let destroyed = false;
		let lost = false;
		device.lost.then((info) => {
			lost = true;
			if (!destroyed && import.meta.env.DEV) {
				console.warn(`[FluidCursor] WebGPU device lost (${info.reason}): ${info.message}`);
			}
		});
		if (import.meta.env.DEV) {
			device.addEventListener("uncapturederror", (event) => {
				console.error(
					"[FluidCursor] WebGPU uncaptured error:",
					(event as GPUUncapturedErrorEvent).error.message
				);
			});
		}

		const module = device.createShaderModule({ code: WGSL });

		const bindGroupLayout = device.createBindGroupLayout({
			entries: [
				{ binding: 0, visibility: GPUShaderStage.FRAGMENT, buffer: { type: "uniform" } },
				{ binding: 1, visibility: GPUShaderStage.FRAGMENT, sampler: { type: "filtering" } },
				{ binding: 2, visibility: GPUShaderStage.FRAGMENT, sampler: { type: "filtering" } },
				{ binding: 3, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: "float" } },
				{ binding: 4, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: "float" } },
			],
		});
		const pipelineLayout = device.createPipelineLayout({ bindGroupLayouts: [bindGroupLayout] });

		function makePipeline(entryPoint: string, targetFormat: GPUTextureFormat) {
			return device.createRenderPipeline({
				layout: pipelineLayout,
				vertex: { module, entryPoint: "vs" },
				fragment: { module, entryPoint, targets: [{ format: targetFormat }] },
				primitive: { topology: "triangle-list" },
			});
		}

		const VEL_FORMAT: GPUTextureFormat = "rg16float";
		const SCALAR_FORMAT: GPUTextureFormat = "r16float";
		const DYE_FORMAT: GPUTextureFormat = "rgba16float";

		const pipelines = {
			splatVel: makePipeline("fs_splat", VEL_FORMAT),
			splatDye: makePipeline("fs_splat", DYE_FORMAT),
			curl: makePipeline("fs_curl", SCALAR_FORMAT),
			vorticity: makePipeline("fs_vorticity", VEL_FORMAT),
			divergence: makePipeline("fs_divergence", SCALAR_FORMAT),
			clear: makePipeline("fs_clear", SCALAR_FORMAT),
			pressure: makePipeline("fs_pressure", SCALAR_FORMAT),
			gradient: makePipeline("fs_gradient", VEL_FORMAT),
			advectVel: makePipeline("fs_advection", VEL_FORMAT),
			advectDye: makePipeline("fs_advection", DYE_FORMAT),
			display: makePipeline("fs_display", format),
			copyVel: makePipeline("fs_copy", VEL_FORMAT),
			copyDye: makePipeline("fs_copy", DYE_FORMAT),
		};

		const smpLinear = device.createSampler({
			magFilter: "linear",
			minFilter: "linear",
			addressModeU: "clamp-to-edge",
			addressModeV: "clamp-to-edge",
		});
		const smpNearest = device.createSampler({
			magFilter: "nearest",
			minFilter: "nearest",
			addressModeU: "clamp-to-edge",
			addressModeV: "clamp-to-edge",
		});

		function makeUniformBuffer() {
			return device.createBuffer({
				size: U_FLOATS * 4,
				usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
			});
		}

		const uSplatVel = makeUniformBuffer();
		const uSplatDye = makeUniformBuffer();
		const uCurl = makeUniformBuffer();
		const uVorticity = makeUniformBuffer();
		const uDivergence = makeUniformBuffer();
		const uClear = makeUniformBuffer();
		const uPressure = makeUniformBuffer();
		const uGradient = makeUniformBuffer();
		const uAdvectVel = makeUniformBuffer();
		const uAdvectDye = makeUniformBuffer();
		const uDisplay = makeUniformBuffer();
		const uCopy = makeUniformBuffer();

		const scratch = new Float32Array(U_FLOATS);
		function writeUniforms(buffer: GPUBuffer, v: UniformValues) {
			scratch.fill(0);
			if (v.texelSize) {
				scratch[OFF_TEXEL] = v.texelSize[0];
				scratch[OFF_TEXEL + 1] = v.texelSize[1];
			}
			if (v.point) {
				scratch[OFF_POINT] = v.point[0];
				scratch[OFF_POINT + 1] = v.point[1];
			}
			if (v.color) {
				scratch[OFF_COLOR] = v.color[0];
				scratch[OFF_COLOR + 1] = v.color[1];
				scratch[OFF_COLOR + 2] = v.color[2];
				scratch[OFF_COLOR + 3] = 1;
			}
			scratch[OFF_DT] = v.dt ?? 0;
			scratch[OFF_DISSIPATION] = v.dissipation ?? 0;
			scratch[OFF_CURL] = v.curlStrength ?? 0;
			scratch[OFF_CLEAR] = v.clearValue ?? 0;
			scratch[OFF_ASPECT] = v.aspect ?? 1;
			scratch[OFF_RADIUS] = v.radius ?? 1;
			scratch[OFF_EXPOSURE] = v.exposure ?? 1;
			scratch[OFF_SHADING] = v.shading ?? 0;
			device.queue.writeBuffer(buffer, 0, scratch);
		}

		function makeTexture(w: number, h: number, texFormat: GPUTextureFormat) {
			return device.createTexture({
				size: { width: w, height: h },
				format: texFormat,
				usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
			});
		}

		function makeDoubleTex(w: number, h: number, texFormat: GPUTextureFormat): DoubleTex {
			const a = makeTexture(w, h, texFormat);
			const b = makeTexture(w, h, texFormat);
			const target: DoubleTex = {
				read: a,
				write: b,
				readView: a.createView(),
				writeView: b.createView(),
				width: w,
				height: h,
				texelSizeX: 1 / w,
				texelSizeY: 1 / h,
				swap() {
					const t = this.read;
					const tv = this.readView;
					this.read = this.write;
					this.readView = this.writeView;
					this.write = t;
					this.writeView = tv;
				},
			};
			return target;
		}

		// Bind groups are cached per (uniform buffer, texture views) combination
		// — the ping-pong swaps only cycle through a small finite set, and
		// recreating ~30 bind groups per frame (20 of them for the pressure
		// iterations) is measurable allocation/validation overhead. The cache
		// is cleared whenever textures are recreated (resize).
		const bindGroupCache = new Map<string, GPUBindGroup>();
		const resourceIds = new WeakMap<object, number>();
		let nextResourceId = 0;
		function idOf(resource: object): number {
			let id = resourceIds.get(resource);
			if (id === undefined) {
				id = nextResourceId++;
				resourceIds.set(resource, id);
			}
			return id;
		}
		function getBindGroup(uniforms: GPUBuffer, tex0: GPUTextureView, tex1: GPUTextureView) {
			const key = `${idOf(uniforms)}:${idOf(tex0)}:${idOf(tex1)}`;
			let bindGroup = bindGroupCache.get(key);
			if (!bindGroup) {
				bindGroup = device.createBindGroup({
					layout: bindGroupLayout,
					entries: [
						{ binding: 0, resource: { buffer: uniforms } },
						{ binding: 1, resource: smpLinear },
						{ binding: 2, resource: smpNearest },
						{ binding: 3, resource: tex0 },
						{ binding: 4, resource: tex1 },
					],
				});
				bindGroupCache.set(key, bindGroup);
			}
			return bindGroup;
		}

		function runPass(
			encoder: GPUCommandEncoder,
			pipeline: GPURenderPipeline,
			uniforms: GPUBuffer,
			tex0: GPUTextureView,
			tex1: GPUTextureView,
			target: GPUTextureView
		) {
			const bindGroup = getBindGroup(uniforms, tex0, tex1);
			const pass = encoder.beginRenderPass({
				colorAttachments: [
					{
						view: target,
						loadOp: "clear",
						storeOp: "store",
						clearValue: { r: 0, g: 0, b: 0, a: 0 },
					},
				],
			});
			pass.setPipeline(pipeline);
			pass.setBindGroup(0, bindGroup);
			pass.draw(3);
			pass.end();
		}

		// --- Simulation state ---
		let dye: DoubleTex | null = null;
		let velocity: DoubleTex | null = null;
		let pressureTex: DoubleTex | null = null;
		let divergenceTex: GPUTexture | null = null;
		let divergenceView: GPUTextureView | null = null;
		let curlTex: GPUTexture | null = null;
		let curlView: GPUTextureView | null = null;

		function initTextures() {
			const simRes = getSimResolution(opts.simResolution, canvas.width, canvas.height);
			const dyeRes = getSimResolution(opts.dyeResolution, canvas.width, canvas.height);

			const oldDye = dye;
			const oldVelocity = velocity;

			// Canvas resize that leaves grid sizes unchanged (aspect-preserving):
			// keep the existing textures (mirrors resizeDoubleFBO's early-out).
			if (
				oldDye &&
				oldVelocity &&
				oldDye.width === dyeRes.width &&
				oldDye.height === dyeRes.height &&
				oldVelocity.width === simRes.width &&
				oldVelocity.height === simRes.height
			) {
				return;
			}

			const newDye = makeDoubleTex(dyeRes.width, dyeRes.height, DYE_FORMAT);
			const newVelocity = makeDoubleTex(simRes.width, simRes.height, VEL_FORMAT);

			// Preserve existing fluid across resizes by resampling the old
			// read textures into the new ones (mirrors resizeDoubleFBO).
			if (oldDye && oldVelocity) {
				writeUniforms(uCopy, {});
				const encoder = device.createCommandEncoder();
				runPass(
					encoder,
					pipelines.copyDye,
					uCopy,
					oldDye.readView,
					oldDye.readView,
					newDye.readView
				);
				runPass(
					encoder,
					pipelines.copyVel,
					uCopy,
					oldVelocity.readView,
					oldVelocity.readView,
					newVelocity.readView
				);
				device.queue.submit([encoder.finish()]);
				oldDye.read.destroy();
				oldDye.write.destroy();
				oldVelocity.read.destroy();
				oldVelocity.write.destroy();
			}

			dye = newDye;
			velocity = newVelocity;

			// Cached bind groups reference the destroyed texture views.
			bindGroupCache.clear();

			pressureTex?.read.destroy();
			pressureTex?.write.destroy();
			divergenceTex?.destroy();
			curlTex?.destroy();
			pressureTex = makeDoubleTex(simRes.width, simRes.height, SCALAR_FORMAT);
			divergenceTex = makeTexture(simRes.width, simRes.height, SCALAR_FORMAT);
			divergenceView = divergenceTex.createView();
			curlTex = makeTexture(simRes.width, simRes.height, SCALAR_FORMAT);
			curlView = curlTex.createView();
		}

		function resizeIfNeeded() {
			if (destroyed || lost) return;
			const width = scaleByPixelRatio(canvas.clientWidth);
			const height = scaleByPixelRatio(canvas.clientHeight);
			if (width > 0 && height > 0 && (canvas.width !== width || canvas.height !== height)) {
				canvas.width = width;
				canvas.height = height;
				initTextures();
			}
		}

		function splat(x: number, y: number, dx: number, dy: number, color: ColorRGB) {
			if (destroyed || lost || !velocity || !dye) return;
			let radius = correctRadius(opts.splatRadius / 100, canvas.width, canvas.height);
			if (opts.contained) {
				radius = scaleRadiusForContainer(radius, canvas.clientHeight, window.innerHeight);
			}
			const aspect = canvas.width / canvas.height;

			writeUniforms(uSplatVel, {
				point: [x, y],
				color: [dx, dy, 0],
				aspect,
				radius,
			});
			writeUniforms(uSplatDye, {
				point: [x, y],
				color: [color.r, color.g, color.b],
				aspect,
				radius,
			});

			const encoder = device.createCommandEncoder();
			runPass(
				encoder,
				pipelines.splatVel,
				uSplatVel,
				velocity.readView,
				velocity.readView,
				velocity.writeView
			);
			velocity.swap();
			runPass(encoder, pipelines.splatDye, uSplatDye, dye.readView, dye.readView, dye.writeView);
			dye.swap();
			device.queue.submit([encoder.finish()]);
		}

		function frame(dt: number) {
			if (destroyed || lost || !velocity || !dye || !pressureTex || !divergenceView || !curlView) {
				return;
			}

			const velTexel: [number, number] = [velocity.texelSizeX, velocity.texelSizeY];
			writeUniforms(uCurl, { texelSize: velTexel });
			writeUniforms(uVorticity, { texelSize: velTexel, curlStrength: opts.curl, dt });
			writeUniforms(uDivergence, { texelSize: velTexel });
			writeUniforms(uClear, { clearValue: opts.pressure });
			writeUniforms(uPressure, { texelSize: velTexel });
			writeUniforms(uGradient, { texelSize: velTexel });
			writeUniforms(uAdvectVel, {
				texelSize: velTexel,
				dt,
				dissipation: opts.velocityDissipation,
			});
			writeUniforms(uAdvectDye, {
				texelSize: velTexel,
				dt,
				dissipation: opts.densityDissipation,
			});
			writeUniforms(uDisplay, {
				texelSize: [1 / canvas.width, 1 / canvas.height],
				exposure: opts.exposure,
				shading: opts.shading ? 1 : 0,
			});

			const encoder = device.createCommandEncoder();

			runPass(encoder, pipelines.curl, uCurl, velocity.readView, velocity.readView, curlView);

			runPass(
				encoder,
				pipelines.vorticity,
				uVorticity,
				velocity.readView,
				curlView,
				velocity.writeView
			);
			velocity.swap();

			runPass(
				encoder,
				pipelines.divergence,
				uDivergence,
				velocity.readView,
				velocity.readView,
				divergenceView
			);

			runPass(
				encoder,
				pipelines.clear,
				uClear,
				pressureTex.readView,
				pressureTex.readView,
				pressureTex.writeView
			);
			pressureTex.swap();

			for (let i = 0; i < opts.pressureIterations; i++) {
				runPass(
					encoder,
					pipelines.pressure,
					uPressure,
					pressureTex.readView,
					divergenceView,
					pressureTex.writeView
				);
				pressureTex.swap();
			}

			runPass(
				encoder,
				pipelines.gradient,
				uGradient,
				pressureTex.readView,
				velocity.readView,
				velocity.writeView
			);
			velocity.swap();

			runPass(
				encoder,
				pipelines.advectVel,
				uAdvectVel,
				velocity.readView,
				velocity.readView,
				velocity.writeView
			);
			velocity.swap();

			runPass(
				encoder,
				pipelines.advectDye,
				uAdvectDye,
				velocity.readView,
				dye.readView,
				dye.writeView
			);
			dye.swap();

			runPass(
				encoder,
				pipelines.display,
				uDisplay,
				dye.readView,
				dye.readView,
				context.getCurrentTexture().createView()
			);

			device.queue.submit([encoder.finish()]);
		}

		initTextures();

		return {
			splat,
			resizeIfNeeded,
			frame,
			get lost() {
				return lost;
			},
			extendedToneMapping,
			destroy() {
				destroyed = true;
				device.destroy();
			},
		};
	} catch (error) {
		if (import.meta.env.DEV) {
			console.warn("[FluidCursor] WebGPU init failed, falling back to WebGL:", error);
		}
		return null;
	}
}

/**
 * Full WebGPU setup for FluidCursor: engine + pointer wiring + rAF loop +
 * visibility pause + auto splats. Resolves with a {@link FluidCursorHandle}
 * (augmented with `cleanup`), or with `null` when WebGPU is unavailable
 * (caller falls back to the WebGL path).
 *
 * Handle coordinates are top-left origin in [0,1]; WebGPU texcoords already
 * use a top-origin convention, so no Y flip happens here (the WebGL path owns
 * its own flip).
 */
export async function startWebGpuFluid(
	canvas: HTMLCanvasElement,
	opts: WebGpuFluidOptions
): Promise<(FluidCursorHandle & { cleanup(): void }) | null> {
	const maybeEngine = await createWebGpuFluid(canvas, opts);
	if (!maybeEngine) return null;
	const engine: FluidEngine = maybeEngine;

	const pointers: Pointer[] = [pointerPrototype()];
	// Dedicated synthetic pointer driven programmatically through the handle. It
	// lives alongside the mouse pointer in the same list, so updateFrame splats
	// both and the two inputs coexist.
	const autopilotPointer = pointerPrototype();
	pointers.push(autopilotPointer);
	let penWasUp = true;

	let animationFrameId = 0;
	let lastUpdateTime = Date.now();
	let colorUpdateTimer = 0;
	let isVisible = true;
	let stopped = false;

	// --- Pointer position mapping (mirrors the WebGL path) ---
	let canvasRectCache: DOMRect | null = null;
	function updateCanvasRectCache() {
		if (opts.contained) canvasRectCache = canvas.getBoundingClientRect();
	}
	function getCanvasPos(clientX: number, clientY: number): { x: number; y: number } {
		if (opts.contained) {
			if (!canvasRectCache) updateCanvasRectCache();
			const rect = canvasRectCache!;
			return {
				x: scaleByPixelRatio(clientX - rect.left),
				y: scaleByPixelRatio(clientY - rect.top),
			};
		}
		return { x: scaleByPixelRatio(clientX), y: scaleByPixelRatio(clientY) };
	}

	function updatePointerDownData(pointer: Pointer, id: number, posX: number, posY: number) {
		pointer.id = id;
		pointer.down = true;
		pointer.moved = false;
		pointer.texcoordX = posX / canvas.width;
		pointer.texcoordY = posY / canvas.height;
		pointer.prevTexcoordX = pointer.texcoordX;
		pointer.prevTexcoordY = pointer.texcoordY;
		pointer.deltaX = 0;
		pointer.deltaY = 0;
		pointer.color = opts.generateColor();
	}

	function updatePointerMoveData(pointer: Pointer, posX: number, posY: number, color: ColorRGB) {
		pointer.prevTexcoordX = pointer.texcoordX;
		pointer.prevTexcoordY = pointer.texcoordY;
		pointer.texcoordX = posX / canvas.width;
		pointer.texcoordY = posY / canvas.height;
		pointer.deltaX = correctDeltaX(
			pointer.texcoordX - pointer.prevTexcoordX,
			canvas.width,
			canvas.height
		);
		pointer.deltaY = correctDeltaY(
			pointer.texcoordY - pointer.prevTexcoordY,
			canvas.width,
			canvas.height
		);
		pointer.moved = Math.abs(pointer.deltaX) > 0 || Math.abs(pointer.deltaY) > 0;
		pointer.color = color;
	}

	function splatPointer(pointer: Pointer) {
		const dx = pointer.deltaX * opts.splatForce;
		const dy = pointer.deltaY * opts.splatForce;
		engine.splat(pointer.texcoordX, pointer.texcoordY, dx, dy, pointer.color);
	}

	function clickSplat(pointer: Pointer) {
		const color = opts.generateColor();
		color.r *= 10;
		color.g *= 10;
		color.b *= 10;
		const dx = 10 * (Math.random() - 0.5);
		const dy = 30 * (Math.random() - 0.5);
		engine.splat(pointer.texcoordX, pointer.texcoordY, dx, dy, color);
	}

	function multipleSplats(steps: number) {
		// Simulate a cursor sweep along a random arc — each step on its own
		// frame so the velocity field has time to evolve between injections.
		const angle = Math.random() * Math.PI * 2;
		const cx = 0.25 + Math.random() * 0.5;
		const cy = 0.25 + Math.random() * 0.5;
		const arcSpan = Math.PI * (0.8 + Math.random() * 0.8);
		let i = 0;

		function step() {
			if (stopped || i >= steps) return;
			const t = i / Math.max(1, steps - 1);
			const a = angle + t * arcSpan;
			const r = 0.15 + 0.05 * Math.sin(t * Math.PI);
			const x = cx + Math.cos(a) * r;
			const y = cy + Math.sin(a) * r;
			const color = opts.generateColor();
			engine.splat(
				x,
				y,
				-Math.sin(a) * opts.splatForce * 0.5,
				Math.cos(a) * opts.splatForce * 0.5,
				color
			);
			i++;
			if (i < steps) requestAnimationFrame(step);
		}
		requestAnimationFrame(step);
	}

	// --- Frame loop (same ordering as the WebGL path: resize, colors,
	// inputs, then simulation step + render) ---
	function updateFrame() {
		if (stopped || !isVisible) return;
		// Device loss (GPU reset, driver update): stop the loop instead of
		// spinning on a dead device. The effect simply disappears.
		if (engine.lost) return;
		const now = Date.now();
		const dt = Math.min((now - lastUpdateTime) / 1000, 0.016666);
		lastUpdateTime = now;

		engine.resizeIfNeeded();

		colorUpdateTimer += dt * opts.colorUpdateSpeed;
		if (colorUpdateTimer >= 1) {
			colorUpdateTimer = colorUpdateTimer % 1;
			pointers.forEach((p) => {
				p.color = opts.generateColor();
			});
		}

		for (const p of pointers) {
			if (p.moved) {
				p.moved = false;
				splatPointer(p);
			}
		}

		engine.frame(dt);
		animationFrameId = requestAnimationFrame(updateFrame);
	}

	// --- Event listeners ---
	function handleMouseDown(e: MouseEvent) {
		const pointer = pointers[0];
		const { x: posX, y: posY } = getCanvasPos(e.clientX, e.clientY);
		updatePointerDownData(pointer, -1, posX, posY);
		clickSplat(pointer);
	}

	function handleFirstMouseMove(e: MouseEvent) {
		const pointer = pointers[0];
		const { x: posX, y: posY } = getCanvasPos(e.clientX, e.clientY);
		updatePointerMoveData(pointer, posX, posY, opts.generateColor());
		document.body.removeEventListener("mousemove", handleFirstMouseMove);
	}

	function handleMouseMove(e: MouseEvent) {
		const pointer = pointers[0];
		const { x: posX, y: posY } = getCanvasPos(e.clientX, e.clientY);
		updatePointerMoveData(pointer, posX, posY, pointer.color);
	}

	function handleFirstTouchStart(e: TouchEvent) {
		const touches = e.targetTouches;
		const pointer = pointers[0];
		for (let i = 0; i < touches.length; i++) {
			const { x: posX, y: posY } = getCanvasPos(touches[i].clientX, touches[i].clientY);
			updatePointerDownData(pointer, touches[i].identifier, posX, posY);
		}
		document.body.removeEventListener("touchstart", handleFirstTouchStart);
	}

	function handleTouchStart(e: TouchEvent) {
		const touches = e.targetTouches;
		const pointer = pointers[0];
		for (let i = 0; i < touches.length; i++) {
			const { x: posX, y: posY } = getCanvasPos(touches[i].clientX, touches[i].clientY);
			updatePointerDownData(pointer, touches[i].identifier, posX, posY);
		}
	}

	function handleTouchMove(e: TouchEvent) {
		const touches = e.targetTouches;
		const pointer = pointers[0];
		for (let i = 0; i < touches.length; i++) {
			const { x: posX, y: posY } = getCanvasPos(touches[i].clientX, touches[i].clientY);
			updatePointerMoveData(pointer, posX, posY, pointer.color);
		}
	}

	if (opts.contained) {
		window.addEventListener("resize", updateCanvasRectCache, { passive: true });
		window.addEventListener("scroll", updateCanvasRectCache, { passive: true });
		updateCanvasRectCache();
	}

	if (opts.interactive) {
		window.addEventListener("mousedown", handleMouseDown);
		document.body.addEventListener("mousemove", handleFirstMouseMove);
		window.addEventListener("mousemove", handleMouseMove);
		document.body.addEventListener("touchstart", handleFirstTouchStart);
		window.addEventListener("touchstart", handleTouchStart, false);
		window.addEventListener("touchmove", handleTouchMove, false);
	}

	let observer: IntersectionObserver | null = null;
	if (opts.pauseWhenHidden) {
		observer = new IntersectionObserver(
			([entry]) => {
				const wasVisible = isVisible;
				isVisible = entry.isIntersecting;
				if (isVisible && !wasVisible && !stopped) {
					lastUpdateTime = Date.now();
					animationFrameId = requestAnimationFrame(updateFrame);
				}
			},
			{ threshold: 0 }
		);
		observer.observe(canvas);
	}

	updateFrame();
	if (opts.splatOnMount) multipleSplats(Math.floor(Math.random() * 6) + 10);

	let autoSplatTimer: ReturnType<typeof setInterval> | null = null;
	if (opts.autoSplat) {
		autoSplatTimer = setInterval(() => {
			engine.splat(
				Math.random(),
				Math.random(),
				(Math.random() - 0.5) * 200,
				(Math.random() - 0.5) * 200,
				opts.generateColor()
			);
		}, opts.autoSplatInterval);
	}

	const renderLevel: FluidRenderLevel = engine.extendedToneMapping ? "webgpu-hdr" : "webgpu-sdr";

	return {
		/**
		 * x,y in [0,1], top-left origin. WebGPU texcoords are already top-origin,
		 * so the coordinates pass straight through.
		 */
		moveTo(x: number, y: number, color?: ColorRGB) {
			const posX = x * canvas.width;
			const posY = y * canvas.height;
			if (penWasUp) {
				// First move of a new stroke: reposition only (mirrors
				// updatePointerDownData) so the jump from the previous stroke's
				// end never draws a connecting streak.
				penWasUp = false;
				autopilotPointer.down = true;
				autopilotPointer.moved = false;
				autopilotPointer.texcoordX = posX / canvas.width;
				autopilotPointer.texcoordY = posY / canvas.height;
				autopilotPointer.prevTexcoordX = autopilotPointer.texcoordX;
				autopilotPointer.prevTexcoordY = autopilotPointer.texcoordY;
				autopilotPointer.deltaX = 0;
				autopilotPointer.deltaY = 0;
				autopilotPointer.color = color ?? autopilotPointer.color;
				return;
			}
			updatePointerMoveData(autopilotPointer, posX, posY, color ?? autopilotPointer.color);
		},
		penUp() {
			penWasUp = true;
			autopilotPointer.moved = false;
		},
		/** No Y flip on the WebGPU path. */
		burst(x: number, y: number, dx: number, dy: number, color: ColorRGB) {
			engine.splat(x, y, dx, dy, color);
		},
		renderLevel,
		cleanup() {
			stopped = true;
			cancelAnimationFrame(animationFrameId);
			if (observer) observer.disconnect();
			if (autoSplatTimer) clearInterval(autoSplatTimer);
			if (opts.interactive) {
				window.removeEventListener("mousedown", handleMouseDown);
				document.body.removeEventListener("mousemove", handleFirstMouseMove);
				window.removeEventListener("mousemove", handleMouseMove);
				document.body.removeEventListener("touchstart", handleFirstTouchStart);
				window.removeEventListener("touchstart", handleTouchStart);
				window.removeEventListener("touchmove", handleTouchMove);
			}
			if (opts.contained) {
				window.removeEventListener("resize", updateCanvasRectCache);
				window.removeEventListener("scroll", updateCanvasRectCache);
			}
			engine.destroy();
		},
	};
}
