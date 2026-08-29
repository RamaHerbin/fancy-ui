// WebGL2 fallback renderer for FireworksHdr.
//
// The counterpart to webgpu-renderer.ts: same `FireworksEngineHandle` seam,
// same 8-float instance format, same renderer-agnostic Sim (fireworks-shared.ts)
// — so FireworksHdr.svelte drives WebGPU and WebGL2 through one code path. This
// is the path taken when WebGPU is unavailable or its canvas configuration is
// rejected (Firefox/Safari without WebGPU, headless, blocked adapters, …).
//
// WebGL has no extended tone mapping: the drawing buffer clamps at 1.0, so the
// output is ALWAYS SDR (the §7 soft-knee ladder, never over-white). The only
// HDR-adjacent lever is a `display-p3` drawing buffer — a wider gamut, more
// saturated, but still SDR luminance. Honesty invariant (mirrored from
// fluid-cursor): the color space is READ BACK after assignment, because setting
// an unsupported value silently leaves the buffer in sRGB; renderLevel is
// "webgl-p3" only when the read-back confirms it, else "webgl-sdr".
//
// Two rendering strategies, chosen by float-buffer support:
//
//   Path A — float accumulation (EXT_color_buffer_float present):
//     Ping-pong two RGBA16F textures, exactly like the WebGPU passes:
//       (a) decay    accum.read × exp(-TRAIL_FADE_RATE·dt) → accum.write
//       (b) particles additive (one/one) velocity-stretched two-lobe quads
//                     into accum.write (kept, not cleared), then swap
//       (c) display  accum.read → default framebuffer, SDR soft-knee ladder
//                     applied to the ACCUMULATED sum (§7 done properly).
//
//   Path B — no float buffers (the honest cheapest fallback):
//     There is no HDR buffer to accumulate into, so render straight to the
//     default framebuffer with `preserveDrawingBuffer` and a blend-based decay:
//       (a) a fullscreen quad multiplies the framebuffer (rgb+alpha) by
//           exp(-TRAIL_FADE_RATE·dt) via blendFuncSeparate(ZERO, 1-SRC_ALPHA);
//       (b) additive particles with the SDR ladder baked PER-PARTICLE (soft-knee
//           + saturation lift) since there is no separate display pass.
//     Trade-off: the tone map is per-particle rather than post-accumulation and
//     the 8-bit buffer hard-clips where bright particles overlap, so trails are
//     a touch weaker and dense cores clip — an accepted degradation (the frame
//     is mostly deep black with surgical bright points, so overlap is rare).

import {
	STRETCH,
	EXPOSURE_AMBIENT,
	SDR_KNEE_START,
	SDR_CORE_SCALE,
	SDR_SAT_BOOST,
	type FireworksRenderLevel,
} from "./fireworks-shared.js";
import {
	TRAIL_FADE_RATE,
	type FireworksEngineHandle,
	type FrameUniforms,
} from "./webgpu-renderer.js";
import { isDev } from "./dev.js";

/** Device-pixel-ratio clamp (matches the WebGPU renderer — fill-rate is the cap). */
const MAX_DPR = 2;

const INSTANCE_FLOATS = 8;
const INSTANCE_STRIDE = INSTANCE_FLOATS * 4; // bytes

export interface WebGl2FireworksOptions {
	/** Max instances the buffer must hold (the resolved tier's capacity). */
	maxInstances: number;
	/** Accumulation resolution scale relative to the canvas (default 1). */
	renderScale?: number;
	/** Initial display exposure — accepted for parity; SDR pins it to 1.0. */
	exposure?: number;
	/** Attempt a `display-p3` drawing buffer (wide-gamut fallback). Default true. */
	hdr?: boolean;
}

function scaleByPixelRatio(input: number): number {
	const dpr = Math.min(typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1, MAX_DPR);
	return Math.floor(input * dpr);
}

/**
 * Whether RGBA16F is color-renderable (EXT_color_buffer_float) on this GPU,
 * checked on a throwaway context so the real canvas can be created with the
 * right `preserveDrawingBuffer` before its one-shot context attributes lock in.
 * Extension availability is a driver capability, so the probe generalizes to
 * the real context. Returns false (→ keep preserveDrawingBuffer) if anything is
 * unavailable, which is the safe default.
 */
function probeFloatAccum(): boolean {
	if (typeof document === "undefined") return false;
	try {
		const probe = document.createElement("canvas").getContext("webgl2");
		if (!probe) return false;
		const has = !!probe.getExtension("EXT_color_buffer_float");
		// Free the probe context promptly rather than waiting for GC.
		probe.getExtension("WEBGL_lose_context")?.loseContext();
		return has;
	} catch {
		return false;
	}
}

// ---- GLSL ES 3.00 shaders ---------------------------------------------------
// Ports of the WGSL in webgpu-renderer.ts. The velocity-stretch and two-lobe
// gaussian math is identical; only the SDR ladder placement differs by path.

const FULLSCREEN_VS = /* glsl */ `#version 300 es
// Fullscreen triangle from gl_VertexID; uv round-trips y consistently with the
// particle pass (clip.y = 1 - 2·posY there, uv = clip·0.5+0.5 here), so nothing
// is flipped and rockets rise upward.
const vec2 P[3] = vec2[3](vec2(-1.0, -3.0), vec2(-1.0, 1.0), vec2(3.0, 1.0));
out vec2 vUv;
void main() {
	vec2 p = P[gl_VertexID];
	gl_Position = vec4(p, 0.0, 1.0);
	vUv = p * 0.5 + 0.5;
}`;

const DECAY_FS = /* glsl */ `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uAccum;
uniform float uFade;
out vec4 frag;
void main() {
	frag = texture(uAccum, vUv) * uFade;
}`;

// Shared soft-knee — byte-for-byte the WGSL `softKnee` and the JS `softKnee`
// in fireworks-shared.ts.
const SOFT_KNEE_GLSL = /* glsl */ `
float softKnee(float x, float knee) {
	if (x <= knee) return x;
	float over = x - knee;
	float span = max(1.0 - knee, 1e-3);
	return knee + span * (1.0 - exp(-over / span));
}
vec3 sdrLadder(vec3 c, float knee, float sat) {
	vec3 k = vec3(softKnee(c.r, knee), softKnee(c.g, knee), softKnee(c.b, knee));
	float luma = dot(k, vec3(0.2126, 0.7152, 0.0722));
	return mix(vec3(luma), k, 1.0 + sat);
}`;

const DISPLAY_FS = /* glsl */ `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uAccum;
uniform float uKnee;
uniform float uSat;
out vec4 frag;
${SOFT_KNEE_GLSL}
void main() {
	// SDR always: exposure pinned to 1.0, soft-knee on the accumulated sum,
	// saturation lift, alpha clamped for premultiplied compositing.
	vec3 c = max(texture(uAccum, vUv).rgb, vec3(0.0));
	vec3 k = sdrLadder(c, uKnee, uSat);
	float a = min(max(k.r, max(k.g, k.b)), 1.0);
	frag = vec4(clamp(k, vec3(0.0), vec3(1.0)), a);
}`;

const PARTICLE_VS = /* glsl */ `#version 300 es
layout(location = 0) in vec2 iPos;    // normalized [0,1], top-left origin
layout(location = 1) in float iSize;  // half-size in screen-heights
layout(location = 2) in vec3 iColor;  // linear RGB · brightness
layout(location = 3) in vec2 iVel;    // velocity · STRETCH (screen-height displacement)
uniform float uAspect;
uniform float uCoreScale; // SDR trades headroom for size (§7.4); always on in WebGL
out vec2 vLocal;
out vec3 vColor;
const vec2 C[4] = vec2[4](vec2(-1.0, -1.0), vec2(1.0, -1.0), vec2(-1.0, 1.0), vec2(1.0, 1.0));
// Quad oversize so the halo can fall to zero before the geometry ends.
const float QUAD_PAD = 1.35;
void main() {
	vec2 c = C[gl_VertexID];
	float size = iSize * uCoreScale;
	float velLen = length(iVel);
	vec2 dir = velLen > 1e-6 ? iVel / velLen : vec2(1.0, 0.0);
	vec2 perp = vec2(-dir.y, dir.x);
	float minorHalf = size * QUAD_PAD;
	float majorHalf = clamp(size + velLen, size, size * 2.5) * QUAD_PAD;
	vec2 off = dir * (majorHalf * c.x) + perp * (minorHalf * c.y);
	vec2 p01 = iPos + vec2(off.x / uAspect, off.y);
	vec2 ndc = vec2(p01.x * 2.0 - 1.0, 1.0 - p01.y * 2.0);
	gl_Position = vec4(ndc, 0.0, 1.0);
	vLocal = c * QUAD_PAD;
	vColor = iColor;
}`;

// Windowed to exactly zero at the quad edge — an unwindowed halo still carries
// ~7% there, which additive blending shows as a hard-edged square.
const PARTICLE_LOBE_GLSL = /* glsl */ `
	const float QUAD_PAD = 1.35;
	float r2 = dot(vLocal, vLocal);
	float core = exp(-r2 * 6.0);
	float halo = exp(-r2 * 1.6) * 0.35;
	float win = smoothstep(QUAD_PAD, QUAD_PAD * 0.6, sqrt(r2));
	float intensity = (core + halo) * win;`;

// Path A particle fragment: raw premultiplied HDR contribution; the display
// pass owns the SDR ladder.
const PARTICLE_FS_ACCUM = /* glsl */ `#version 300 es
precision highp float;
in vec2 vLocal;
in vec3 vColor;
out vec4 frag;
void main() {
${PARTICLE_LOBE_GLSL}
	frag = vec4(vColor * intensity, intensity);
}`;

// Path B particle fragment: no display pass, so the SDR ladder is baked in per
// particle before the additive write clips against the 8-bit framebuffer.
const PARTICLE_FS_DIRECT = /* glsl */ `#version 300 es
precision highp float;
in vec2 vLocal;
in vec3 vColor;
uniform float uKnee;
uniform float uSat;
out vec4 frag;
${SOFT_KNEE_GLSL}
void main() {
${PARTICLE_LOBE_GLSL}
	vec3 c = sdrLadder(vColor * intensity, uKnee, uSat);
	float a = min(max(c.r, max(c.g, c.b)), 1.0);
	frag = vec4(clamp(c, vec3(0.0), vec3(1.0)), a);
}`;

// Path B fade: a fullscreen black quad whose alpha carries the decay factor.
// blendFuncSeparate(ZERO, 1-SRC_ALPHA) multiplies the whole framebuffer
// (rgb AND alpha) by exp(-rate·dt), so empty sky decays back to transparent.
const FADE_FS = /* glsl */ `#version 300 es
precision highp float;
uniform float uAlpha;
out vec4 frag;
void main() {
	frag = vec4(0.0, 0.0, 0.0, uAlpha);
}`;

function compileShader(
	gl: WebGL2RenderingContext,
	type: number,
	source: string
): WebGLShader | null {
	const shader = gl.createShader(type);
	if (!shader) return null;
	gl.shaderSource(shader, source);
	gl.compileShader(shader);
	if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
		if (isDev()) {
			console.warn("[FireworksHdr] WebGL2 shader compile failed:", gl.getShaderInfoLog(shader));
		}
		gl.deleteShader(shader);
		return null;
	}
	return shader;
}

function linkProgram(
	gl: WebGL2RenderingContext,
	vsSrc: string,
	fsSrc: string
): WebGLProgram | null {
	const vs = compileShader(gl, gl.VERTEX_SHADER, vsSrc);
	const fs = compileShader(gl, gl.FRAGMENT_SHADER, fsSrc);
	if (!vs || !fs) {
		if (vs) gl.deleteShader(vs);
		if (fs) gl.deleteShader(fs);
		return null;
	}
	const program = gl.createProgram();
	if (!program) {
		gl.deleteShader(vs);
		gl.deleteShader(fs);
		return null;
	}
	gl.attachShader(program, vs);
	gl.attachShader(program, fs);
	gl.linkProgram(program);
	// Shaders are flagged for deletion; they are freed once detached with the
	// program at destroy() (or immediately if linking failed).
	gl.deleteShader(vs);
	gl.deleteShader(fs);
	if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
		if (isDev()) {
			console.warn("[FireworksHdr] WebGL2 program link failed:", gl.getProgramInfoLog(program));
		}
		gl.deleteProgram(program);
		return null;
	}
	return program;
}

interface DoubleFbo {
	readTex: WebGLTexture;
	writeTex: WebGLTexture;
	readFbo: WebGLFramebuffer;
	writeFbo: WebGLFramebuffer;
	width: number;
	height: number;
	swap(): void;
}

/**
 * Build the WebGL2 fallback renderer, or `null` when WebGL2 is unavailable (no
 * context, missing programs) — the caller then gives up silently (no onReady).
 * Synchronous: WebGL has no async init, but the shape matches the WebGPU seam so
 * the component treats `await startWebGpu…` and `startWebGl2…` uniformly.
 */
export function startWebGl2Fireworks(
	canvas: HTMLCanvasElement,
	opts: WebGl2FireworksOptions
): FireworksEngineHandle | null {
	// Only Path B (no float accumulation) reads the previous frame back for its
	// blend-based decay and therefore needs `preserveDrawingBuffer`; Path A never
	// touches the default framebuffer between frames. Context attributes are
	// fixed at creation and the extension query that selects the path needs a
	// context, so probe a throwaway context first (mirrors the WebGPU
	// detached-probe pattern in webgpu-renderer.ts). EXT_color_buffer_float is a
	// driver capability, so the probe and the real context agree on the same GPU.
	const wantFloatAccum = probeFloatAccum();

	let gl: WebGL2RenderingContext | null;
	try {
		gl = canvas.getContext("webgl2", {
			alpha: true,
			antialias: false,
			depth: false,
			stencil: false,
			premultipliedAlpha: true,
			// False on Path A (the common HDR-float fallback) — a real fill-rate/
			// memory saving; true only where Path B's frame-to-frame readback needs it.
			preserveDrawingBuffer: !wantFloatAccum,
		}) as WebGL2RenderingContext | null;
	} catch {
		gl = null;
	}
	if (!gl) return null;
	const glc = gl; // non-null alias for closures

	// HDR-adjacent: a display-p3 drawing buffer. Assigning an unsupported value
	// silently no-ops, so the property is READ BACK to decide the honest level.
	const wantP3 = opts.hdr ?? true;
	let renderLevel: FireworksRenderLevel = "webgl-sdr";
	if (wantP3 && "drawingBufferColorSpace" in glc) {
		try {
			(
				glc as WebGL2RenderingContext & { drawingBufferColorSpace: string }
			).drawingBufferColorSpace = "display-p3";
			if (
				(glc as WebGL2RenderingContext & { drawingBufferColorSpace: string })
					.drawingBufferColorSpace === "display-p3"
			) {
				renderLevel = "webgl-p3";
			}
		} catch {
			// Unsupported color space: the buffer stays sRGB (webgl-sdr).
		}
	}
	if (isDev()) {
		console.info(
			renderLevel === "webgl-p3"
				? "[FireworksHdr] WebGL2 fallback: webgl-p3 (wide-gamut drawing buffer)"
				: "[FireworksHdr] WebGL2 fallback: webgl-sdr"
		);
	}

	// Float accumulation needs RGBA16F to be color-renderable (this extension) —
	// its absence selects the blend-based Path B. RGBA16F is texture-filterable
	// in core WebGL2, so no linear-filter extension is required.
	const floatAccum = !!glc.getExtension("EXT_color_buffer_float");

	// Defensive: the probe and the real context should always agree on the same
	// GPU. If they somehow disagree such that we disabled preserveDrawingBuffer
	// (expecting Path A) but the real context lacks float — Path B without its
	// required readback — bail cleanly rather than render a flickering buffer.
	// (No listeners/resources are allocated yet at this point.)
	if (wantFloatAccum && !floatAccum) {
		if (isDev()) {
			console.warn(
				"[FireworksHdr] WebGL2 float-accum probe/context mismatch; bailing to static fallback"
			);
		}
		return null;
	}

	let renderScale = opts.renderScale ?? 1;
	const instanceCapacity = Math.max(1, opts.maxInstances);
	// Accepted for API parity; the SDR path never applies exposure (§7.1), so it
	// is only stored for potential diagnostics.
	let exposure = clampExposure(opts.exposure ?? EXPOSURE_AMBIENT);

	let destroyed = false;
	let lost = false;
	function onContextLost(e: Event) {
		e.preventDefault(); // a prevented default keeps restore possible; we just stop
		lost = true;
		if (isDev()) console.warn("[FireworksHdr] WebGL2 context lost");
	}
	canvas.addEventListener("webglcontextlost", onContextLost, false);

	// --- GPU resources -------------------------------------------------------
	// All declared up front (and initialized to null) so `cleanupPartial` can run
	// at any early bail without tripping the temporal dead zone.
	let accum: DoubleFbo | null = null;
	let particleProgram: WebGLProgram | null = null;
	let decayProgram: WebGLProgram | null = null;
	let displayProgram: WebGLProgram | null = null;
	let fadeProgram: WebGLProgram | null = null;
	let instanceBuffer: WebGLBuffer | null = null;
	let particleVao: WebGLVertexArrayObject | null = null;
	let fullscreenVao: WebGLVertexArrayObject | null = null;

	function cleanupPartial() {
		canvas.removeEventListener("webglcontextlost", onContextLost, false);
		if (particleProgram) glc.deleteProgram(particleProgram);
		if (decayProgram) glc.deleteProgram(decayProgram);
		if (displayProgram) glc.deleteProgram(displayProgram);
		if (fadeProgram) glc.deleteProgram(fadeProgram);
		if (instanceBuffer) glc.deleteBuffer(instanceBuffer);
		if (particleVao) glc.deleteVertexArray(particleVao);
		if (fullscreenVao) glc.deleteVertexArray(fullscreenVao);
		destroyAccum();
	}

	// --- programs ------------------------------------------------------------
	particleProgram = linkProgram(
		glc,
		PARTICLE_VS,
		floatAccum ? PARTICLE_FS_ACCUM : PARTICLE_FS_DIRECT
	);
	decayProgram = floatAccum ? linkProgram(glc, FULLSCREEN_VS, DECAY_FS) : null;
	displayProgram = floatAccum ? linkProgram(glc, FULLSCREEN_VS, DISPLAY_FS) : null;
	fadeProgram = floatAccum ? null : linkProgram(glc, FULLSCREEN_VS, FADE_FS);

	const programsOk = floatAccum
		? particleProgram && decayProgram && displayProgram
		: particleProgram && fadeProgram;
	if (!programsOk) {
		if (isDev()) console.warn("[FireworksHdr] WebGL2 program setup failed");
		cleanupPartial();
		return null;
	}

	// Uniform locations.
	const uAspect = glc.getUniformLocation(particleProgram!, "uAspect");
	const uCoreScale = glc.getUniformLocation(particleProgram!, "uCoreScale");
	const uPartKnee = floatAccum ? null : glc.getUniformLocation(particleProgram!, "uKnee");
	const uPartSat = floatAccum ? null : glc.getUniformLocation(particleProgram!, "uSat");
	const uDecayFade = decayProgram ? glc.getUniformLocation(decayProgram, "uFade") : null;
	const uDecayAccum = decayProgram ? glc.getUniformLocation(decayProgram, "uAccum") : null;
	const uDispAccum = displayProgram ? glc.getUniformLocation(displayProgram, "uAccum") : null;
	const uDispKnee = displayProgram ? glc.getUniformLocation(displayProgram, "uKnee") : null;
	const uDispSat = displayProgram ? glc.getUniformLocation(displayProgram, "uSat") : null;
	const uFadeAlpha = fadeProgram ? glc.getUniformLocation(fadeProgram, "uAlpha") : null;

	// --- geometry: instance VBO + VAOs --------------------------------------
	instanceBuffer = glc.createBuffer();
	particleVao = glc.createVertexArray();
	fullscreenVao = glc.createVertexArray(); // empty; fullscreen/fade draws
	if (!instanceBuffer || !particleVao || !fullscreenVao) {
		cleanupPartial();
		return null;
	}
	glc.bindVertexArray(particleVao);
	glc.bindBuffer(glc.ARRAY_BUFFER, instanceBuffer);
	glc.bufferData(glc.ARRAY_BUFFER, instanceCapacity * INSTANCE_STRIDE, glc.DYNAMIC_DRAW);
	// All four attributes are per-instance (divisor 1); the quad corner comes
	// from gl_VertexID, so there is no per-vertex attribute.
	glc.enableVertexAttribArray(0);
	glc.vertexAttribPointer(0, 2, glc.FLOAT, false, INSTANCE_STRIDE, 0);
	glc.vertexAttribDivisor(0, 1);
	glc.enableVertexAttribArray(1);
	glc.vertexAttribPointer(1, 1, glc.FLOAT, false, INSTANCE_STRIDE, 8);
	glc.vertexAttribDivisor(1, 1);
	glc.enableVertexAttribArray(2);
	glc.vertexAttribPointer(2, 3, glc.FLOAT, false, INSTANCE_STRIDE, 12);
	glc.vertexAttribDivisor(2, 1);
	glc.enableVertexAttribArray(3);
	glc.vertexAttribPointer(3, 2, glc.FLOAT, false, INSTANCE_STRIDE, 24);
	glc.vertexAttribDivisor(3, 1);
	glc.bindVertexArray(null);

	// --- accumulation textures (Path A only) --------------------------------
	function makeAccumTex(w: number, h: number): WebGLTexture | null {
		const tex = glc.createTexture();
		if (!tex) return null;
		glc.bindTexture(glc.TEXTURE_2D, tex);
		glc.texImage2D(glc.TEXTURE_2D, 0, glc.RGBA16F, w, h, 0, glc.RGBA, glc.HALF_FLOAT, null);
		glc.texParameteri(glc.TEXTURE_2D, glc.TEXTURE_MIN_FILTER, glc.LINEAR);
		glc.texParameteri(glc.TEXTURE_2D, glc.TEXTURE_MAG_FILTER, glc.LINEAR);
		glc.texParameteri(glc.TEXTURE_2D, glc.TEXTURE_WRAP_S, glc.CLAMP_TO_EDGE);
		glc.texParameteri(glc.TEXTURE_2D, glc.TEXTURE_WRAP_T, glc.CLAMP_TO_EDGE);
		return tex;
	}

	function makeFbo(tex: WebGLTexture): WebGLFramebuffer | null {
		const fbo = glc.createFramebuffer();
		if (!fbo) return null;
		glc.bindFramebuffer(glc.FRAMEBUFFER, fbo);
		glc.framebufferTexture2D(glc.FRAMEBUFFER, glc.COLOR_ATTACHMENT0, glc.TEXTURE_2D, tex, 0);
		// Clear to transparent black so the first decay reads a clean buffer.
		glc.clearColor(0, 0, 0, 0);
		glc.clear(glc.COLOR_BUFFER_BIT);
		if (glc.checkFramebufferStatus(glc.FRAMEBUFFER) !== glc.FRAMEBUFFER_COMPLETE) {
			glc.deleteFramebuffer(fbo);
			return null;
		}
		return fbo;
	}

	function destroyAccum() {
		if (!accum) return;
		glc.deleteTexture(accum.readTex);
		glc.deleteTexture(accum.writeTex);
		glc.deleteFramebuffer(accum.readFbo);
		glc.deleteFramebuffer(accum.writeFbo);
		accum = null;
	}

	function initAccum(w: number, h: number): boolean {
		if (!floatAccum) return true; // Path B keeps no accumulation textures
		const aw = Math.max(1, Math.round(w * renderScale));
		const ah = Math.max(1, Math.round(h * renderScale));
		if (accum && accum.width === aw && accum.height === ah) return true;
		destroyAccum();
		const rt = makeAccumTex(aw, ah);
		const wt = makeAccumTex(aw, ah);
		if (!rt || !wt) {
			if (rt) glc.deleteTexture(rt);
			if (wt) glc.deleteTexture(wt);
			return false;
		}
		const rf = makeFbo(rt);
		const wf = makeFbo(wt);
		if (!rf || !wf) {
			glc.deleteTexture(rt);
			glc.deleteTexture(wt);
			if (rf) glc.deleteFramebuffer(rf);
			if (wf) glc.deleteFramebuffer(wf);
			return false;
		}
		accum = {
			readTex: rt,
			writeTex: wt,
			readFbo: rf,
			writeFbo: wf,
			width: aw,
			height: ah,
			swap() {
				let t: WebGLTexture | WebGLFramebuffer = this.readTex;
				this.readTex = this.writeTex;
				this.writeTex = t as WebGLTexture;
				t = this.readFbo;
				this.readFbo = this.writeFbo;
				this.writeFbo = t as WebGLFramebuffer;
			},
		};
		return true;
	}

	function resizeIfNeeded() {
		if (destroyed || lost) return;
		const w = scaleByPixelRatio(canvas.clientWidth);
		const h = scaleByPixelRatio(canvas.clientHeight);
		if (w > 0 && h > 0 && (canvas.width !== w || canvas.height !== h)) {
			canvas.width = w;
			canvas.height = h;
			initAccum(w, h);
		}
	}

	function setRenderScale(scale: number) {
		if (destroyed || lost) return;
		const next = Number.isFinite(scale) ? Math.max(0.25, Math.min(1, scale)) : 1;
		if (next === renderScale) return;
		renderScale = next;
		// Only the float-accumulation path (A) has a resolution-scaled buffer to
		// rebuild; Path B renders straight to the (full-res) default framebuffer,
		// so renderScale is inert there — the adaptive controller then falls
		// through to the spawn-density lever for relief.
		if (floatAccum && canvas.width > 0 && canvas.height > 0) initAccum(canvas.width, canvas.height);
	}

	function frame(
		dt: number,
		instanceData: Float32Array<ArrayBuffer>,
		liveCount: number,
		uniforms: FrameUniforms
	) {
		if (destroyed || lost) return;
		exposure = clampExposure(uniforms.exposure);
		const count = Math.max(0, Math.min(liveCount, instanceCapacity));
		const fade = Math.exp(-TRAIL_FADE_RATE * Math.max(0, dt));
		const aspect = canvas.width / Math.max(1, canvas.height);

		// Upload live instances once per frame. Orphan the buffer first
		// (reallocate its full store) so the driver doesn't stall waiting for the
		// previous frame's draw to finish reading it — the standard streaming-VBO
		// trick for a per-frame ~80–128 KB bufferSubData. Only [0,count) is drawn,
		// so the uninitialized tail is never sampled.
		if (count > 0) {
			glc.bindBuffer(glc.ARRAY_BUFFER, instanceBuffer);
			glc.bufferData(glc.ARRAY_BUFFER, instanceCapacity * INSTANCE_STRIDE, glc.DYNAMIC_DRAW);
			glc.bufferSubData(glc.ARRAY_BUFFER, 0, instanceData, 0, count * INSTANCE_FLOATS);
		}

		if (floatAccum) {
			if (!accum) return;
			// (a) decay: accum.read × fade → accum.write.
			glc.bindFramebuffer(glc.FRAMEBUFFER, accum.writeFbo);
			glc.viewport(0, 0, accum.width, accum.height);
			glc.disable(glc.BLEND);
			glc.useProgram(decayProgram!);
			glc.uniform1f(uDecayFade, fade);
			glc.activeTexture(glc.TEXTURE0);
			glc.bindTexture(glc.TEXTURE_2D, accum.readTex);
			glc.uniform1i(uDecayAccum, 0);
			glc.bindVertexArray(fullscreenVao);
			glc.drawArrays(glc.TRIANGLES, 0, 3);

			// (b) particles: additive into accum.write (kept, not cleared).
			if (count > 0) {
				glc.useProgram(particleProgram!);
				glc.uniform1f(uAspect, aspect);
				glc.uniform1f(uCoreScale, SDR_CORE_SCALE);
				glc.enable(glc.BLEND);
				glc.blendEquation(glc.FUNC_ADD);
				glc.blendFunc(glc.ONE, glc.ONE);
				glc.bindVertexArray(particleVao);
				glc.drawArraysInstanced(glc.TRIANGLE_STRIP, 0, 4, count);
			}

			// The freshly-written buffer becomes the read source for display and
			// for next frame's decay.
			accum.swap();

			// (c) display: accum.read → default framebuffer, SDR ladder.
			glc.bindFramebuffer(glc.FRAMEBUFFER, null);
			glc.viewport(0, 0, canvas.width, canvas.height);
			glc.disable(glc.BLEND);
			glc.useProgram(displayProgram!);
			glc.uniform1f(uDispKnee, SDR_KNEE_START);
			glc.uniform1f(uDispSat, SDR_SAT_BOOST);
			glc.activeTexture(glc.TEXTURE0);
			glc.bindTexture(glc.TEXTURE_2D, accum.readTex);
			glc.uniform1i(uDispAccum, 0);
			glc.bindVertexArray(fullscreenVao);
			glc.drawArrays(glc.TRIANGLES, 0, 3);
			glc.bindVertexArray(null);
			return;
		}

		// Path B — straight to the default framebuffer.
		glc.bindFramebuffer(glc.FRAMEBUFFER, null);
		glc.viewport(0, 0, canvas.width, canvas.height);

		// (a) fade the whole buffer (rgb+alpha) by exp(-rate·dt).
		glc.useProgram(fadeProgram!);
		glc.uniform1f(uFadeAlpha, 1 - fade);
		glc.enable(glc.BLEND);
		glc.blendEquation(glc.FUNC_ADD);
		glc.blendFuncSeparate(glc.ZERO, glc.ONE_MINUS_SRC_ALPHA, glc.ZERO, glc.ONE_MINUS_SRC_ALPHA);
		glc.bindVertexArray(fullscreenVao);
		glc.drawArrays(glc.TRIANGLES, 0, 3);

		// (b) additive particles with the SDR ladder baked in.
		if (count > 0) {
			glc.useProgram(particleProgram!);
			glc.uniform1f(uAspect, aspect);
			glc.uniform1f(uCoreScale, SDR_CORE_SCALE);
			glc.uniform1f(uPartKnee, SDR_KNEE_START);
			glc.uniform1f(uPartSat, SDR_SAT_BOOST);
			glc.blendFunc(glc.ONE, glc.ONE);
			glc.bindVertexArray(particleVao);
			glc.drawArraysInstanced(glc.TRIANGLE_STRIP, 0, 4, count);
		}
		glc.bindVertexArray(null);
	}

	// Prime the drawing buffer + accumulation textures at the current size.
	{
		const w = scaleByPixelRatio(canvas.clientWidth) || 1;
		const h = scaleByPixelRatio(canvas.clientHeight) || 1;
		canvas.width = w;
		canvas.height = h;
		if (!initAccum(w, h)) {
			// Float path advertised but the FBOs would not complete: bail cleanly.
			cleanupPartial();
			return null;
		}
	}

	return {
		frame,
		resizeIfNeeded,
		setRenderScale,
		extendedToneMapping: false, // WebGL has no extended tone mapping — always SDR
		renderLevel,
		get lost() {
			return lost;
		},
		instanceCapacity,
		destroy() {
			destroyed = true;
			cleanupPartial();
		},
	};
}

function clampExposure(v: number): number {
	if (!Number.isFinite(v)) return 1;
	return Math.max(1, Math.min(4, v));
}

export { STRETCH };
