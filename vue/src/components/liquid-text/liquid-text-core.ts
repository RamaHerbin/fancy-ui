/**
 * liquid-text-core — framework-free engine for the LiquidText component.
 *
 * Velocity-only WebGL fluid sim that warps a rasterized text texture:
 * DoubleFBO ping-pong, blit-driven fullscreen passes, Jacobi viscous
 * diffusion + Jacobi pressure projection, screen-px splat falloff and a
 * chromatic-offset display composite. See README.md for the full pass order.
 *
 * Laws honoured here: zero framework imports, zero alias imports, and no
 * module-scope window/document/navigator access — every DOM touch happens
 * inside `createLiquidText`/`measureLiquidText`, so this module stays safe to
 * import during SSR.
 */

// ===========================================================================
// Public types
// ===========================================================================

/** DOM handles the engine drives. */
export interface LiquidTextElements {
	/** Layout host: measured for the sim's CSS size and for pointer UVs. */
	host: HTMLElement;
	/** The canvas the sim composites into. */
	canvas: HTMLCanvasElement;
}

/** Resolved text metrics the engine derives and reports back to its wrapper. */
export interface LiquidTextMetrics {
	/** The font-family actually used (prop value, or the host's computed one). */
	font: string;
	/** The font size in px actually used (prop value, or the auto-fitted one). */
	fontSize: number;
}

/**
 * Props consumed only at engine creation. Everything the Svelte wrapper reads
 * live after mount lives in {@link LiquidTextLiveOptions} instead.
 */
export interface LiquidTextInitOptions {
	/**
	 * Called whenever the engine (re)resolves the font family / font size —
	 * on `resize()` and on any font-affecting `setOptions` — so the wrapper can
	 * mirror them into the DOM fallback markup and the host's height.
	 */
	onMetrics?: (metrics: LiquidTextMetrics) => void;
	/**
	 * Called after a real GPU context loss has torn the sim down. The engine is
	 * inert from that point on; the wrapper should drop to its static fallback.
	 */
	onContextLost?: () => void;
}

/**
 * Props the Svelte wrapper reacts to after mount. Every one of these is read
 * live by the running sim today (the pass closures read the reactive `$props()`
 * getters at call time), so all of them are live here too.
 */
export interface LiquidTextLiveOptions {
	/** Text rasterized into the fluid texture. */
	text: string;
	/** CSS font-family. Empty string resolves to getComputedStyle(host).fontFamily. */
	font: string;
	/** Font size in px. 0 auto-fits the text to the host's width. */
	fontSize: number;
	/** CSS font-weight for the rasterized text. */
	fontWeight: number | string;
	/** Resolved text color (the wrapper picks light/dark). */
	textColor: string;
	/** Geometric UV warp gain — how far the velocity field displaces the text's UVs. */
	strength: number;
	/** Splat radius in screen pixels around the pointer. */
	radius: number;
	/** Multiplier from mouse-delta-per-frame to splat force. */
	forceGain: number;
	/** Per-frame velocity decay factor. */
	dissipation: number;
	/** Viscous diffusion strength (Jacobi iteration). */
	viscosity: number;
	/** Chromatic offset = warp amount x this ratio. */
	chromaticRatio: number;
	/** Whether the fluid sim reacts to pointer movement. */
	interactive: boolean;
	/** Pause the render loop via visibilitychange when the tab/page is hidden. */
	pauseWhenHidden: boolean;
}

export interface LiquidTextEngine {
	/** Applies live prop changes. Font/color keys re-measure and/or re-rasterize. */
	setOptions(next: Partial<LiquidTextLiveOptions>): void;
	/** Re-measures the host, resizes the canvas + sim buffers, re-rasterizes. */
	resize(): void;
	/** Idempotent: cancels the rAF loop and frees every listener/GL resource. */
	destroy(): void;
}

// ===========================================================================
// Pure WebGL helpers (stateless — take `gl` as a parameter). Structurally
// modeled on the FluidCursor pass pipeline (DoubleFBO ping-pong, blit-driven
// fullscreen passes, Jacobi iteration), rewritten from scratch for a
// text-displacement sim: velocity-only field (no dye buffer), an added
// viscous-diffusion pass, and a screen-px splat falloff instead of a
// gaussian one. See README.md for the full pass order.
// ===========================================================================

type GL = WebGLRenderingContext | WebGL2RenderingContext;

interface Fbo {
	texture: WebGLTexture;
	framebuffer: WebGLFramebuffer;
	width: number;
	height: number;
	texelSizeX: number;
	texelSizeY: number;
	attach: (unit: number) => number;
}

interface DoubleFbo {
	width: number;
	height: number;
	texelSizeX: number;
	texelSizeY: number;
	read: Fbo;
	write: Fbo;
	swap: () => void;
}

interface TexFormat {
	internalFormat: number;
	format: number;
}

interface GlExt {
	isWebGL2: boolean;
	halfFloatTexType: number;
	supportLinearFiltering: boolean;
	velocityFormat: TexFormat;
	scalarFormat: TexFormat;
}

function compileShader(gl: GL, type: number, source: string): WebGLShader {
	const shader = gl.createShader(type);
	if (!shader) throw new Error("LiquidText: unable to create shader");
	gl.shaderSource(shader, source);
	gl.compileShader(shader);
	if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
		const info = gl.getShaderInfoLog(shader) ?? "unknown error";
		gl.deleteShader(shader);
		throw new Error(`LiquidText: shader compile failed: ${info}`);
	}
	return shader;
}

function linkProgram(gl: GL, vertexShader: WebGLShader, fragmentShader: WebGLShader): WebGLProgram {
	const program = gl.createProgram();
	if (!program) throw new Error("LiquidText: unable to create program");
	gl.attachShader(program, vertexShader);
	gl.attachShader(program, fragmentShader);
	gl.linkProgram(program);
	if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
		const info = gl.getProgramInfoLog(program) ?? "unknown error";
		gl.deleteProgram(program);
		throw new Error(`LiquidText: program link failed: ${info}`);
	}
	return program;
}

function uniformLocations(gl: GL, program: WebGLProgram): Map<string, WebGLUniformLocation> {
	const map = new Map<string, WebGLUniformLocation>();
	const count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS) as number;
	for (let i = 0; i < count; i++) {
		const info = gl.getActiveUniform(program, i);
		if (!info) continue;
		const loc = gl.getUniformLocation(program, info.name);
		if (loc) map.set(info.name, loc);
	}
	return map;
}

class GlProgram {
	readonly program: WebGLProgram;
	readonly uniforms: Map<string, WebGLUniformLocation>;
	private readonly gl: GL;

	constructor(gl: GL, vertexShader: WebGLShader, fragmentSource: string) {
		this.gl = gl;
		const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
		this.program = linkProgram(gl, vertexShader, fragmentShader);
		gl.deleteShader(fragmentShader);
		this.uniforms = uniformLocations(gl, this.program);
	}

	use() {
		this.gl.useProgram(this.program);
	}

	set1f(name: string, value: number) {
		const loc = this.uniforms.get(name);
		if (loc) this.gl.uniform1f(loc, value);
	}

	set2f(name: string, x: number, y: number) {
		const loc = this.uniforms.get(name);
		if (loc) this.gl.uniform2f(loc, x, y);
	}

	set1i(name: string, value: number) {
		const loc = this.uniforms.get(name);
		if (loc) this.gl.uniform1i(loc, value);
	}

	dispose() {
		this.gl.deleteProgram(this.program);
	}
}

function createFbo(
	gl: GL,
	width: number,
	height: number,
	fmt: TexFormat,
	type: number,
	filter: number
): Fbo {
	gl.activeTexture(gl.TEXTURE0);
	const texture = gl.createTexture();
	if (!texture) throw new Error("LiquidText: unable to allocate texture");
	gl.bindTexture(gl.TEXTURE_2D, texture);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	gl.texImage2D(gl.TEXTURE_2D, 0, fmt.internalFormat, width, height, 0, fmt.format, type, null);

	const framebuffer = gl.createFramebuffer();
	if (!framebuffer) throw new Error("LiquidText: unable to allocate framebuffer");
	gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
	gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
	gl.viewport(0, 0, width, height);
	gl.clearColor(0, 0, 0, 0);
	gl.clear(gl.COLOR_BUFFER_BIT);

	return {
		texture,
		framebuffer,
		width,
		height,
		texelSizeX: 1 / width,
		texelSizeY: 1 / height,
		attach: (unit: number) => {
			gl.activeTexture(gl.TEXTURE0 + unit);
			gl.bindTexture(gl.TEXTURE_2D, texture);
			return unit;
		},
	};
}

function deleteFbo(gl: GL, fbo: Fbo | null | undefined) {
	if (!fbo) return;
	gl.deleteTexture(fbo.texture);
	gl.deleteFramebuffer(fbo.framebuffer);
}

function createDoubleFbo(
	gl: GL,
	width: number,
	height: number,
	fmt: TexFormat,
	type: number,
	filter: number
): DoubleFbo {
	let read = createFbo(gl, width, height, fmt, type, filter);
	let write = createFbo(gl, width, height, fmt, type, filter);
	return {
		width,
		height,
		texelSizeX: read.texelSizeX,
		texelSizeY: read.texelSizeY,
		get read() {
			return read;
		},
		get write() {
			return write;
		},
		swap() {
			const tmp = read;
			read = write;
			write = tmp;
		},
	};
}

function deleteDoubleFbo(gl: GL, dfbo: DoubleFbo | null | undefined) {
	if (!dfbo) return;
	deleteFbo(gl, dfbo.read);
	deleteFbo(gl, dfbo.write);
}

function textureRenderable(gl: GL, internalFormat: number, format: number, type: number): boolean {
	const texture = gl.createTexture();
	if (!texture) return false;
	gl.bindTexture(gl.TEXTURE_2D, texture);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, 4, 4, 0, format, type, null);

	const framebuffer = gl.createFramebuffer();
	let ok = false;
	if (framebuffer) {
		gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
		gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
		ok = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
		gl.deleteFramebuffer(framebuffer);
	}
	gl.deleteTexture(texture);
	return ok;
}

function resolveFormat(
	gl: GL,
	isWebGL2: boolean,
	kind: "velocity" | "scalar",
	type: number
): TexFormat | null {
	if (!isWebGL2) {
		return textureRenderable(gl, gl.RGBA, gl.RGBA, type)
			? { internalFormat: gl.RGBA, format: gl.RGBA }
			: null;
	}
	const gl2 = gl as WebGL2RenderingContext;
	const candidates: TexFormat[] =
		kind === "velocity"
			? [
					{ internalFormat: gl2.RG16F, format: gl2.RG },
					{ internalFormat: gl2.RGBA16F, format: gl2.RGBA },
				]
			: [
					{ internalFormat: gl2.R16F, format: gl2.RED },
					{ internalFormat: gl2.RG16F, format: gl2.RG },
					{ internalFormat: gl2.RGBA16F, format: gl2.RGBA },
				];
	for (const candidate of candidates) {
		if (textureRenderable(gl, candidate.internalFormat, candidate.format, type)) return candidate;
	}
	return null;
}

function acquireGL(canvas: HTMLCanvasElement): { gl: GL; ext: GlExt } | null {
	const attrs: WebGLContextAttributes = {
		alpha: true,
		depth: false,
		stencil: false,
		antialias: false,
		preserveDrawingBuffer: false,
	};

	let gl: GL | null = canvas.getContext("webgl2", attrs) as WebGL2RenderingContext | null;
	let isWebGL2 = !!gl;
	if (!gl) {
		gl = (canvas.getContext("webgl", attrs) ??
			canvas.getContext("experimental-webgl", attrs)) as WebGLRenderingContext | null;
		isWebGL2 = false;
	}
	if (!gl) return null;

	let halfFloatTexType: number;
	let supportLinearFiltering: boolean;

	if (isWebGL2) {
		const gl2 = gl as WebGL2RenderingContext;
		gl2.getExtension("EXT_color_buffer_float");
		// This component only ever allocates HALF_FLOAT (RG16F/R16F/RGBA16F)
		// textures, and 16-bit float textures are always texture-filterable
		// in core WebGL2 — OES_texture_float_linear only gates 32-bit FLOAT
		// textures, which never get allocated here. Gating on that
		// extension made the velocity FBO fall back to NEAREST (and the
		// 0.25x sim field get upsampled blocky by the display shader) on
		// the many GPUs/ANGLE backends that expose half-float without
		// float-linear.
		supportLinearFiltering = true;
		halfFloatTexType = gl2.HALF_FLOAT;
	} else {
		// Some WebGL1 drivers require this to make a half-float texture
		// usable as an FBO color attachment; without it, textureRenderable
		// below fails every candidate and the component drops to the
		// static fallback even though the sim could have run.
		gl.getExtension("EXT_color_buffer_half_float");
		const halfFloat = gl.getExtension("OES_texture_half_float");
		supportLinearFiltering = !!gl.getExtension("OES_texture_half_float_linear");
		halfFloatTexType = halfFloat ? halfFloat.HALF_FLOAT_OES : 0;
	}

	const velocityFormat = resolveFormat(gl, isWebGL2, "velocity", halfFloatTexType);
	const scalarFormat = resolveFormat(gl, isWebGL2, "scalar", halfFloatTexType);
	if (!velocityFormat || !scalarFormat) return null;

	return {
		gl,
		ext: { isWebGL2, halfFloatTexType, supportLinearFiltering, velocityFormat, scalarFormat },
	};
}

function createBlit(gl: GL) {
	const vertexBuffer = gl.createBuffer();
	const indexBuffer = gl.createBuffer();
	if (!vertexBuffer || !indexBuffer)
		throw new Error("LiquidText: unable to allocate geometry buffers");

	gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, -1, 1, 1, 1, 1, -1]), gl.STATIC_DRAW);
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0, 1, 2, 0, 2, 3]), gl.STATIC_DRAW);
	gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
	gl.enableVertexAttribArray(0);

	function blit(target: Fbo | null) {
		if (target) {
			gl.bindFramebuffer(gl.FRAMEBUFFER, target.framebuffer);
			gl.viewport(0, 0, target.width, target.height);
		} else {
			gl.bindFramebuffer(gl.FRAMEBUFFER, null);
			gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
		}
		gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
	}

	function dispose() {
		gl.deleteBuffer(vertexBuffer);
		gl.deleteBuffer(indexBuffer);
	}

	return { blit, dispose };
}

// ===========================================================================
// Shader sources
// ===========================================================================

const VERTEX_SHADER = `
		precision highp float;
		attribute vec2 aPos;
		varying vec2 vUv;
		varying vec2 vL;
		varying vec2 vR;
		varying vec2 vT;
		varying vec2 vB;
		uniform vec2 texelSize;

		void main () {
			vUv = aPos * 0.5 + 0.5;
			vL = vUv - vec2(texelSize.x, 0.0);
			vR = vUv + vec2(texelSize.x, 0.0);
			vT = vUv + vec2(0.0, texelSize.y);
			vB = vUv - vec2(0.0, texelSize.y);
			gl_Position = vec4(aPos, 0.0, 1.0);
		}
	`;

const COPY_SHADER = `
		precision mediump float;
		precision mediump sampler2D;
		varying vec2 vUv;
		uniform sampler2D uTexture;
		void main () {
			gl_FragColor = texture2D(uTexture, vUv);
		}
	`;

// Self-advects the velocity field along its own flow, then applies the
// per-frame dissipation decay (a plain multiplicative decay — not a
// dt-scaled rate — so `dissipation` reads directly as "fraction of
// velocity kept per frame").
const ADVECTION_SHADER = `
		precision highp float;
		precision highp sampler2D;
		varying vec2 vUv;
		uniform sampler2D uVelocity;
		uniform float dt;
		uniform float dissipation;

		void main () {
			vec2 back = vUv - dt * texture2D(uVelocity, vUv).xy;
			vec2 advected = texture2D(uVelocity, back).xy;
			gl_FragColor = vec4(clamp(advected * dissipation, -4.0, 4.0), 0.0, 1.0);
		}
	`;

// Injects pointer force at `point` (UV) with a screen-px radius falloff:
// (1 - clamp(dist/radius, 0, 1))^2 * 1.5, dist measured in real screen px
// via `resolution` (the container's CSS size), independent of the sim's
// own (lower) texel resolution.
const SPLAT_SHADER = `
		precision highp float;
		precision highp sampler2D;
		varying vec2 vUv;
		uniform sampler2D uVelocity;
		uniform vec2 point;
		uniform vec2 resolution;
		uniform float radius;
		uniform vec2 force;

		void main () {
			vec2 diffPx = (vUv - point) * resolution;
			float dist = length(diffPx);
			float t = clamp(1.0 - dist / max(radius, 1.0), 0.0, 1.0);
			float falloff = t * t * 1.5;
			vec2 base = texture2D(uVelocity, vUv).xy;
			gl_FragColor = vec4(clamp(base + force * falloff, -4.0, 4.0), 0.0, 1.0);
		}
	`;

// One Jacobi iteration of implicit viscous diffusion:
// x_new = (x0 + alpha*(xL+xR+xT+xB)) / (1 + 4*alpha), alpha = viscosity*dt.
// `uSource` is the fixed pre-diffusion snapshot (x0); `uVelocity` is the
// current iterate, ping-ponged across 8 calls.
const DIFFUSE_SHADER = `
		precision highp float;
		precision highp sampler2D;
		varying vec2 vUv;
		varying vec2 vL;
		varying vec2 vR;
		varying vec2 vT;
		varying vec2 vB;
		uniform sampler2D uVelocity;
		uniform sampler2D uSource;
		uniform float alpha;

		void main () {
			vec2 xL = texture2D(uVelocity, vL).xy;
			vec2 xR = texture2D(uVelocity, vR).xy;
			vec2 xT = texture2D(uVelocity, vT).xy;
			vec2 xB = texture2D(uVelocity, vB).xy;
			vec2 x0 = texture2D(uSource, vUv).xy;
			float beta = 1.0 + 4.0 * alpha;
			vec2 result = (x0 + alpha * (xL + xR + xT + xB)) / beta;
			gl_FragColor = vec4(clamp(result, -4.0, 4.0), 0.0, 1.0);
		}
	`;

const DIVERGENCE_SHADER = `
		precision highp float;
		precision highp sampler2D;
		varying vec2 vUv;
		varying vec2 vL;
		varying vec2 vR;
		varying vec2 vT;
		varying vec2 vB;
		uniform sampler2D uVelocity;

		void main () {
			float L = texture2D(uVelocity, vL).x;
			float R = texture2D(uVelocity, vR).x;
			float T = texture2D(uVelocity, vT).y;
			float B = texture2D(uVelocity, vB).y;
			vec2 C = texture2D(uVelocity, vUv).xy;
			if (vL.x < 0.0) L = -C.x;
			if (vR.x > 1.0) R = -C.x;
			if (vT.y > 1.0) T = -C.y;
			if (vB.y < 0.0) B = -C.y;
			float div = 0.5 * (R - L + T - B);
			gl_FragColor = vec4(div, 0.0, 0.0, 1.0);
		}
	`;

const PRESSURE_SHADER = `
		precision highp float;
		precision highp sampler2D;
		varying vec2 vUv;
		varying vec2 vL;
		varying vec2 vR;
		varying vec2 vT;
		varying vec2 vB;
		uniform sampler2D uPressure;
		uniform sampler2D uDivergence;

		void main () {
			float L = texture2D(uPressure, vL).x;
			float R = texture2D(uPressure, vR).x;
			float T = texture2D(uPressure, vT).x;
			float B = texture2D(uPressure, vB).x;
			float div = texture2D(uDivergence, vUv).x;
			float p = (L + R + T + B - div) * 0.25;
			gl_FragColor = vec4(p, 0.0, 0.0, 1.0);
		}
	`;

const GRADIENT_SUBTRACT_SHADER = `
		precision highp float;
		precision highp sampler2D;
		varying vec2 vUv;
		varying vec2 vL;
		varying vec2 vR;
		varying vec2 vT;
		varying vec2 vB;
		uniform sampler2D uPressure;
		uniform sampler2D uVelocity;

		void main () {
			float L = texture2D(uPressure, vL).x;
			float R = texture2D(uPressure, vR).x;
			float T = texture2D(uPressure, vT).x;
			float B = texture2D(uPressure, vB).x;
			vec2 vel = texture2D(uVelocity, vUv).xy;
			vel -= 0.5 * vec2(R - L, T - B);
			gl_FragColor = vec4(clamp(vel, -4.0, 4.0), 0.0, 1.0);
		}
	`;

// Final composite: warps the rasterized-text UV by the velocity field and
// takes 3 independently-offset taps (R/G/B) for the chromatic-aberration
// fringe. Alpha is the max of the 3 taps' alpha so the fringe itself is
// visible over the transparent background rather than being clipped to the
// unwarped glyph silhouette.
const DISPLAY_SHADER = `
		precision highp float;
		precision highp sampler2D;
		varying vec2 vUv;
		uniform sampler2D uText;
		uniform sampler2D uVelocity;
		uniform float strength;
		uniform float chromaticRatio;

		void main () {
			vec2 vel = texture2D(uVelocity, vUv).xy;
			vec2 warp = vel * strength;
			vec2 chroma = warp * chromaticRatio;
			vec2 base = vUv - warp;
			vec4 rTap = texture2D(uText, base - chroma);
			vec4 gTap = texture2D(uText, base);
			vec4 bTap = texture2D(uText, base + chroma);
			vec3 color = vec3(rTap.r, gTap.g, bTap.b);
			float a = max(rTap.a, max(gTap.a, bTap.a));
			gl_FragColor = vec4(color, a);
		}
	`;

/** Fixed simulation timestep, in seconds (the loop is not dt-scaled). */
export const FIXED_DT = 0.016;
/** Jacobi iterations of the viscous-diffusion pass. */
export const DIFFUSE_ITERATIONS = 8;
/** Jacobi iterations of the pressure-projection pass. */
export const PRESSURE_ITERATIONS = 16;
/** Sim-field resolution as a fraction of the canvas's device-pixel size. */
export const SIM_SCALE = 0.25;
/** Font size used before the first successful auto-fit measurement. */
export const DEFAULT_DISPLAY_FONT_SIZE = 64;
/** Auto-fit reference size and clamp bounds. */
export const FIT_REFERENCE_SIZE = 100;
export const FIT_MIN_SIZE = 8;
export const FIT_MAX_SIZE = 2000;
/** The host's height is this multiple of the resolved font size. */
export const HEIGHT_RATIO = 1.2;

// ===========================================================================
// Text metrics
// ===========================================================================

/**
 * Resolves the font family (prop, else the host's computed family, else
 * `sans-serif`) and, when `fontSize` is 0, the auto-fitted size that makes the
 * text span the host's width.
 *
 * `fontSize` comes back `null` when no 2D measuring context is available; the
 * caller must then keep its previous size while still applying the family
 * (the resolved family is known even when measuring is impossible).
 */
export function measureLiquidText(
	host: HTMLElement,
	options: Pick<LiquidTextLiveOptions, "text" | "font" | "fontSize" | "fontWeight">
): { font: string; fontSize: number | null } {
	const family = options.font || getComputedStyle(host).fontFamily || "sans-serif";
	if (options.fontSize > 0) return { font: family, fontSize: options.fontSize };

	const containerWidth = host.clientWidth || 1;
	const probe = document.createElement("canvas").getContext("2d");
	if (!probe) return { font: family, fontSize: null };
	probe.font = `${options.fontWeight} ${FIT_REFERENCE_SIZE}px ${family}`;
	const measured = probe.measureText(options.text).width || 1;
	const fitted = FIT_REFERENCE_SIZE * (containerWidth / measured);
	return { font: family, fontSize: Math.min(Math.max(fitted, FIT_MIN_SIZE), FIT_MAX_SIZE) };
}

// ===========================================================================
// Engine
// ===========================================================================

const FONT_KEYS = ["text", "font", "fontSize", "fontWeight"] as const;

/**
 * Acquires a WebGL context and, if successful, boots the fluid sim + render
 * loop. Returns `null` when WebGL is unavailable or the GL setup fails — the
 * fail-quiet rule: the caller keeps its static DOM fallback.
 */
export function createLiquidText(
	el: LiquidTextElements,
	options: LiquidTextInitOptions & LiquidTextLiveOptions
): LiquidTextEngine | null {
	const { host, canvas } = el;
	const opts: LiquidTextLiveOptions = {
		text: options.text,
		font: options.font,
		fontSize: options.fontSize,
		fontWeight: options.fontWeight,
		textColor: options.textColor,
		strength: options.strength,
		radius: options.radius,
		forceGain: options.forceGain,
		dissipation: options.dissipation,
		viscosity: options.viscosity,
		chromaticRatio: options.chromaticRatio,
		interactive: options.interactive,
		pauseWhenHidden: options.pauseWhenHidden,
	};
	const onMetrics = options.onMetrics;
	const onContextLost = options.onContextLost;

	const acquired = acquireGL(canvas);
	if (!acquired) return null;

	const { gl, ext } = acquired;

	// Mirror of the wrapper's own seeds so the very first rasterize has the
	// same values the DOM fallback would have shown.
	let resolvedFont = opts.font;
	let displayFontSize = opts.fontSize > 0 ? opts.fontSize : DEFAULT_DISPLAY_FONT_SIZE;

	// Declared here (outside the try below) so both the success path and
	// the failure-recovery catch block can safely reference them — `let`/
	// `function` declared inside a `try { … }` are not visible from its
	// `catch { … }`, since try/catch are separate block scopes.
	let velocity: DoubleFbo | null = null;
	let divergenceFbo: Fbo | null = null;
	let pressure: DoubleFbo | null = null;
	let diffuseSource: Fbo | null = null;
	let textTexture: WebGLTexture | null = null;
	let textCanvas: HTMLCanvasElement | null = null;

	function destroySimBuffers() {
		deleteDoubleFbo(gl, velocity);
		deleteFbo(gl, divergenceFbo);
		deleteDoubleFbo(gl, pressure);
		deleteFbo(gl, diffuseSource);
		velocity = null;
		divergenceFbo = null;
		pressure = null;
		diffuseSource = null;
	}

	// Tracks GL resources as they're successfully allocated during this
	// synchronous setup pass, so a later failure (a program that fails to
	// compile/link, exhausted buffers, …) can free everything created
	// before it instead of stranding those objects on the canvas's
	// still-live GL context. Cleared once setup fully succeeds.
	const disposeOnFailure: Array<() => void> = [];

	try {
		const { blit, dispose: disposeGeometry } = createBlit(gl);
		disposeOnFailure.push(disposeGeometry);

		const vertexShader = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
		disposeOnFailure.push(() => gl.deleteShader(vertexShader));

		function makeProgram(fragmentSource: string): GlProgram {
			const program = new GlProgram(gl, vertexShader, fragmentSource);
			disposeOnFailure.push(() => program.dispose());
			return program;
		}

		const advectionProgram = makeProgram(ADVECTION_SHADER);
		const splatProgram = makeProgram(SPLAT_SHADER);
		const diffuseProgram = makeProgram(DIFFUSE_SHADER);
		const divergenceProgram = makeProgram(DIVERGENCE_SHADER);
		const pressureProgram = makeProgram(PRESSURE_SHADER);
		const gradientSubtractProgram = makeProgram(GRADIENT_SUBTRACT_SHADER);
		const copyProgram = makeProgram(COPY_SHADER);
		const displayProgram = makeProgram(DISPLAY_SHADER);
		gl.deleteShader(vertexShader);

		const filter = ext.supportLinearFiltering ? gl.LINEAR : gl.NEAREST;

		let cssWidth = 0;
		let cssHeight = 0;

		function createSimBuffers(simW: number, simH: number) {
			velocity = createDoubleFbo(gl, simW, simH, ext.velocityFormat, ext.halfFloatTexType, filter);
			divergenceFbo = createFbo(gl, simW, simH, ext.scalarFormat, ext.halfFloatTexType, gl.NEAREST);
			pressure = createDoubleFbo(
				gl,
				simW,
				simH,
				ext.scalarFormat,
				ext.halfFloatTexType,
				gl.NEAREST
			);
			diffuseSource = createFbo(gl, simW, simH, ext.velocityFormat, ext.halfFloatTexType, filter);
		}

		/**
		 * Re-resolves font family / size from the host and reports them out so
		 * the wrapper can mirror them into its fallback markup and host height.
		 * Mirrors the wrapper's own `fitFontSize()`: the family always applies,
		 * the size only when a measuring context existed.
		 */
		function fitFontSize() {
			const metrics = measureLiquidText(host, opts);
			resolvedFont = metrics.font;
			if (metrics.fontSize !== null) displayFontSize = metrics.fontSize;
			onMetrics?.({ font: resolvedFont, fontSize: displayFontSize });
		}

		function rasterizeText() {
			const dpr = window.devicePixelRatio || 1;
			const w = Math.max(1, Math.round(cssWidth * dpr));
			const h = Math.max(1, Math.round(cssHeight * dpr));
			if (!textCanvas) textCanvas = document.createElement("canvas");
			textCanvas.width = w;
			textCanvas.height = h;
			const ctx = textCanvas.getContext("2d");
			if (!ctx) return;
			ctx.clearRect(0, 0, w, h);
			ctx.font = `${opts.fontWeight} ${displayFontSize * dpr}px ${resolvedFont}`;
			ctx.fillStyle = opts.textColor;
			ctx.textAlign = "left";
			ctx.textBaseline = "middle";
			ctx.fillText(opts.text, 0, h / 2);

			if (!textTexture) textTexture = gl.createTexture();
			gl.bindTexture(gl.TEXTURE_2D, textTexture);
			gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, textCanvas);
			gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
		}

		function resizeAll() {
			fitFontSize();
			const dpr = window.devicePixelRatio || 1;
			cssWidth = host.clientWidth || 1;
			cssHeight = Math.round(displayFontSize * HEIGHT_RATIO) || 1;
			const pxW = Math.max(1, Math.round(cssWidth * dpr));
			const pxH = Math.max(1, Math.round(cssHeight * dpr));
			if (canvas.width !== pxW || canvas.height !== pxH) {
				canvas.width = pxW;
				canvas.height = pxH;
			}
			const simW = Math.max(1, Math.round(pxW * SIM_SCALE));
			const simH = Math.max(1, Math.round(pxH * SIM_SCALE));
			if (!velocity || velocity.width !== simW || velocity.height !== simH) {
				destroySimBuffers();
				createSimBuffers(simW, simH);
			}
			rasterizeText();
		}

		resizeAll();

		// --- pointer tracking (UV space, y=1 at top to match vUv) ---
		const pointerUV = { x: 0.5, y: 0.5 };
		const pointerPrevUV = { x: 0.5, y: 0.5 };
		const pointerForce = { x: 0, y: 0 };
		let pointerHasPrev = false;
		let pointerMoved = false;

		function onPointerMove(e: PointerEvent) {
			if (!opts.interactive) return;
			const rect = host.getBoundingClientRect();
			if (rect.width <= 0 || rect.height <= 0) return;
			const x = (e.clientX - rect.left) / rect.width;
			const y = 1 - (e.clientY - rect.top) / rect.height;
			if (pointerHasPrev) {
				pointerForce.x = (x - pointerPrevUV.x) * opts.forceGain;
				pointerForce.y = (y - pointerPrevUV.y) * opts.forceGain;
				pointerMoved = true;
			}
			pointerPrevUV.x = x;
			pointerPrevUV.y = y;
			pointerUV.x = x;
			pointerUV.y = y;
			pointerHasPrev = true;
		}

		// Always registered — `interactive` is read live inside
		// onPointerMove above, so toggling the prop after mount (e.g. a
		// Storybook/docs control) takes effect immediately instead of
		// only reflecting its value at initial setup.
		window.addEventListener("pointermove", onPointerMove, { passive: true });

		// --- visibility pause ---
		let hidden = document.hidden;
		function onVisibilityChange() {
			hidden = document.hidden;
		}
		// Always registered — `pauseWhenHidden` is read live in frame()
		// below, so toggling the prop after mount takes effect immediately
		// instead of only reflecting its value at initial setup.
		document.addEventListener("visibilitychange", onVisibilityChange);

		// --- sim passes ---
		function applySplat() {
			if (!pointerMoved || !velocity) return;
			pointerMoved = false;
			splatProgram.use();
			splatProgram.set2f("point", pointerUV.x, pointerUV.y);
			splatProgram.set2f("resolution", cssWidth, cssHeight);
			splatProgram.set1f("radius", opts.radius);
			splatProgram.set2f("force", pointerForce.x, pointerForce.y);
			splatProgram.set1i("uVelocity", velocity.read.attach(0));
			blit(velocity.write);
			velocity.swap();
		}

		function diffuseVelocity(dt: number) {
			if (!velocity || !diffuseSource) return;
			copyProgram.use();
			copyProgram.set1i("uTexture", velocity.read.attach(0));
			blit(diffuseSource);

			const alpha = opts.viscosity * dt;
			for (let i = 0; i < DIFFUSE_ITERATIONS; i++) {
				diffuseProgram.use();
				diffuseProgram.set2f("texelSize", velocity.texelSizeX, velocity.texelSizeY);
				diffuseProgram.set1i("uVelocity", velocity.read.attach(0));
				diffuseProgram.set1i("uSource", diffuseSource.attach(1));
				diffuseProgram.set1f("alpha", alpha);
				blit(velocity.write);
				velocity.swap();
			}
		}

		function clearFbo(fbo: Fbo) {
			gl.bindFramebuffer(gl.FRAMEBUFFER, fbo.framebuffer);
			gl.viewport(0, 0, fbo.width, fbo.height);
			gl.clearColor(0, 0, 0, 0);
			gl.clear(gl.COLOR_BUFFER_BIT);
		}

		function step(dt: number) {
			if (!velocity || !divergenceFbo || !pressure) return;
			gl.disable(gl.BLEND);

			advectionProgram.use();
			advectionProgram.set2f("texelSize", velocity.texelSizeX, velocity.texelSizeY);
			advectionProgram.set1i("uVelocity", velocity.read.attach(0));
			advectionProgram.set1f("dt", dt);
			advectionProgram.set1f("dissipation", opts.dissipation);
			blit(velocity.write);
			velocity.swap();

			applySplat();
			diffuseVelocity(dt);

			divergenceProgram.use();
			divergenceProgram.set2f("texelSize", velocity.texelSizeX, velocity.texelSizeY);
			divergenceProgram.set1i("uVelocity", velocity.read.attach(0));
			blit(divergenceFbo);

			clearFbo(pressure.write);
			pressure.swap();
			for (let i = 0; i < PRESSURE_ITERATIONS; i++) {
				pressureProgram.use();
				pressureProgram.set2f("texelSize", velocity.texelSizeX, velocity.texelSizeY);
				pressureProgram.set1i("uPressure", pressure.read.attach(0));
				pressureProgram.set1i("uDivergence", divergenceFbo.attach(1));
				blit(pressure.write);
				pressure.swap();
			}

			gradientSubtractProgram.use();
			gradientSubtractProgram.set2f("texelSize", velocity.texelSizeX, velocity.texelSizeY);
			gradientSubtractProgram.set1i("uPressure", pressure.read.attach(0));
			gradientSubtractProgram.set1i("uVelocity", velocity.read.attach(1));
			blit(velocity.write);
			velocity.swap();
		}

		function draw() {
			if (!velocity || !textTexture) return;
			gl.bindFramebuffer(gl.FRAMEBUFFER, null);
			gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
			gl.clearColor(0, 0, 0, 0);
			gl.clear(gl.COLOR_BUFFER_BIT);
			gl.enable(gl.BLEND);
			gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

			displayProgram.use();
			gl.activeTexture(gl.TEXTURE0);
			gl.bindTexture(gl.TEXTURE_2D, textTexture);
			displayProgram.set1i("uText", 0);
			displayProgram.set1i("uVelocity", velocity.read.attach(1));
			displayProgram.set1f("strength", opts.strength);
			displayProgram.set1f("chromaticRatio", opts.chromaticRatio);
			blit(null);
		}

		let rafId: number | null = requestAnimationFrame(frame);
		function frame() {
			rafId = requestAnimationFrame(frame);
			if (opts.pauseWhenHidden && hidden) return;
			step(FIXED_DT);
			draw();
		}

		// Tears down the running sim's listeners/GL resources. Shared by
		// the context-loss handler below (which must stop issuing calls
		// against a dead context) and the normal destroy() path. Guarded so
		// a destroy() after a context loss does not double-free.
		let tornDown = false;
		function teardownSim() {
			if (tornDown) return;
			tornDown = true;
			if (rafId !== null) {
				cancelAnimationFrame(rafId);
				rafId = null;
			}
			document.removeEventListener("visibilitychange", onVisibilityChange);
			window.removeEventListener("pointermove", onPointerMove);
			destroySimBuffers();
			if (textTexture) {
				gl.deleteTexture(textTexture);
				textTexture = null;
			}
			for (const p of [
				advectionProgram,
				splatProgram,
				diffuseProgram,
				divergenceProgram,
				pressureProgram,
				gradientSubtractProgram,
				copyProgram,
				displayProgram,
			]) {
				p.dispose();
			}
			disposeGeometry();
		}

		// A real GPU context loss (driver reset, GPU switch, too many live
		// contexts, …) must not leave the rAF loop silently issuing calls
		// against a dead context, and — without preventDefault() — the
		// context would never become eligible for restoration. Recovery
		// here is deliberately conservative: every GL object created
		// above is invalidated by the loss, so rather than rebuilding the
		// whole sim in place this hands the wrapper back to its stable
		// static DOM fallback for the remainder of this mount.
		function onContextLostEvent(event: Event) {
			event.preventDefault();
			teardownSim();
			onContextLost?.();
		}
		function onContextRestored() {
			// Intentionally inert — see onContextLostEvent above. The static
			// fallback stays in place rather than attempting a risky
			// partial rebuild of programs/geometry/FBOs in place.
		}
		canvas.addEventListener("webglcontextlost", onContextLostEvent, false);
		canvas.addEventListener("webglcontextrestored", onContextRestored, false);

		disposeOnFailure.length = 0;

		let destroyed = false;

		return {
			setOptions(next: Partial<LiquidTextLiveOptions>) {
				Object.assign(opts, next);
				if (destroyed || tornDown) return;
				const fontChanged = FONT_KEYS.some((key) => key in next);
				if (fontChanged) fitFontSize();
				if (fontChanged || "textColor" in next) rasterizeText();
			},
			resize() {
				if (destroyed || tornDown) return;
				resizeAll();
			},
			destroy() {
				if (destroyed) return;
				destroyed = true;
				canvas.removeEventListener("webglcontextlost", onContextLostEvent);
				canvas.removeEventListener("webglcontextrestored", onContextRestored);
				teardownSim();
				const loseContext = gl.getExtension("WEBGL_lose_context");
				loseContext?.loseContext();
			},
		};
	} catch {
		// Best-effort cleanup of whatever GL resources were already
		// allocated before the failure (a program compile/link error,
		// exhausted geometry buffers, a texture allocation failure inside
		// the initial resizeAll(), …), so a failed init doesn't strand
		// them on the canvas's still-live context. The disposeOnFailure
		// entries are each individually guarded since how far setup got
		// before throwing determines which of them actually ran; the sim
		// buffers/texture are unconditionally declared above (outside
		// this try), so they're always safe to tear down here.
		for (const dispose of disposeOnFailure) {
			try {
				dispose();
			} catch {
				/* already gone, or the context is no longer usable */
			}
		}
		destroySimBuffers();
		if (textTexture) gl.deleteTexture(textTexture);
		gl.getExtension("WEBGL_lose_context")?.loseContext();
		// Fail quiet: the caller keeps its static DOM text path.
		return null;
	}
}
