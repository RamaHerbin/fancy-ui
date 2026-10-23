/// <reference types="@webgpu/types" />
/**
 * HDR light layer — framework-free, byte-identical in the Svelte, React and
 * Vue trees (see shared-cores.json).
 *
 * CSS, SVG and 2D-canvas colours stop at SDR white. A glow component that wants
 * real light lays a canvas over itself and calls {@link attachHdrLight}: on a
 * display that reports HDR, a WebGPU context configured with `rgba16float` +
 * `toneMapping: { mode: "extended" }` draws additive capsule lights whose
 * values may exceed 1.0 — brighter than SDR white. 1.0 is the SDR reference
 * white (~203 nits in BT.2408 terms); {@link HDR_PEAK} ≈ 1000 nits.
 *
 * The component only describes WHERE its light is, through a probe called
 * every frame; this module owns everything else: the GPU device (one per page,
 * shared by every layer), the canvas size, visibility, the frame loop, and the
 * `data-hdr` flag on the host while it runs. Off HDR displays, without WebGPU,
 * or on the server nothing is created and the component renders as before.
 *
 * No browser global is touched at import time.
 */

/** One light: a capsule from (x0, y0) to (x1, y1); a point when both ends meet. */
export interface HdrLightSpec {
	x0: number;
	y0: number;
	x1: number;
	y1: number;
	/** Gaussian core radius, CSS px. */
	radius: number;
	/** Exponential halo falloff, CSS px. */
	halo: number;
	/** Linear-light multiplier on the colour: 1 = SDR white level. */
	intensity: number;
	/**
	 * Any CSS colour the browser understands. Default: the layer's accent. Its
	 * alpha scales the light, so a mostly transparent glow stays a faint light.
	 */
	color?: string;
	/**
	 * The CSS `filter` the component draws its own colour through, mirrored so
	 * the light stays the colour the eye sees: `hue-rotate` in degrees, then
	 * `brightness`, then `saturate`, each as the CSS function takes it.
	 */
	hue?: number;
	brightness?: number;
	saturation?: number;
	/** Mix toward white at the core, 0..1. */
	white?: number;
}

export interface HdrProbeContext {
	/** The host's size, CSS px. Light coordinates are relative to its top-left. */
	width: number;
	height: number;
	/** `performance.now()` for this frame. */
	now: number;
	/** {@link HDR_PEAK}, handed over so probes need not import this module. */
	peak: number;
}

export type HdrProbe = (ctx: HdrProbeContext) => HdrLightSpec[];

export interface AttachHdrLightOptions {
	/** Element the light belongs to; measured, and flagged with `data-hdr`. */
	host: HTMLElement;
	/** Canvas laid over the host, extending `pad` px past it on every side. */
	canvas: HTMLCanvasElement;
	/** Where the light is, this frame. Called once per animation frame. */
	probe: HdrProbe;
	/** Margin, CSS px, the canvas extends past the host for the halo. Default 24. */
	pad?: number;
	/** Fallback colour for lights without one. Default: the canvas's computed `color`. */
	accent?: string;
}

/** SDR white ≈ 203 nits; 1000 nits / 203 ≈ 4.9. */
export const HDR_PEAK = 4.9;
export const HDR_PAD = 24;

const MAX_LIGHTS = 256;
const MAX_DPR = 2;
const FORMAT = "rgba16float" as GPUTextureFormat;
const FLOATS_PER_LIGHT = 12;

const WGSL = /* wgsl */ `
struct Frame {
	size: vec2f,
	pad: vec2f,
};
@group(0) @binding(0) var<uniform> frame: Frame;

struct Light {
	@location(0) seg: vec4f,    // x0, y0, x1, y1
	@location(1) look: vec4f,   // radius, halo, intensity, white
	@location(2) colour: vec4f, // linear rgb, unused
};

struct Out {
	@builtin(position) pos: vec4f,
	@location(0) p: vec2f,
	@location(1) seg: vec4f,
	@location(2) look: vec4f,
	@location(3) colour: vec4f,
};

@vertex
fn vs(@builtin(vertex_index) vi: u32, light: Light) -> Out {
	let corners = array<vec2f, 6>(
		vec2f(0.0, 0.0), vec2f(1.0, 0.0), vec2f(0.0, 1.0),
		vec2f(0.0, 1.0), vec2f(1.0, 0.0), vec2f(1.0, 1.0)
	);
	let a = light.seg.xy + frame.pad;
	let b = light.seg.zw + frame.pad;
	let reach = light.look.x * 2.0 + light.look.y * 6.0;
	let lo = min(a, b) - vec2f(reach);
	let hi = max(a, b) + vec2f(reach);
	let p = mix(lo, hi, corners[vi]);
	var out: Out;
	out.pos = vec4f(p.x / frame.size.x * 2.0 - 1.0, 1.0 - p.y / frame.size.y * 2.0, 0.0, 1.0);
	out.p = p;
	out.seg = vec4f(a, b);
	out.look = light.look;
	out.colour = light.colour;
	return out;
}

@fragment
fn fs(in: Out) -> @location(0) vec4f {
	let a = in.seg.xy;
	let b = in.seg.zw;
	let ab = b - a;
	let t = clamp(dot(in.p - a, ab) / max(dot(ab, ab), 1e-4), 0.0, 1.0);
	let d = length(in.p - (a + ab * t));
	let r = max(in.look.x, 1e-3);
	let core = exp(-(d * d) / (r * r));
	let halo = exp(-d / max(in.look.y, 1e-3)) * 0.35;
	let v = (core + halo) * in.look.z;
	let colour = mix(in.colour.rgb, vec3f(1.0), in.look.w * core);
	// Premultiplied and nearly additive: the light adds to the page below.
	return vec4f(colour * v, clamp(v * 0.06, 0.0, 1.0));
}
`;

function srgbToLinear(s: number): number {
	return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

function clamp01(v: number): number {
	return v < 0 ? 0 : v > 1 ? 1 : v;
}

/** sRGB channels and alpha, each 0..1. */
export type CssRgba = [number, number, number, number];

const colourCache = new Map<string, CssRgba>();
let colourCtx: CanvasRenderingContext2D | null = null;

/** Resolves any CSS colour to sRGB channels + alpha (cached). Null on the server. */
export function cssColor(css: string): CssRgba | null {
	const hit = colourCache.get(css);
	if (hit) return hit;
	if (typeof document === "undefined") return null;
	if (!colourCtx) {
		colourCtx = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
	}
	if (!colourCtx) return null;
	colourCtx.clearRect(0, 0, 1, 1);
	colourCtx.fillStyle = "#000";
	colourCtx.fillStyle = css;
	colourCtx.fillRect(0, 0, 1, 1);
	const px = colourCtx.getImageData(0, 0, 1, 1).data;
	const out: CssRgba = [
		(px[0] ?? 0) / 255,
		(px[1] ?? 0) / 255,
		(px[2] ?? 0) / 255,
		(px[3] ?? 0) / 255,
	];
	colourCache.set(css, out);
	return out;
}

const CONTEXTUAL_COLOUR = /var\(|currentcolor/i;

/**
 * Resolves a colour that depends on where it is used — `var(--brand)`,
 * `currentColor` — through `el`'s computed style, the way the component's own
 * CSS resolves it; a detached canvas cannot. Other colours come back as given.
 */
export function contextColor(el: Element, css: string): string {
	if (!CONTEXTUAL_COLOUR.test(css)) return css;
	const style = (el as HTMLElement).style as CSSStyleDeclaration | undefined;
	if (!style) return css;
	const prev = style.getPropertyValue("color");
	const priority = style.getPropertyPriority("color");
	style.setProperty("color", css);
	const out = getComputedStyle(el).color;
	if (prev) style.setProperty("color", prev, priority);
	else style.removeProperty("color");
	return out || css;
}

/**
 * The light's linear-light RGB: the colour pushed through the same
 * `hue-rotate() brightness() saturate()` the component's CSS applies — the
 * matrices of the CSS filter functions on sRGB, each step clamped as the
 * browser clamps it — then linearised for the shader.
 */
function lightColor(c: CssRgba, l: HdrLightSpec): [number, number, number] {
	let r = c[0];
	let g = c[1];
	let b = c[2];
	if (l.hue) {
		const a = (l.hue * Math.PI) / 180;
		const cos = Math.cos(a);
		const sin = Math.sin(a);
		const r2 =
			(0.213 + cos * 0.787 - sin * 0.213) * r +
			(0.715 - cos * 0.715 - sin * 0.715) * g +
			(0.072 - cos * 0.072 + sin * 0.928) * b;
		const g2 =
			(0.213 - cos * 0.213 + sin * 0.143) * r +
			(0.715 + cos * 0.285 + sin * 0.14) * g +
			(0.072 - cos * 0.072 - sin * 0.283) * b;
		const b2 =
			(0.213 - cos * 0.213 - sin * 0.787) * r +
			(0.715 - cos * 0.715 + sin * 0.715) * g +
			(0.072 + cos * 0.928 + sin * 0.072) * b;
		r = clamp01(r2);
		g = clamp01(g2);
		b = clamp01(b2);
	}
	if (l.brightness !== undefined && l.brightness !== 1) {
		r = clamp01(r * l.brightness);
		g = clamp01(g * l.brightness);
		b = clamp01(b * l.brightness);
	}
	if (l.saturation !== undefined && l.saturation !== 1) {
		const s = l.saturation;
		const r2 = (0.213 + 0.787 * s) * r + (0.715 - 0.715 * s) * g + (0.072 - 0.072 * s) * b;
		const g2 = (0.213 - 0.213 * s) * r + (0.715 + 0.285 * s) * g + (0.072 - 0.072 * s) * b;
		const b2 = (0.213 - 0.213 * s) * r + (0.715 - 0.715 * s) * g + (0.072 + 0.928 * s) * b;
		r = clamp01(r2);
		g = clamp01(g2);
		b = clamp01(b2);
	}
	return [srgbToLinear(r), srgbToLinear(g), srgbToLinear(b)];
}

/**
 * Cheap, synchronous check a component can make after mount to decide whether
 * to render its light canvas at all: WebGPU is exposed and the display reports
 * HDR. False on the server. `attachHdrLight` still confirms extended tone
 * mapping before drawing anything.
 */
export function hdrLightAvailable(): boolean {
	return typeof navigator !== "undefined" && "gpu" in navigator && hdrDisplay();
}

/**
 * {@link hdrLightAvailable}, kept current: calls `onChange` now and again
 * whenever the window moves between an SDR and an HDR display. Returns the
 * unsubscribe function. A no-op (reporting false once) on the server.
 */
export function watchHdrLight(onChange: (available: boolean) => void): () => void {
	onChange(hdrLightAvailable());
	if (typeof window === "undefined" || typeof window.matchMedia !== "function") return () => {};
	const range = window.matchMedia(HDR_QUERY);
	const update = (): void => onChange(hdrLightAvailable());
	range.addEventListener?.("change", update);
	return () => range.removeEventListener?.("change", update);
}

// ---------------------------------------------------------------------------
// One device for the page
// ---------------------------------------------------------------------------

interface SharedGpu {
	device: GPUDevice;
	pipeline: GPURenderPipeline;
	module: GPUShaderModule;
}

let shared: Promise<SharedGpu | null> | null = null;

const HDR_QUERY = "(dynamic-range: high)";

function hdrDisplay(): boolean {
	return (
		typeof window !== "undefined" &&
		typeof window.matchMedia === "function" &&
		window.matchMedia(HDR_QUERY).matches
	);
}

function getShared(): Promise<SharedGpu | null> {
	if (shared) return shared;
	shared = (async () => {
		try {
			const gpu = (navigator as Navigator & { gpu?: GPU }).gpu;
			if (!gpu) return null;
			const adapter = await gpu.requestAdapter();
			if (!adapter) return null;
			const device = await adapter.requestDevice();
			const module = device.createShaderModule({ code: WGSL });
			const pipeline = device.createRenderPipeline({
				layout: "auto",
				vertex: {
					module,
					entryPoint: "vs",
					buffers: [
						{
							arrayStride: FLOATS_PER_LIGHT * 4,
							stepMode: "instance",
							attributes: [
								{ shaderLocation: 0, offset: 0, format: "float32x4" },
								{ shaderLocation: 1, offset: 16, format: "float32x4" },
								{ shaderLocation: 2, offset: 32, format: "float32x4" },
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
							// Max, not add: a polyline of capsules (an arc, a trail) overlaps
							// at every joint, and adding would light each joint twice.
							blend: {
								color: { srcFactor: "one", dstFactor: "one", operation: "max" },
								alpha: { srcFactor: "one", dstFactor: "one", operation: "max" },
							},
						},
					],
				},
				primitive: { topology: "triangle-list" },
			});
			// A lost device is forgotten, so the next layer asks for a new one.
			void device.lost.then(() => {
				shared = null;
			});
			return { device, pipeline, module };
		} catch {
			return null;
		}
	})();
	return shared;
}

// ---------------------------------------------------------------------------
// One layer
// ---------------------------------------------------------------------------

/**
 * Starts the HDR light for one component. Returns a detach function; call it on
 * unmount. Safe to call anywhere: it resolves to a no-op off HDR displays, on
 * the server, and without WebGPU. The layer follows the display — it lights up
 * when the window reaches an HDR monitor and goes dark when it leaves one —
 * and comes back on a fresh device after GPU loss.
 */
export function attachHdrLight(options: AttachHdrLightOptions): () => void {
	const { host, canvas, probe } = options;
	const pad = options.pad ?? HDR_PAD;
	let detached = false;
	let live = false;
	// Bumped by every start and halt: a device that resolves, or is lost, after
	// the layer was halted finds another value and does nothing.
	let session = 0;
	let stop: (() => void) | null = null;

	if (typeof window === "undefined") return () => {};

	function halt(): void {
		session++;
		live = false;
		stop?.();
		stop = null;
	}

	function start(): void {
		if (detached || live) return;
		live = true;
		const mine = ++session;
		void getShared().then((gpu) => {
			if (!gpu || mine !== session) return;
			const { device, pipeline } = gpu;
			let context: GPUCanvasContext | null = null;
			try {
				context = canvas.getContext("webgpu");
				if (!context) return;
				context.configure({
					device,
					format: FORMAT,
					alphaMode: "premultiplied",
					colorSpace: "display-p3",
					toneMapping: { mode: "extended" },
				} as GPUCanvasConfiguration);
				const applied = context.getConfiguration?.() as
					| (GPUCanvasConfiguration & { toneMapping?: { mode?: string } })
					| null;
				if (applied?.toneMapping?.mode !== "extended") {
					context.unconfigure();
					return;
				}
			} catch {
				return;
			}
			const ctx = context;

			const uniform = device.createBuffer({
				size: 16,
				usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
			});
			const instances = device.createBuffer({
				size: MAX_LIGHTS * FLOATS_PER_LIGHT * 4,
				usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
			});
			const bindGroup = device.createBindGroup({
				layout: pipeline.getBindGroupLayout(0),
				entries: [{ binding: 0, resource: { buffer: uniform } }],
			});
			const data = new Float32Array(MAX_LIGHTS * FLOATS_PER_LIGHT);
			const fallback: CssRgba = cssColor(
				options.accent ? contextColor(canvas, options.accent) : getComputedStyle(canvas).color
			) ?? [1, 1, 1, 1];

			// Context colours resolve through the canvas, which inherits the
			// component's styles; once per frame, so a theme switch follows.
			const resolved = new Map<string, string>();
			function frameColor(css: string): string {
				let out = resolved.get(css);
				if (out === undefined) {
					out = contextColor(canvas, css);
					resolved.set(css, out);
				}
				return out;
			}

			let width = 0;
			let height = 0;
			function size(): void {
				width = host.offsetWidth;
				height = host.offsetHeight;
				const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
				const cw = width + pad * 2;
				const ch = height + pad * 2;
				canvas.width = Math.max(1, Math.round(cw * dpr));
				canvas.height = Math.max(1, Math.round(ch * dpr));
				device.queue.writeBuffer(uniform, 0, new Float32Array([cw, ch, pad, pad]));
			}
			size();

			let visible = true;
			let frame = 0;
			let drewEmpty = false;

			function draw(now: number): void {
				let lights: HdrLightSpec[];
				try {
					lights = probe({ width, height, now, peak: HDR_PEAK });
				} catch {
					lights = [];
				}
				const n = Math.min(lights.length, MAX_LIGHTS);
				if (n === 0 && drewEmpty) return;
				drewEmpty = n === 0;
				resolved.clear();
				for (let i = 0; i < n; i++) {
					const l = lights[i];
					if (!l) continue;
					const c = (l.color ? cssColor(frameColor(l.color)) : null) ?? fallback;
					const rgb = lightColor(c, l);
					data.set(
						[
							l.x0,
							l.y0,
							l.x1,
							l.y1,
							l.radius,
							l.halo,
							l.intensity * c[3],
							l.white ?? 0,
							rgb[0],
							rgb[1],
							rgb[2],
							0,
						],
						i * FLOATS_PER_LIGHT
					);
				}
				if (n) device.queue.writeBuffer(instances, 0, data, 0, n * FLOATS_PER_LIGHT);
				const encoder = device.createCommandEncoder();
				const pass = encoder.beginRenderPass({
					colorAttachments: [
						{
							view: ctx.getCurrentTexture().createView(),
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
			}

			function loop(): void {
				frame = 0;
				if (detached || !visible) return;
				draw(performance.now());
				frame = requestAnimationFrame(loop);
			}

			const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(() => size()) : null;
			ro?.observe(host);
			const io =
				typeof IntersectionObserver !== "undefined"
					? new IntersectionObserver(([entry]) => {
							visible = entry?.isIntersecting ?? true;
							if (visible && !frame) frame = requestAnimationFrame(loop);
						})
					: null;
			io?.observe(host);

			host.setAttribute("data-hdr", "");
			frame = requestAnimationFrame(loop);

			stop = () => {
				if (frame) cancelAnimationFrame(frame);
				frame = 0;
				ro?.disconnect();
				io?.disconnect();
				host.removeAttribute("data-hdr");
				try {
					ctx.unconfigure();
				} catch {
					// already gone
				}
				uniform.destroy();
				instances.destroy();
			};

			// The GPU went away (reset, suspend, driver update): this layer's device
			// and pipeline are dead, so drop them and ask again — `getShared` has
			// already forgotten the lost device and will request a new one.
			void device.lost.then(() => {
				if (mine !== session) return;
				halt();
				start();
			});
		});
	}

	// Follow the display rather than freeze the answer at mount: a window
	// dragged onto an HDR monitor lights up, one dragged back to SDR goes dark
	// and releases its GPU resources.
	const range = typeof window.matchMedia === "function" ? window.matchMedia(HDR_QUERY) : null;
	const onRange = (e: MediaQueryListEvent): void => (e.matches ? start() : halt());
	range?.addEventListener?.("change", onRange);
	if (range?.matches) start();

	return () => {
		detached = true;
		range?.removeEventListener?.("change", onRange);
		halt();
	};
}
