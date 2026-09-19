/**
 * FluidCursor core — the framework-free fluid simulation.
 *
 * Owns everything that used to live in the component's `onMount`: the WebGL2
 * Navier–Stokes solver (advection, divergence, curl/vorticity, the pressure
 * Jacobi iterations, the splat and display passes with their GLSL sources),
 * the rAF loop, the pointer/touch listeners, the visibility pause, the auto
 * splat timer, the singleton registry and the imperative {@link FluidCursorHandle}.
 * The WebGPU HDR path lives in `./webgpu-engine.js`; this file only decides
 * which of the two engines runs and falls back to WebGL when WebGPU declines.
 *
 * Zero framework imports, no module scope at all beyond the two sibling
 * imports (safe to import during SSR, and two engines cannot reach each
 * other), no bundler-injected globals (the wrapper passes `dev` instead) and
 * no `Math.random` outside `createFluidCursor` (the `random` parameter drives
 * every draw this file owns, so a future `seed` prop has one place to plug
 * into; `webgpu-engine.ts` keeps its own randomness).
 *
 * Every numeric constant, GLSL string, listener target and call order is the
 * one the Svelte component shipped — this is a move, not a rewrite.
 */

import {
	type ColorRGB,
	type Pointer,
	type FluidCursorHandle,
	type FluidRenderLevel,
	pointerPrototype,
	hexToRgb,
	HSVtoRGB,
	scaleRadiusForContainer,
	wrap,
	clickBoost,
} from "./fluid-shared.js";
import { startWebGpuFluid } from "./webgpu-engine.js";

/** The DOM handles the engine needs. */
export interface FluidCursorElements {
	canvas: HTMLCanvasElement;
}

/**
 * Everything the engine reads once, at creation time: the whole simulation
 * setup is snapshotted when the solver is built and is never re-read.
 *
 * The five props the component does keep re-reading after mount live on
 * {@link FluidCursorLiveOptions} instead.
 *
 * Deliberately required rather than defaulted: the public defaults belong to
 * the framework wrapper's prop declaration, which is the documented API
 * surface, so they are spelled out in exactly one place.
 */
export interface FluidCursorInitOptions {
	simResolution: number;
	dyeResolution: number;
	captureResolution: number;
	densityDissipation: number;
	velocityDissipation: number;
	pressure: number;
	pressureIterations: number;
	curl: number;
	splatRadius: number;
	splatForce: number;
	shading: boolean;
	colorUpdateSpeed: number;
	backColor: ColorRGB | string;
	transparent: boolean;
	colorIntensity: number;
	autoSplat: boolean;
	autoSplatInterval: number;
	pauseWhenHidden: boolean;
	splatOnMount: boolean;
	hdr: boolean;
	hdrBoost: number;
	/**
	 * Experimental: render the fluid as a retro ordered-dither bitmap.
	 * The dye is snapped to a chunky pixel grid and each color channel is
	 * quantized against a procedural 4x4 Bayer matrix, so dot density
	 * encodes brightness while hues are preserved. Forces the WebGL
	 * renderer (`hdr` is ignored while set). Applied at mount, like the
	 * other simulation props.
	 */
	dither: boolean;
	/** Size of one dithered pixel in CSS pixels (minimum 1). */
	ditherPixelSize: number;
	/** Color levels per channel in dither mode, clamped to [2, 16]. */
	ditherLevels: number;
	/**
	 * Called once the fluid engine is live, with an imperative handle to
	 * drive the simulation programmatically (trace a path via
	 * `moveTo`/`penUp`, fire a one-off `burst`) and read back the actual
	 * `renderLevel`. Pair with `interactive={false}` to drive it entirely
	 * without a real cursor.
	 */
	onReady?: (handle: FluidCursorHandle) => void;
	/**
	 * Emit the development-only console diagnostics (singleton eviction,
	 * WebGPU fallback, wide-gamut probe result). The wrapper passes its
	 * bundler's dev flag; the core stays free of bundler-injected globals.
	 */
	dev?: boolean;
}

/**
 * The five options the running engine keeps re-reading after creation.
 *
 * The component never declared an `$effect` for them, but in runes mode a
 * destructured prop is a getter, so every closure that survived mount read
 * the *current* value on each call. These are exactly those props, and the
 * sites that re-read them are listed per key below. Everything else is
 * snapshotted once — see {@link FluidCursorInitOptions}.
 *
 * Passing a key sets it; omitting it leaves the engine's current value.
 * `fluidColor` / `fluidColors` are optional, so passing them explicitly as
 * `undefined` clears the override (back to the hue cycle), which is what the
 * prop getters did.
 */
export interface FluidCursorLiveOptions {
	/** Re-read by `generateColor()`: every frame, every splat, every click. */
	fluidColor?: string;
	/** Re-read by `generateColor()`: every frame, every splat, every click. */
	fluidColors?: string[];
	/**
	 * Re-read by the rect cache, the pointer→canvas mapping, the splat radius
	 * correction and the teardown's listener removal.
	 */
	contained: boolean;
	/**
	 * Re-read by the teardown only: the pointer listeners are registered from
	 * the mount-time value, and removed only while this is still true.
	 */
	interactive: boolean;
	/**
	 * Re-read by the singleton registration, which the WebGPU path performs
	 * from its startup promise.
	 */
	allowMultiple: boolean;
}

export interface FluidCursorEngine {
	/** Apply the live options above. Every other option is mount-only. */
	setOptions(next: Partial<FluidCursorLiveOptions>): void;
	/** Re-measure the canvas and rebuild the framebuffers if its size changed. */
	resize(): void;
	/** Idempotent: cancels the loop, the timers, the listeners and the GPU resources. */
	destroy(): void;
}

/**
 * Start the fluid simulation on `el.canvas`.
 *
 * Returns `null` when no renderer could be obtained at all (no WebGL2, no
 * WebGL) — `options.onReady` still fires, with the inert handle whose
 * `renderLevel` is `"none"`. On the HDR path an engine is returned
 * synchronously while WebGPU is still starting up; it falls back to WebGL by
 * itself if WebGPU declines.
 */
export function createFluidCursor(
	el: FluidCursorElements,
	options: FluidCursorInitOptions & FluidCursorLiveOptions,
	random: () => number = Math.random
): FluidCursorEngine | null {
	const canvas = el.canvas;

	// Singleton registry. Per engine, not per module: the component declared
	// these in its instance script, so every mounted <FluidCursor/> owned its
	// own pair and could never evict another one. Keeping that scope keeps the
	// eviction branch and the stale-completion guard below exactly as
	// reachable as they were — and matches the React port, which holds the
	// same registry in a ref.
	let activeInstance: (() => void) | null = null;
	// Monotonic mount counter so async (WebGPU) startups that finish out of
	// order cannot let an older instance destroy a newer one.
	let mountCounter = 0;

	const {
		simResolution,
		dyeResolution,
		captureResolution,
		densityDissipation,
		velocityDissipation,
		pressure,
		pressureIterations,
		curl,
		splatRadius,
		splatForce,
		shading,
		colorUpdateSpeed,
		backColor,
		transparent,
		colorIntensity,
		autoSplat,
		autoSplatInterval,
		pauseWhenHidden,
		splatOnMount,
		hdr,
		hdrBoost,
		dither,
		ditherPixelSize,
		ditherLevels,
		onReady,
		dev = false,
	} = options;

	// Mutable on purpose: these five stand in for the prop getters the
	// component's closures kept calling after mount. See FluidCursorLiveOptions.
	let { fluidColor, fluidColors, interactive, allowMultiple, contained } = options;

	function setOptions(next: Partial<FluidCursorLiveOptions>): void {
		// `fluidColor` / `fluidColors` are optional, so `undefined` is a value
		// (clear the override) rather than "not supplied": probe with `in`.
		if ("fluidColor" in next) fluidColor = next.fluidColor;
		if ("fluidColors" in next) fluidColors = next.fluidColors;
		if (next.contained !== undefined) contained = next.contained;
		if (next.interactive !== undefined) interactive = next.interactive;
		if (next.allowMultiple !== undefined) allowMultiple = next.allowMultiple;
	}

	const clampedColorIntensity = Math.max(0, Math.min(1, colorIntensity));
	// A click's extra brightness, capped so it never compounds colorIntensity
	// into the dither pass's clamp — see clickBoost() for the arithmetic.
	const clickColorBoost = clickBoost(clampedColorIntensity);
	const clampedHdrBoost = Math.max(1, Math.min(4, hdrBoost));
	const clampedDitherPixelSize = Math.max(1, ditherPixelSize);
	const clampedDitherLevels = Math.max(2, Math.min(16, Math.floor(ditherLevels)));

	const resolvedBackColor: ColorRGB =
		typeof backColor === "string" ? hexToRgb(backColor) : backColor;

	// Cached pre-scaled colors to avoid re-parsing hex on every splat
	let colorIndex = 0;
	let cachedFluidColorHex: string | undefined;
	let cachedFluidColor: ColorRGB | null = null;
	let cachedFluidColorsRef: string[] | undefined;
	let cachedFluidColorsScaled: ColorRGB[] = [];

	// Frozen: these objects are cached and handed out by reference to every
	// pointer and every click, so an in-place `color.r *= …` anywhere downstream
	// would scale the palette itself — and in strict mode the freeze turns that
	// into a TypeError at the culprit instead of a fluid that brightens forever.
	function getScaledColor(hex: string): ColorRGB {
		const { r, g, b } = hexToRgb(hex);
		return Object.freeze({
			r: r * clampedColorIntensity,
			g: g * clampedColorIntensity,
			b: b * clampedColorIntensity,
		});
	}

	function getCachedFluidColor(hex: string): ColorRGB {
		if (cachedFluidColor === null || cachedFluidColorHex !== hex) {
			cachedFluidColorHex = hex;
			cachedFluidColor = getScaledColor(hex);
		}
		return cachedFluidColor;
	}

	function getCachedFluidColors(colors: string[]): ColorRGB[] {
		if (cachedFluidColorsRef !== colors) {
			cachedFluidColorsRef = colors;
			cachedFluidColorsScaled = colors.map(getScaledColor);
		}
		return cachedFluidColorsScaled;
	}

	function generateColor(): ColorRGB {
		if (fluidColor) {
			return getCachedFluidColor(fluidColor);
		}
		if (fluidColors && fluidColors.length > 0) {
			const colors = getCachedFluidColors(fluidColors);
			// In bounds by construction: idx is a modulo of the array's length.
			const idx = colorIndex % colors.length;
			colorIndex++;
			return colors[idx]!;
		}
		const c = HSVtoRGB(random(), 1.0, 1.0);
		c.r *= clampedColorIntensity;
		c.g *= clampedColorIntensity;
		c.b *= clampedColorIntensity;
		return c;
	}

	// Singleton wiring shared by the WebGL and WebGPU paths.
	function registerInstance(cleanup: () => void): () => void {
		if (!allowMultiple) {
			if (activeInstance) {
				if (dev) {
					console.warn(
						"[FluidCursor] Destroying previous instance. Only one instance is allowed by default. Use `allowMultiple={true}` to opt out of singleton behavior."
					);
				}
				activeInstance();
			}
			activeInstance = cleanup;
			return () => {
				cleanup();
				if (activeInstance === cleanup) {
					activeInstance = null;
				}
			};
		}
		return cleanup;
	}

	// Inert handle for environments where no renderer came up at all, so a
	// consumer waiting on onReady can tell "unsupported" from "still starting".
	const noRendererHandle: FluidCursorHandle = {
		moveTo() {},
		penUp() {},
		burst() {},
		renderLevel: "none",
	};

	// Hand the handle to the consumer. Guarded because the WebGPU path invokes
	// this inside its startup promise chain: an exception from the callback would
	// otherwise be caught as a WebGPU setup failure, retrying WebGL on a canvas
	// already claimed by WebGPU and dropping the registered cleanup. Re-thrown
	// asynchronously so it still surfaces as an unhandled error.
	function notifyReady(handle: FluidCursorHandle) {
		if (!onReady) return;
		try {
			onReady(handle);
		} catch (error) {
			queueMicrotask(() => {
				throw error;
			});
		}
	}

	const mountToken = ++mountCounter;
	const pointers = [pointerPrototype()];

	const config = {
		SIM_RESOLUTION: simResolution,
		DYE_RESOLUTION: dyeResolution,
		CAPTURE_RESOLUTION: captureResolution,
		DENSITY_DISSIPATION: densityDissipation,
		VELOCITY_DISSIPATION: velocityDissipation,
		PRESSURE: pressure,
		PRESSURE_ITERATIONS: pressureIterations,
		CURL: curl,
		SPLAT_RADIUS: splatRadius,
		SPLAT_FORCE: splatForce,
		SHADING: shading,
		COLOR_UPDATE_SPEED: colorUpdateSpeed,
		PAUSED: false,
		BACK_COLOR: resolvedBackColor,
		TRANSPARENT: transparent,
		DITHER: dither,
		DITHER_PIXEL_SIZE: clampedDitherPixelSize,
		DITHER_LEVELS: clampedDitherLevels,
	};

	// HDR path: WebGPU engine (rgba16float backbuffer, display-p3,
	// extended tone mapping). Falls back to the WebGL path below when
	// WebGPU is unavailable or initialization fails.
	if (hdr && !dither && typeof navigator !== "undefined" && "gpu" in navigator) {
		let disposed = false;
		let webgpuCleanup: (() => void) | null = null;
		let fallback: FluidCursorEngine | null = null;
		startWebGpuFluid(canvas, {
			simResolution: config.SIM_RESOLUTION,
			dyeResolution: config.DYE_RESOLUTION,
			densityDissipation: config.DENSITY_DISSIPATION,
			velocityDissipation: config.VELOCITY_DISSIPATION,
			pressure: config.PRESSURE,
			pressureIterations: config.PRESSURE_ITERATIONS,
			curl: config.CURL,
			splatRadius: config.SPLAT_RADIUS,
			splatForce: config.SPLAT_FORCE,
			shading: config.SHADING,
			colorUpdateSpeed: config.COLOR_UPDATE_SPEED,
			exposure: clampedHdrBoost,
			contained,
			interactive,
			autoSplat,
			autoSplatInterval,
			pauseWhenHidden,
			splatOnMount,
			generateColor,
			clickBoost: clickColorBoost,
		})
			.then((handle) => {
				if (disposed) {
					handle?.cleanup();
					return;
				}
				// A newer singleton instance mounted while we were starting up:
				// registering now would destroy it (newest-mount-wins would
				// invert). Discard this stale completion instead.
				if (!allowMultiple && mountToken !== mountCounter) {
					handle?.cleanup();
					return;
				}
				if (!handle) {
					// WebGPU unavailable: the WebGL fallback surfaces its own
					// handle through onReady.
					fallback = startWebGl() ?? null;
					return;
				}
				webgpuCleanup = registerInstance(handle.cleanup);
				notifyReady(handle);
			})
			.catch((error) => {
				// Unexpected failure while wiring the WebGPU path: fall back
				// to WebGL instead of leaving a permanently blank canvas.
				if (dev) {
					console.warn("[FluidCursor] WebGPU setup failed, falling back to WebGL:", error);
				}
				if (!disposed) fallback = startWebGl() ?? null;
			});
		return {
			setOptions,
			resize() {
				fallback?.resize();
			},
			destroy() {
				if (disposed) return;
				disposed = true;
				webgpuCleanup?.();
				webgpuCleanup = null;
				fallback?.destroy();
				fallback = null;
			},
		};
	}

	return startWebGl() ?? null;

	function startWebGl(): FluidCursorEngine | undefined {
		// Wide-gamut probe result, surfaced through the handle's renderLevel.
		let renderLevel: FluidRenderLevel = "webgl-sdr";
		// Dedicated synthetic pointer driven programmatically through the
		// handle. It lives alongside the mouse pointer in the same list, so
		// applyInputs splats both and the two inputs coexist. Only created
		// when a consumer asked for the handle: an unused extra pointer would
		// still consume the shared fluidColors sequence in updateColors.
		const autopilotPointer = onReady ? pointerPrototype() : null;
		if (autopilotPointer) pointers.push(autopilotPointer);
		let penWasUp = true;
		// Every GL object the engine allocates registers its own deleter here so
		// `cleanup()` can hand the memory back — and then lose the context
		// itself. Nothing here ever released a program, a texture or the
		// context before, so every unmount (a re-key on a skin switch, a route
		// change) left a whole simulation's worth of GPU memory owned by a
		// context only GC would eventually drop, and each new mount took one
		// more slot from the browser's ~16-context budget.
		const glDisposers: Array<() => void> = [];
		let glDisposed = false;

		// Get WebGL context
		const context = getWebGLContext(canvas);
		if (!context.gl || !context.ext) {
			// No renderer at all (WebGPU already failed if it was tried).
			notifyReady(noRendererHandle);
			return;
		}

		// These are guaranteed non-null after the check above
		const gl = context.gl;
		const ext = context.ext;

		// If no linear filtering, reduce resolution
		if (!ext.supportLinearFiltering) {
			config.DYE_RESOLUTION = 256;
			config.SHADING = false;
		}

		function getWebGLContext(canvas: HTMLCanvasElement) {
			const params = {
				alpha: true,
				depth: false,
				stencil: false,
				antialias: false,
				preserveDrawingBuffer: false,
			};

			let gl = canvas.getContext("webgl2", params) as WebGL2RenderingContext | null;

			if (!gl) {
				gl = (canvas.getContext("webgl", params) ||
					canvas.getContext("experimental-webgl", params)) as WebGL2RenderingContext | null;
			}

			if (!gl) {
				console.error("Unable to initialize WebGL.");
				return { gl: null, ext: null };
			}

			// HDR fallback: wide-gamut backbuffer when the WebGPU engine is
			// unavailable. Colors are reinterpreted in P3 (more saturated).
			// The property is read back because assigning an unsupported color
			// space silently leaves the buffer in sRGB.
			if (hdr && "drawingBufferColorSpace" in gl) {
				try {
					gl.drawingBufferColorSpace = "display-p3";
					if (gl.drawingBufferColorSpace === "display-p3") {
						renderLevel = "webgl-p3";
					}
				} catch {
					// Unsupported color space: buffer stays sRGB.
				}
				if (dev) {
					console.info(
						renderLevel === "webgl-p3"
							? "[FluidCursor] HDR level: webgl-p3 (wide gamut fallback)"
							: "[FluidCursor] HDR level: webgl-sdr (display-p3 drawing buffer rejected)"
					);
				}
			}

			const isWebGL2 = "drawBuffers" in gl;

			let supportLinearFiltering = false;
			let halfFloat = null;

			if (isWebGL2) {
				(gl as WebGL2RenderingContext).getExtension("EXT_color_buffer_float");
				supportLinearFiltering = !!(gl as WebGL2RenderingContext).getExtension(
					"OES_texture_float_linear"
				);
			} else {
				halfFloat = gl.getExtension("OES_texture_half_float");
				supportLinearFiltering = !!gl.getExtension("OES_texture_half_float_linear");
			}

			gl.clearColor(0, 0, 0, 1);

			const halfFloatTexType = isWebGL2
				? (gl as WebGL2RenderingContext).HALF_FLOAT
				: (halfFloat && halfFloat.HALF_FLOAT_OES) || 0;

			let formatRGBA: { internalFormat: number; format: number } | null;
			let formatRG: { internalFormat: number; format: number } | null;
			let formatR: { internalFormat: number; format: number } | null;

			if (isWebGL2) {
				formatRGBA = getSupportedFormat(
					gl,
					(gl as WebGL2RenderingContext).RGBA16F,
					gl.RGBA,
					halfFloatTexType
				);
				formatRG = getSupportedFormat(
					gl,
					(gl as WebGL2RenderingContext).RG16F,
					(gl as WebGL2RenderingContext).RG,
					halfFloatTexType
				);
				formatR = getSupportedFormat(
					gl,
					(gl as WebGL2RenderingContext).R16F,
					(gl as WebGL2RenderingContext).RED,
					halfFloatTexType
				);
			} else {
				formatRGBA = getSupportedFormat(gl, gl.RGBA, gl.RGBA, halfFloatTexType);
				formatRG = getSupportedFormat(gl, gl.RGBA, gl.RGBA, halfFloatTexType);
				formatR = getSupportedFormat(gl, gl.RGBA, gl.RGBA, halfFloatTexType);
			}

			return {
				gl,
				ext: {
					formatRGBA,
					formatRG,
					formatR,
					halfFloatTexType,
					supportLinearFiltering,
				},
			};
		}

		function getSupportedFormat(
			gl: WebGLRenderingContext | WebGL2RenderingContext,
			internalFormat: number,
			format: number,
			type: number
		): { internalFormat: number; format: number } | null {
			if (!supportRenderTextureFormat(gl, internalFormat, format, type)) {
				if ("drawBuffers" in gl) {
					const gl2 = gl as WebGL2RenderingContext;
					switch (internalFormat) {
						case gl2.R16F:
							return getSupportedFormat(gl2, gl2.RG16F, gl2.RG, type);
						case gl2.RG16F:
							return getSupportedFormat(gl2, gl2.RGBA16F, gl2.RGBA, type);
						default:
							return null;
					}
				}
				return null;
			}
			return { internalFormat, format };
		}

		function supportRenderTextureFormat(
			gl: WebGLRenderingContext | WebGL2RenderingContext,
			internalFormat: number,
			format: number,
			type: number
		) {
			const texture = gl.createTexture();
			if (!texture) return false;

			gl.bindTexture(gl.TEXTURE_2D, texture);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
			gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, 4, 4, 0, format, type, null);

			const fbo = gl.createFramebuffer();
			if (!fbo) return false;

			gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
			gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
			const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
			return status === gl.FRAMEBUFFER_COMPLETE;
		}

		function hashCode(s: string) {
			if (!s.length) return 0;
			let hash = 0;
			for (let i = 0; i < s.length; i++) {
				hash = (hash << 5) - hash + s.charCodeAt(i);
				hash |= 0;
			}
			return hash;
		}

		function addKeywords(source: string, keywords: string[] | null) {
			if (!keywords) return source;
			let keywordsString = "";
			for (const keyword of keywords) {
				keywordsString += `#define ${keyword}\n`;
			}
			return keywordsString + source;
		}

		function compileShader(
			type: number,
			source: string,
			keywords: string[] | null = null
		): WebGLShader | null {
			const shaderSource = addKeywords(source, keywords);
			const shader = gl.createShader(type);
			if (!shader) return null;
			glDisposers.push(() => gl.deleteShader(shader));
			gl.shaderSource(shader, shaderSource);
			gl.compileShader(shader);
			return shader;
		}

		function createProgram(
			vertexShader: WebGLShader | null,
			fragmentShader: WebGLShader | null
		): WebGLProgram | null {
			if (!vertexShader || !fragmentShader) return null;
			const program = gl.createProgram();
			if (!program) return null;
			glDisposers.push(() => gl.deleteProgram(program));
			gl.attachShader(program, vertexShader);
			gl.attachShader(program, fragmentShader);
			gl.linkProgram(program);
			return program;
		}

		function getUniforms(program: WebGLProgram) {
			const uniforms: Record<string, WebGLUniformLocation | null> = {};
			const uniformCount = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
			for (let i = 0; i < uniformCount; i++) {
				const uniformInfo = gl.getActiveUniform(program, i);
				if (uniformInfo) {
					uniforms[uniformInfo.name] = gl.getUniformLocation(program, uniformInfo.name);
				}
			}
			return uniforms;
		}

		class Program {
			program: WebGLProgram | null;
			uniforms: Record<string, WebGLUniformLocation | null>;

			constructor(vertexShader: WebGLShader | null, fragmentShader: WebGLShader | null) {
				this.program = createProgram(vertexShader, fragmentShader);
				this.uniforms = this.program ? getUniforms(this.program) : {};
			}

			bind() {
				if (this.program) gl.useProgram(this.program);
			}
		}

		class Material {
			vertexShader: WebGLShader | null;
			fragmentShaderSource: string;
			programs: Record<number, WebGLProgram | null>;
			activeProgram: WebGLProgram | null;
			uniforms: Record<string, WebGLUniformLocation | null>;

			constructor(vertexShader: WebGLShader | null, fragmentShaderSource: string) {
				this.vertexShader = vertexShader;
				this.fragmentShaderSource = fragmentShaderSource;
				this.programs = {};
				this.activeProgram = null;
				this.uniforms = {};
			}

			setKeywords(keywords: string[]) {
				let hash = 0;
				for (const kw of keywords) {
					hash += hashCode(kw);
				}
				let program = this.programs[hash];
				if (program == null) {
					const fragmentShader = compileShader(
						gl.FRAGMENT_SHADER,
						this.fragmentShaderSource,
						keywords
					);
					program = createProgram(this.vertexShader, fragmentShader);
					this.programs[hash] = program;
				}
				if (program === this.activeProgram) return;
				if (program) {
					this.uniforms = getUniforms(program);
				}
				this.activeProgram = program;
			}

			bind() {
				if (this.activeProgram) {
					gl.useProgram(this.activeProgram);
				}
			}
		}

		// Shaders
		const baseVertexShader = compileShader(
			gl.VERTEX_SHADER,
			`
		precision highp float;
		attribute vec2 aPosition;
		varying vec2 vUv;
		varying vec2 vL;
		varying vec2 vR;
		varying vec2 vT;
		varying vec2 vB;
		uniform vec2 texelSize;

		void main () {
			vUv = aPosition * 0.5 + 0.5;
			vL = vUv - vec2(texelSize.x, 0.0);
			vR = vUv + vec2(texelSize.x, 0.0);
			vT = vUv + vec2(0.0, texelSize.y);
			vB = vUv - vec2(0.0, texelSize.y);
			gl_Position = vec4(aPosition, 0.0, 1.0);
		}
	`
		);

		const copyShader = compileShader(
			gl.FRAGMENT_SHADER,
			`
		precision mediump float;
		precision mediump sampler2D;
		varying highp vec2 vUv;
		uniform sampler2D uTexture;

		void main () {
			gl_FragColor = texture2D(uTexture, vUv);
		}
	`
		);

		const clearShader = compileShader(
			gl.FRAGMENT_SHADER,
			`
		precision mediump float;
		precision mediump sampler2D;
		varying highp vec2 vUv;
		uniform sampler2D uTexture;
		uniform float value;

		void main () {
			gl_FragColor = value * texture2D(uTexture, vUv);
		}
	`
		);

		const displayShaderSource = `
		precision highp float;
		precision highp sampler2D;
		varying vec2 vUv;
		varying vec2 vL;
		varying vec2 vR;
		varying vec2 vT;
		varying vec2 vB;
		uniform sampler2D uTexture;
		uniform vec2 texelSize;
		#ifdef DITHERING
		uniform float uDitherPixel;
		uniform float uDitherLevels;
		#endif

		vec3 linearToGamma (vec3 color) {
			color = max(color, vec3(0));
			return max(1.055 * pow(color, vec3(0.416666667)) - 0.055, vec3(0));
		}

		#ifdef DITHERING
		// Recursive ordered-dither thresholds (4x4 Bayer, 16 levels).
		// GLSL ES 1.00-safe: floor/fract arithmetic only — no arrays,
		// no integer ops, no dynamic indexing.
		float bayer2 (vec2 a) {
			a = floor(a);
			return fract(a.x * 0.5 + a.y * a.y * 0.75);
		}

		float bayer4 (vec2 a) {
			return bayer2(a * 0.5) * 0.25 + bayer2(a);
		}
		#endif

		void main () {
		#ifdef DITHERING
			// One cell = one chunky pixel: every fragment in the cell samples
			// the dye at the cell center and shares one Bayer threshold, so
			// the cell renders as a solid square dot.
			vec2 cell = floor(gl_FragCoord.xy / uDitherPixel);
			vec2 uv = (cell + 0.5) * uDitherPixel * texelSize;
			vec3 c = clamp(texture2D(uTexture, uv).rgb, 0.0, 1.0);

			float steps = uDitherLevels - 1.0;
			c = floor(c * steps + bayer4(cell)) / steps;

			// Alpha from the quantized color: cells that quantize to black
			// stay fully transparent, so dot density encodes brightness
			// with no grey haze over the background.
			float a = max(c.r, max(c.g, c.b));
			gl_FragColor = vec4(c, a);
		#else
			vec3 c = texture2D(uTexture, vUv).rgb;
			#ifdef SHADING
				vec3 lc = texture2D(uTexture, vL).rgb;
				vec3 rc = texture2D(uTexture, vR).rgb;
				vec3 tc = texture2D(uTexture, vT).rgb;
				vec3 bc = texture2D(uTexture, vB).rgb;

				float dx = length(rc) - length(lc);
				float dy = length(tc) - length(bc);

				vec3 n = normalize(vec3(dx, dy, length(texelSize)));
				vec3 l = vec3(0.0, 0.0, 1.0);

				float diffuse = clamp(dot(n, l) + 0.7, 0.7, 1.0);
				c *= diffuse;
			#endif

			float a = max(c.r, max(c.g, c.b));
			gl_FragColor = vec4(c, a);
		#endif
		}
	`;

		const splatShader = compileShader(
			gl.FRAGMENT_SHADER,
			`
		precision highp float;
		precision highp sampler2D;
		varying vec2 vUv;
		uniform sampler2D uTarget;
		uniform float aspectRatio;
		uniform vec3 color;
		uniform vec2 point;
		uniform float radius;
		uniform float saturate;

		void main () {
			vec2 p = vUv - point.xy;
			p.x *= aspectRatio;
			vec3 splat = exp(-dot(p, p) / radius) * color;
			vec3 base = texture2D(uTarget, vUv).xyz;
			// A click splat lifts each texel to its own profile instead of adding
			// to it: what is already there never rises past what one click would
			// leave at that spot, so a burst of clicks paints the same disc once
			// instead of summing towards white and widening with every click.
			vec3 sum = saturate > 0.5 ? max(base, splat) : base + splat;
			gl_FragColor = vec4(sum, 1.0);
		}
	`
		);

		const advectionShader = compileShader(
			gl.FRAGMENT_SHADER,
			`
		precision highp float;
		precision highp sampler2D;
		varying vec2 vUv;
		uniform sampler2D uVelocity;
		uniform sampler2D uSource;
		uniform vec2 texelSize;
		uniform vec2 dyeTexelSize;
		uniform float dt;
		uniform float dissipation;

		vec4 bilerp (sampler2D sam, vec2 uv, vec2 tsize) {
			vec2 st = uv / tsize - 0.5;
			vec2 iuv = floor(st);
			vec2 fuv = fract(st);

			vec4 a = texture2D(sam, (iuv + vec2(0.5, 0.5)) * tsize);
			vec4 b = texture2D(sam, (iuv + vec2(1.5, 0.5)) * tsize);
			vec4 c = texture2D(sam, (iuv + vec2(0.5, 1.5)) * tsize);
			vec4 d = texture2D(sam, (iuv + vec2(1.5, 1.5)) * tsize);

			return mix(mix(a, b, fuv.x), mix(c, d, fuv.x), fuv.y);
		}

		void main () {
			#ifdef MANUAL_FILTERING
				vec2 coord = vUv - dt * bilerp(uVelocity, vUv, texelSize).xy * texelSize;
				vec4 result = bilerp(uSource, coord, dyeTexelSize);
			#else
				vec2 coord = vUv - dt * texture2D(uVelocity, vUv).xy * texelSize;
				vec4 result = texture2D(uSource, coord);
			#endif
			float decay = 1.0 + dissipation * dt;
			gl_FragColor = result / decay;
		}
	`,
			ext.supportLinearFiltering ? null : ["MANUAL_FILTERING"]
		);

		const divergenceShader = compileShader(
			gl.FRAGMENT_SHADER,
			`
		precision mediump float;
		precision mediump sampler2D;
		varying highp vec2 vUv;
		varying highp vec2 vL;
		varying highp vec2 vR;
		varying highp vec2 vT;
		varying highp vec2 vB;
		uniform sampler2D uVelocity;

		void main () {
			float L = texture2D(uVelocity, vL).x;
			float R = texture2D(uVelocity, vR).x;
			float T = texture2D(uVelocity, vT).y;
			float B = texture2D(uVelocity, vB).y;

			vec2 C = texture2D(uVelocity, vUv).xy;
			if (vL.x < 0.0) { L = -C.x; }
			if (vR.x > 1.0) { R = -C.x; }
			if (vT.y > 1.0) { T = -C.y; }
			if (vB.y < 0.0) { B = -C.y; }

			float div = 0.5 * (R - L + T - B);
			gl_FragColor = vec4(div, 0.0, 0.0, 1.0);
		}
	`
		);

		const curlShader = compileShader(
			gl.FRAGMENT_SHADER,
			`
		precision mediump float;
		precision mediump sampler2D;
		varying highp vec2 vUv;
		varying highp vec2 vL;
		varying highp vec2 vR;
		varying highp vec2 vT;
		varying highp vec2 vB;
		uniform sampler2D uVelocity;

		void main () {
			float L = texture2D(uVelocity, vL).y;
			float R = texture2D(uVelocity, vR).y;
			float T = texture2D(uVelocity, vT).x;
			float B = texture2D(uVelocity, vB).x;
			float vorticity = R - L - T + B;
			gl_FragColor = vec4(0.5 * vorticity, 0.0, 0.0, 1.0);
		}
	`
		);

		const vorticityShader = compileShader(
			gl.FRAGMENT_SHADER,
			`
		precision highp float;
		precision highp sampler2D;
		varying vec2 vUv;
		varying vec2 vL;
		varying vec2 vR;
		varying vec2 vT;
		varying vec2 vB;
		uniform sampler2D uVelocity;
		uniform sampler2D uCurl;
		uniform float curl;
		uniform float dt;

		void main () {
			float L = texture2D(uCurl, vL).x;
			float R = texture2D(uCurl, vR).x;
			float T = texture2D(uCurl, vT).x;
			float B = texture2D(uCurl, vB).x;
			float C = texture2D(uCurl, vUv).x;

			vec2 force = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));
			force /= length(force) + 0.0001;
			force *= curl * C;
			force.y *= -1.0;

			vec2 velocity = texture2D(uVelocity, vUv).xy;
			velocity += force * dt;
			velocity = min(max(velocity, -1000.0), 1000.0);
			gl_FragColor = vec4(velocity, 0.0, 1.0);
		}
	`
		);

		const pressureShader = compileShader(
			gl.FRAGMENT_SHADER,
			`
		precision mediump float;
		precision mediump sampler2D;
		varying highp vec2 vUv;
		varying highp vec2 vL;
		varying highp vec2 vR;
		varying highp vec2 vT;
		varying highp vec2 vB;
		uniform sampler2D uPressure;
		uniform sampler2D uDivergence;

		void main () {
			float L = texture2D(uPressure, vL).x;
			float R = texture2D(uPressure, vR).x;
			float T = texture2D(uPressure, vT).x;
			float B = texture2D(uPressure, vB).x;
			float C = texture2D(uPressure, vUv).x;
			float divergence = texture2D(uDivergence, vUv).x;
			float pressure = (L + R + B + T - divergence) * 0.25;
			gl_FragColor = vec4(pressure, 0.0, 0.0, 1.0);
		}
	`
		);

		const gradientSubtractShader = compileShader(
			gl.FRAGMENT_SHADER,
			`
		precision mediump float;
		precision mediump sampler2D;
		varying highp vec2 vUv;
		varying highp vec2 vL;
		varying highp vec2 vR;
		varying highp vec2 vT;
		varying highp vec2 vB;
		uniform sampler2D uPressure;
		uniform sampler2D uVelocity;

		void main () {
			float L = texture2D(uPressure, vL).x;
			float R = texture2D(uPressure, vR).x;
			float T = texture2D(uPressure, vT).x;
			float B = texture2D(uPressure, vB).x;
			vec2 velocity = texture2D(uVelocity, vUv).xy;
			velocity.xy -= vec2(R - L, T - B);
			gl_FragColor = vec4(velocity, 0.0, 1.0);
		}
	`
		);

		// Fullscreen Triangles
		interface FBO {
			texture: WebGLTexture;
			fbo: WebGLFramebuffer;
			width: number;
			height: number;
			texelSizeX: number;
			texelSizeY: number;
			attach: (id: number) => number;
		}

		interface DoubleFBO {
			width: number;
			height: number;
			texelSizeX: number;
			texelSizeY: number;
			read: FBO;
			write: FBO;
			swap: () => void;
		}

		const blit = (() => {
			const buffer = gl.createBuffer()!;
			glDisposers.push(() => gl.deleteBuffer(buffer));
			gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
			gl.bufferData(
				gl.ARRAY_BUFFER,
				new Float32Array([-1, -1, -1, 1, 1, 1, 1, -1]),
				gl.STATIC_DRAW
			);
			const elemBuffer = gl.createBuffer()!;
			glDisposers.push(() => gl.deleteBuffer(elemBuffer));
			gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, elemBuffer);
			gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0, 1, 2, 0, 2, 3]), gl.STATIC_DRAW);
			gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
			gl.enableVertexAttribArray(0);

			return (target: FBO | null, doClear = false) => {
				if (!gl) return;
				if (!target) {
					gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
					gl.bindFramebuffer(gl.FRAMEBUFFER, null);
				} else {
					gl.viewport(0, 0, target.width, target.height);
					gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo);
				}
				if (doClear) {
					gl.clearColor(0, 0, 0, 1);
					gl.clear(gl.COLOR_BUFFER_BIT);
				}
				gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
			};
		})();

		// FBO variables. The definite-assignment assertions are honest:
		// initFramebuffers() runs below before any frame reads them.
		let dye!: DoubleFBO;
		let velocity!: DoubleFBO;
		let divergenceFBO!: FBO;
		let curlFBO!: FBO;
		let pressureFBO!: DoubleFBO;

		// WebGL Programs
		const copyProgram = new Program(baseVertexShader, copyShader);
		const clearProgram = new Program(baseVertexShader, clearShader);
		const splatProgram = new Program(baseVertexShader, splatShader);
		const advectionProgram = new Program(baseVertexShader, advectionShader);
		const divergenceProgram = new Program(baseVertexShader, divergenceShader);
		const curlProgram = new Program(baseVertexShader, curlShader);
		const vorticityProgram = new Program(baseVertexShader, vorticityShader);
		const pressureProgram = new Program(baseVertexShader, pressureShader);
		const gradienSubtractProgram = new Program(baseVertexShader, gradientSubtractShader);
		const displayMaterial = new Material(baseVertexShader, displayShaderSource);

		// FBO creation
		function createFBO(
			w: number,
			h: number,
			internalFormat: number,
			format: number,
			type: number,
			param: number
		): FBO {
			gl.activeTexture(gl.TEXTURE0);
			const texture = gl.createTexture()!;
			glDisposers.push(() => gl.deleteTexture(texture));
			gl.bindTexture(gl.TEXTURE_2D, texture);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, param);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, param);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
			gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, w, h, 0, format, type, null);
			const fbo = gl.createFramebuffer()!;
			glDisposers.push(() => gl.deleteFramebuffer(fbo));
			gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
			gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
			gl.viewport(0, 0, w, h);
			gl.clear(gl.COLOR_BUFFER_BIT);

			const texelSizeX = 1 / w;
			const texelSizeY = 1 / h;

			return {
				texture,
				fbo,
				width: w,
				height: h,
				texelSizeX,
				texelSizeY,
				attach(id: number) {
					gl.activeTexture(gl.TEXTURE0 + id);
					gl.bindTexture(gl.TEXTURE_2D, texture);
					return id;
				},
			};
		}

		function createDoubleFBO(
			w: number,
			h: number,
			internalFormat: number,
			format: number,
			type: number,
			param: number
		): DoubleFBO {
			const fbo1 = createFBO(w, h, internalFormat, format, type, param);
			const fbo2 = createFBO(w, h, internalFormat, format, type, param);
			return {
				width: w,
				height: h,
				texelSizeX: fbo1.texelSizeX,
				texelSizeY: fbo1.texelSizeY,
				read: fbo1,
				write: fbo2,
				swap() {
					const tmp = this.read;
					this.read = this.write;
					this.write = tmp;
				},
			};
		}

		function resizeFBO(
			target: FBO,
			w: number,
			h: number,
			internalFormat: number,
			format: number,
			type: number,
			param: number
		) {
			const newFBO = createFBO(w, h, internalFormat, format, type, param);
			copyProgram.bind();
			if (copyProgram.uniforms.uTexture)
				gl.uniform1i(copyProgram.uniforms.uTexture, target.attach(0));
			blit(newFBO, false);
			return newFBO;
		}

		function resizeDoubleFBO(
			target: DoubleFBO,
			w: number,
			h: number,
			internalFormat: number,
			format: number,
			type: number,
			param: number
		) {
			if (target.width === w && target.height === h) return target;
			target.read = resizeFBO(target.read, w, h, internalFormat, format, type, param);
			target.write = createFBO(w, h, internalFormat, format, type, param);
			target.width = w;
			target.height = h;
			target.texelSizeX = 1 / w;
			target.texelSizeY = 1 / h;
			return target;
		}

		function initFramebuffers() {
			const simRes = getResolution(config.SIM_RESOLUTION!);
			const dyeRes = getResolution(config.DYE_RESOLUTION!);

			const texType = ext.halfFloatTexType;
			const rgba = ext.formatRGBA!;
			const rg = ext.formatRG!;
			const r = ext.formatR!;
			const filtering = ext.supportLinearFiltering ? gl.LINEAR : gl.NEAREST;
			gl.disable(gl.BLEND);

			if (!dye) {
				dye = createDoubleFBO(
					dyeRes.width,
					dyeRes.height,
					rgba.internalFormat,
					rgba.format,
					texType,
					filtering
				);
			} else {
				dye = resizeDoubleFBO(
					dye,
					dyeRes.width,
					dyeRes.height,
					rgba.internalFormat,
					rgba.format,
					texType,
					filtering
				);
			}

			if (!velocity) {
				velocity = createDoubleFBO(
					simRes.width,
					simRes.height,
					rg.internalFormat,
					rg.format,
					texType,
					filtering
				);
			} else {
				velocity = resizeDoubleFBO(
					velocity,
					simRes.width,
					simRes.height,
					rg.internalFormat,
					rg.format,
					texType,
					filtering
				);
			}

			divergenceFBO = createFBO(
				simRes.width,
				simRes.height,
				r.internalFormat,
				r.format,
				texType,
				gl.NEAREST
			);
			curlFBO = createFBO(
				simRes.width,
				simRes.height,
				r.internalFormat,
				r.format,
				texType,
				gl.NEAREST
			);
			pressureFBO = createDoubleFBO(
				simRes.width,
				simRes.height,
				r.internalFormat,
				r.format,
				texType,
				gl.NEAREST
			);
		}

		function updateKeywords() {
			const displayKeywords: string[] = [];
			if (config.SHADING) displayKeywords.push("SHADING");
			if (config.DITHER) displayKeywords.push("DITHERING");
			displayMaterial.setKeywords(displayKeywords);
		}

		function getResolution(resolution: number) {
			const w = gl.drawingBufferWidth;
			const h = gl.drawingBufferHeight;
			const aspectRatio = w / h;
			const aspect = aspectRatio < 1 ? 1 / aspectRatio : aspectRatio;
			const min = Math.round(resolution);
			const max = Math.round(resolution * aspect);
			if (w > h) {
				return { width: max, height: min };
			}
			return { width: min, height: max };
		}

		function scaleByPixelRatio(input: number) {
			const pixelRatio = window.devicePixelRatio || 1;
			return Math.floor(input * pixelRatio);
		}

		let canvasRectCache: DOMRect | null = null;
		function updateCanvasRectCache() {
			if (contained && canvas) canvasRectCache = canvas.getBoundingClientRect();
		}
		if (contained) {
			window.addEventListener("resize", updateCanvasRectCache, { passive: true });
			window.addEventListener("scroll", updateCanvasRectCache, { passive: true });
			updateCanvasRectCache();
		}

		function getCanvasPos(clientX: number, clientY: number): { x: number; y: number } {
			if (contained) {
				if (!canvasRectCache) updateCanvasRectCache();
				const rect = canvasRectCache!;
				return {
					x: scaleByPixelRatio(clientX - rect.left),
					y: scaleByPixelRatio(clientY - rect.top),
				};
			}
			return { x: scaleByPixelRatio(clientX), y: scaleByPixelRatio(clientY) };
		}

		// Simulation Setup
		updateKeywords();
		initFramebuffers();

		let lastUpdateTime = Date.now();
		let colorUpdateTimer = 0.0;
		let animationFrameId = 0;

		let isVisible = true;

		function updateFrame() {
			if (!isVisible) return;
			const dt = calcDeltaTime();
			if (resizeCanvas()) initFramebuffers();
			updateColors(dt);
			applyInputs();
			step(dt);
			render(null);
			animationFrameId = requestAnimationFrame(updateFrame);
		}

		function calcDeltaTime() {
			const now = Date.now();
			let dt = (now - lastUpdateTime) / 1000;
			dt = Math.min(dt, 0.016666);
			lastUpdateTime = now;
			return dt;
		}

		function resizeCanvas() {
			const width = scaleByPixelRatio(canvas.clientWidth);
			const height = scaleByPixelRatio(canvas.clientHeight);
			if (canvas.width !== width || canvas.height !== height) {
				canvas.width = width;
				canvas.height = height;
				return true;
			}
			return false;
		}

		function updateColors(dt: number) {
			colorUpdateTimer += dt * config.COLOR_UPDATE_SPEED;
			if (colorUpdateTimer >= 1) {
				colorUpdateTimer = wrap(colorUpdateTimer, 0, 1);
				pointers.forEach((p) => {
					// The synthetic pointer's color belongs to the handle: pulling
					// from the generator here would advance the shared fluidColors
					// index twice per update and overwrite explicit stroke colors.
					if (p === autopilotPointer) return;
					p.color = generateColor();
				});
			}
		}

		function applyInputs() {
			for (const p of pointers) {
				if (p.moved) {
					p.moved = false;
					splatPointer(p);
				}
			}
		}

		function step(dt: number) {
			gl.disable(gl.BLEND);

			// Curl
			curlProgram.bind();
			if (curlProgram.uniforms.texelSize) {
				gl.uniform2f(curlProgram.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
			}
			if (curlProgram.uniforms.uVelocity) {
				gl.uniform1i(curlProgram.uniforms.uVelocity, velocity.read.attach(0));
			}
			blit(curlFBO);

			// Vorticity
			vorticityProgram.bind();
			if (vorticityProgram.uniforms.texelSize) {
				gl.uniform2f(vorticityProgram.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
			}
			if (vorticityProgram.uniforms.uVelocity) {
				gl.uniform1i(vorticityProgram.uniforms.uVelocity, velocity.read.attach(0));
			}
			if (vorticityProgram.uniforms.uCurl) {
				gl.uniform1i(vorticityProgram.uniforms.uCurl, curlFBO.attach(1));
			}
			if (vorticityProgram.uniforms.curl) {
				gl.uniform1f(vorticityProgram.uniforms.curl, config.CURL);
			}
			if (vorticityProgram.uniforms.dt) {
				gl.uniform1f(vorticityProgram.uniforms.dt, dt);
			}
			blit(velocity.write);
			velocity.swap();

			// Divergence
			divergenceProgram.bind();
			if (divergenceProgram.uniforms.texelSize) {
				gl.uniform2f(
					divergenceProgram.uniforms.texelSize,
					velocity.texelSizeX,
					velocity.texelSizeY
				);
			}
			if (divergenceProgram.uniforms.uVelocity) {
				gl.uniform1i(divergenceProgram.uniforms.uVelocity, velocity.read.attach(0));
			}
			blit(divergenceFBO);

			// Clear pressure
			clearProgram.bind();
			if (clearProgram.uniforms.uTexture) {
				gl.uniform1i(clearProgram.uniforms.uTexture, pressureFBO.read.attach(0));
			}
			if (clearProgram.uniforms.value) {
				gl.uniform1f(clearProgram.uniforms.value, config.PRESSURE);
			}
			blit(pressureFBO.write);
			pressureFBO.swap();

			// Pressure
			pressureProgram.bind();
			if (pressureProgram.uniforms.texelSize) {
				gl.uniform2f(pressureProgram.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
			}
			if (pressureProgram.uniforms.uDivergence) {
				gl.uniform1i(pressureProgram.uniforms.uDivergence, divergenceFBO.attach(0));
			}
			for (let i = 0; i < config.PRESSURE_ITERATIONS; i++) {
				if (pressureProgram.uniforms.uPressure) {
					gl.uniform1i(pressureProgram.uniforms.uPressure, pressureFBO.read.attach(1));
				}
				blit(pressureFBO.write);
				pressureFBO.swap();
			}

			// Gradient Subtract
			gradienSubtractProgram.bind();
			if (gradienSubtractProgram.uniforms.texelSize) {
				gl.uniform2f(
					gradienSubtractProgram.uniforms.texelSize,
					velocity.texelSizeX,
					velocity.texelSizeY
				);
			}
			if (gradienSubtractProgram.uniforms.uPressure) {
				gl.uniform1i(gradienSubtractProgram.uniforms.uPressure, pressureFBO.read.attach(0));
			}
			if (gradienSubtractProgram.uniforms.uVelocity) {
				gl.uniform1i(gradienSubtractProgram.uniforms.uVelocity, velocity.read.attach(1));
			}
			blit(velocity.write);
			velocity.swap();

			// Advection - velocity
			advectionProgram.bind();
			if (advectionProgram.uniforms.texelSize) {
				gl.uniform2f(advectionProgram.uniforms.texelSize, velocity.texelSizeX, velocity.texelSizeY);
			}
			if (!ext.supportLinearFiltering && advectionProgram.uniforms.dyeTexelSize) {
				gl.uniform2f(
					advectionProgram.uniforms.dyeTexelSize,
					velocity.texelSizeX,
					velocity.texelSizeY
				);
			}
			const velocityId = velocity.read.attach(0);
			if (advectionProgram.uniforms.uVelocity) {
				gl.uniform1i(advectionProgram.uniforms.uVelocity, velocityId);
			}
			if (advectionProgram.uniforms.uSource) {
				gl.uniform1i(advectionProgram.uniforms.uSource, velocityId);
			}
			if (advectionProgram.uniforms.dt) {
				gl.uniform1f(advectionProgram.uniforms.dt, dt);
			}
			if (advectionProgram.uniforms.dissipation) {
				gl.uniform1f(advectionProgram.uniforms.dissipation, config.VELOCITY_DISSIPATION);
			}
			blit(velocity.write);
			velocity.swap();

			// Advection - dye
			if (!ext.supportLinearFiltering && advectionProgram.uniforms.dyeTexelSize) {
				gl.uniform2f(advectionProgram.uniforms.dyeTexelSize, dye.texelSizeX, dye.texelSizeY);
			}
			if (advectionProgram.uniforms.uVelocity) {
				gl.uniform1i(advectionProgram.uniforms.uVelocity, velocity.read.attach(0));
			}
			if (advectionProgram.uniforms.uSource) {
				gl.uniform1i(advectionProgram.uniforms.uSource, dye.read.attach(1));
			}
			if (advectionProgram.uniforms.dissipation) {
				gl.uniform1f(advectionProgram.uniforms.dissipation, config.DENSITY_DISSIPATION);
			}
			blit(dye.write);
			dye.swap();
		}

		function render(target: FBO | null) {
			gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
			gl.enable(gl.BLEND);
			drawDisplay(target);
		}

		function drawDisplay(target: FBO | null) {
			const width = target ? target.width : gl.drawingBufferWidth;
			const height = target ? target.height : gl.drawingBufferHeight;
			displayMaterial.bind();
			if ((config.SHADING || config.DITHER) && displayMaterial.uniforms.texelSize) {
				gl.uniform2f(displayMaterial.uniforms.texelSize, 1 / width, 1 / height);
			}
			if (displayMaterial.uniforms.uTexture) {
				gl.uniform1i(displayMaterial.uniforms.uTexture, dye.read.attach(0));
			}
			if (config.DITHER) {
				if (displayMaterial.uniforms.uDitherPixel) {
					gl.uniform1f(
						displayMaterial.uniforms.uDitherPixel,
						config.DITHER_PIXEL_SIZE * (window.devicePixelRatio || 1)
					);
				}
				if (displayMaterial.uniforms.uDitherLevels) {
					gl.uniform1f(displayMaterial.uniforms.uDitherLevels, config.DITHER_LEVELS);
				}
			}
			blit(target, false);
		}

		// Interaction
		function splatPointer(pointer: Pointer) {
			const dx = pointer.deltaX * config.SPLAT_FORCE;
			const dy = pointer.deltaY * config.SPLAT_FORCE;
			splat(pointer.texcoordX, pointer.texcoordY, dx, dy, pointer.color);
		}

		function clickSplat(pointer: Pointer) {
			// generateColor() is already intensity-scaled; the boost is capped so
			// the peak stays at CLICK_PEAK rather than compounding colorIntensity.
			// COPY, never scale in place: with `fluidColor` / `fluidColors` set,
			// generateColor() hands back the cached palette object itself, and
			// scaling that multiplied the palette again on every click — the
			// 10th click painted with a colour 10^10 times brighter — which is
			// what turned a few clicks into a giant disc and a few more into
			// NaN and nothing at all.
			const base = generateColor();
			const color = {
				r: base.r * clickColorBoost,
				g: base.g * clickColorBoost,
				b: base.b * clickColorBoost,
			};
			const dx = 10 * (random() - 0.5);
			const dy = 30 * (random() - 0.5);
			// Saturating: a burst of clicks on one spot pools at this colour
			// rather than summing — a click has next to no velocity to carry
			// the dye away, so additive stacking used to turn into a white disc.
			splat(pointer.texcoordX, pointer.texcoordY, dx, dy, color, true);
		}

		/**
		 * Inject velocity and dye at a point. `saturate` is the click mode: the
		 * dye pass then caps each texel at the splat colour instead of adding
		 * to it (velocity is always additive — a click's push is negligible).
		 */
		function splat(
			x: number,
			y: number,
			dx: number,
			dy: number,
			color: ColorRGB,
			saturate = false
		) {
			splatProgram.bind();
			if (splatProgram.uniforms.uTarget) {
				gl.uniform1i(splatProgram.uniforms.uTarget, velocity.read.attach(0));
			}
			if (splatProgram.uniforms.aspectRatio) {
				gl.uniform1f(splatProgram.uniforms.aspectRatio, canvas.width / canvas.height);
			}
			if (splatProgram.uniforms.point) {
				gl.uniform2f(splatProgram.uniforms.point, x, y);
			}
			if (splatProgram.uniforms.color) {
				gl.uniform3f(splatProgram.uniforms.color, dx, dy, 0);
			}
			if (splatProgram.uniforms.saturate) {
				gl.uniform1f(splatProgram.uniforms.saturate, 0);
			}
			if (splatProgram.uniforms.radius) {
				let radius = correctRadius(config.SPLAT_RADIUS / 100)!;
				if (contained) {
					radius = scaleRadiusForContainer(radius, canvas.clientHeight, window.innerHeight);
				}
				gl.uniform1f(splatProgram.uniforms.radius, radius);
			}
			blit(velocity.write);
			velocity.swap();

			if (splatProgram.uniforms.uTarget) {
				gl.uniform1i(splatProgram.uniforms.uTarget, dye.read.attach(0));
			}
			if (splatProgram.uniforms.color) {
				gl.uniform3f(splatProgram.uniforms.color, color.r, color.g, color.b);
			}
			if (splatProgram.uniforms.saturate) {
				gl.uniform1f(splatProgram.uniforms.saturate, saturate ? 1 : 0);
			}
			blit(dye.write);
			dye.swap();
		}

		function multipleSplats(steps: number) {
			// Simulate a cursor sweep along a random arc — each step on its own frame
			// so the velocity field has time to evolve between injections.
			const angle = random() * Math.PI * 2;
			const cx = 0.25 + random() * 0.5;
			const cy = 0.25 + random() * 0.5;
			const arcSpan = Math.PI * (0.8 + random() * 0.8);
			let i = 0;

			function step() {
				if (i >= steps) return;
				const t = i / Math.max(1, steps - 1);
				const a = angle + t * arcSpan;
				const r = 0.15 + 0.05 * Math.sin(t * Math.PI);
				const x = cx + Math.cos(a) * r;
				const y = cy + Math.sin(a) * r;
				const color = generateColor();
				splat(
					x,
					y,
					-Math.sin(a) * config.SPLAT_FORCE * 0.5,
					Math.cos(a) * config.SPLAT_FORCE * 0.5,
					color
				);
				i++;
				if (i < steps) requestAnimationFrame(step);
			}
			requestAnimationFrame(step);
		}

		function correctRadius(radius: number) {
			const aspectRatio = canvas.width / canvas.height;
			if (aspectRatio > 1) radius *= aspectRatio;
			return radius;
		}

		function updatePointerDownData(pointer: Pointer, id: number, posX: number, posY: number) {
			pointer.id = id;
			pointer.down = true;
			pointer.moved = false;
			pointer.texcoordX = posX / canvas.width;
			pointer.texcoordY = 1 - posY / canvas.height;
			pointer.prevTexcoordX = pointer.texcoordX;
			pointer.prevTexcoordY = pointer.texcoordY;
			pointer.deltaX = 0;
			pointer.deltaY = 0;
			pointer.color = generateColor();
		}

		function updatePointerMoveData(pointer: Pointer, posX: number, posY: number, color: ColorRGB) {
			pointer.prevTexcoordX = pointer.texcoordX;
			pointer.prevTexcoordY = pointer.texcoordY;
			pointer.texcoordX = posX / canvas.width;
			pointer.texcoordY = 1 - posY / canvas.height;
			pointer.deltaX = correctDeltaX(pointer.texcoordX - pointer.prevTexcoordX)!;
			pointer.deltaY = correctDeltaY(pointer.texcoordY - pointer.prevTexcoordY)!;
			pointer.moved = Math.abs(pointer.deltaX) > 0 || Math.abs(pointer.deltaY) > 0;
			pointer.color = color;
		}

		function correctDeltaX(delta: number) {
			const aspectRatio = canvas.width / canvas.height;
			if (aspectRatio < 1) delta *= aspectRatio;
			return delta;
		}

		function correctDeltaY(delta: number) {
			const aspectRatio = canvas.width / canvas.height;
			if (aspectRatio > 1) delta /= aspectRatio;
			return delta;
		}

		// Programmatic drive surface (exposed through onReady).
		//
		// x,y in [0,1], top-left origin. `updatePointerMoveData` applies
		// `texcoordY = 1 - posY / height`, so feeding it a top-left pixel Y
		// yields the same path a real mouse event's clientY takes. This is the
		// only Y flip on the WebGL path.
		function autopilotMoveTo(x: number, y: number, color?: ColorRGB) {
			if (!autopilotPointer) return;
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
				autopilotPointer.texcoordY = 1 - posY / canvas.height;
				autopilotPointer.prevTexcoordX = autopilotPointer.texcoordX;
				autopilotPointer.prevTexcoordY = autopilotPointer.texcoordY;
				autopilotPointer.deltaX = 0;
				autopilotPointer.deltaY = 0;
				// A stroke with no explicit color takes a fresh generated one, as
				// a real pointer-down does: the prototype's black would inject
				// invisible dye.
				autopilotPointer.color = color ?? generateColor();
				return;
			}
			updatePointerMoveData(autopilotPointer, posX, posY, color ?? autopilotPointer.color);
		}
		function autopilotPenUp() {
			// `moved` is deliberately left alone: applyInputs consumes and clears
			// it on the next frame, so clearing it here would swallow the final
			// segment of a stroke finished synchronously before that frame.
			penWasUp = true;
			if (autopilotPointer) autopilotPointer.down = false;
		}
		// Top-left origin in, bottom-up texcoords out: flip y and negate dy.
		function autopilotBurst(x: number, y: number, dx: number, dy: number, color: ColorRGB) {
			splat(x, 1 - y, dx, -dy, color);
		}

		// Event Listeners
		function handleMouseDown(e: MouseEvent) {
			const pointer = pointers[0]!;
			const { x: posX, y: posY } = getCanvasPos(e.clientX, e.clientY);
			updatePointerDownData(pointer, -1, posX, posY);
			clickSplat(pointer);
		}

		// The release half of mousedown / touchstart. `down` used to latch true
		// for the life of the engine — nothing on this path reads it, but the
		// pointer is part of the handle's contract and should tell the truth.
		function handlePointerUp() {
			pointers[0]!.down = false;
		}

		function handleFirstMouseMove(e: MouseEvent) {
			const pointer = pointers[0]!;
			const { x: posX, y: posY } = getCanvasPos(e.clientX, e.clientY);
			const color = generateColor();
			updatePointerMoveData(pointer, posX, posY, color);
			document.body.removeEventListener("mousemove", handleFirstMouseMove);
		}

		function handleMouseMove(e: MouseEvent) {
			const pointer = pointers[0]!;
			const { x: posX, y: posY } = getCanvasPos(e.clientX, e.clientY);
			updatePointerMoveData(pointer, posX, posY, pointer.color);
		}

		function handleFirstTouchStart(e: TouchEvent) {
			const touches = e.targetTouches;
			const pointer = pointers[0]!;
			for (let i = 0; i < touches.length; i++) {
				const { x: posX, y: posY } = getCanvasPos(touches[i]!.clientX, touches[i]!.clientY);
				updatePointerDownData(pointer, touches[i]!.identifier, posX, posY);
			}
			document.body.removeEventListener("touchstart", handleFirstTouchStart);
		}

		function handleTouchStart(e: TouchEvent) {
			const touches = e.targetTouches;
			const pointer = pointers[0]!;
			for (let i = 0; i < touches.length; i++) {
				const { x: posX, y: posY } = getCanvasPos(touches[i]!.clientX, touches[i]!.clientY);
				updatePointerDownData(pointer, touches[i]!.identifier, posX, posY);
			}
		}

		function handleTouchMove(e: TouchEvent) {
			const touches = e.targetTouches;
			const pointer = pointers[0]!;
			for (let i = 0; i < touches.length; i++) {
				const { x: posX, y: posY } = getCanvasPos(touches[i]!.clientX, touches[i]!.clientY);
				updatePointerMoveData(pointer, posX, posY, pointer.color);
			}
		}

		// Add event listeners
		if (interactive) {
			window.addEventListener("mousedown", handleMouseDown);
			window.addEventListener("mouseup", handlePointerUp);
			document.body.addEventListener("mousemove", handleFirstMouseMove);
			window.addEventListener("mousemove", handleMouseMove);
			document.body.addEventListener("touchstart", handleFirstTouchStart);
			window.addEventListener("touchstart", handleTouchStart, false);
			window.addEventListener("touchmove", handleTouchMove, false);
			window.addEventListener("touchend", handlePointerUp);
			window.addEventListener("touchcancel", handlePointerUp);
		}

		// Pause animation when scrolled out of view
		let observer: IntersectionObserver | null = null;
		if (pauseWhenHidden) {
			observer = new IntersectionObserver(
				([entry]) => {
					const wasVisible = isVisible;
					// One observed element, so the callback always carries one entry.
					isVisible = entry!.isIntersecting;
					if (isVisible && !wasVisible) {
						lastUpdateTime = Date.now();
						animationFrameId = requestAnimationFrame(updateFrame);
					}
				},
				{ threshold: 0 }
			);
			observer.observe(canvas);
		}

		// Start animation
		updateFrame();
		if (splatOnMount) multipleSplats(Math.floor(random() * 6) + 10);

		// Auto-splat timer
		let autoSplatTimer: ReturnType<typeof setInterval> | null = null;
		if (autoSplat) {
			autoSplatTimer = setInterval(() => {
				const color = generateColor();
				splat(random(), random(), (random() - 0.5) * 200, (random() - 0.5) * 200, color);
			}, autoSplatInterval);
		}

		// Cleanup
		function cleanup() {
			cancelAnimationFrame(animationFrameId);
			if (observer) observer.disconnect();
			if (autoSplatTimer) clearInterval(autoSplatTimer);
			if (interactive) {
				window.removeEventListener("mousedown", handleMouseDown);
				window.removeEventListener("mouseup", handlePointerUp);
				document.body.removeEventListener("mousemove", handleFirstMouseMove);
				window.removeEventListener("mousemove", handleMouseMove);
				document.body.removeEventListener("touchstart", handleFirstTouchStart);
				window.removeEventListener("touchstart", handleTouchStart);
				window.removeEventListener("touchmove", handleTouchMove);
				window.removeEventListener("touchend", handlePointerUp);
				window.removeEventListener("touchcancel", handlePointerUp);
			}
			if (contained) {
				window.removeEventListener("resize", updateCanvasRectCache);
				window.removeEventListener("scroll", updateCanvasRectCache);
			}
			// Hand the GPU memory back, then the context itself. Unlike the React
			// port, a Svelte unmount discards the <canvas> — nothing will call
			// getContext on it again — so a lost context costs nothing, while a
			// live one would hold a slot in the browser's context budget until
			// GC. Guarded: the singleton runs the previous instance's cleanup
			// when a newer one mounts, and the component runs it again on its
			// own unmount.
			if (glDisposed) return;
			glDisposed = true;
			for (const dispose of glDisposers) dispose();
			glDisposers.length = 0;
			gl.getExtension("WEBGL_lose_context")?.loseContext();
		}

		// Register before notifying: a throwing callback must not cost us the
		// cleanup registration (listeners, rAF loop and GL resources would
		// otherwise outlive the component).
		const dispose = registerInstance(cleanup);
		notifyReady({
			moveTo: autopilotMoveTo,
			penUp: autopilotPenUp,
			burst: autopilotBurst,
			renderLevel,
		});

		let destroyed = false;
		return {
			setOptions,
			resize() {
				// The rAF loop re-measures the canvas on every frame, so this is
				// only useful to a host that resizes while the loop is paused. It
				// is deliberately inert once the GL resources are gone.
				if (glDisposed) return;
				updateCanvasRectCache();
				if (resizeCanvas()) initFramebuffers();
			},
			destroy() {
				if (destroyed) return;
				destroyed = true;
				dispose();
			},
		};
	}
}
