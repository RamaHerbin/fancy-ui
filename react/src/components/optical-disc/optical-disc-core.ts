/**
 * OpticalDisc engine: one fragment shader that ray-casts a thin disc, prints a
 * label on one side and lays a diffraction grating over a mirror on the other.
 *
 * Framework-free and shared byte-for-byte by the Svelte, React and Vue
 * wrappers (see shared-cores.json). Nothing here touches the DOM at import
 * time; `createOpticalDisc` is the only entry that needs a browser.
 *
 * The grating is the real one, simplified. The tracks of a disc are concentric,
 * so at every point the surface is periodic along the radius. For a light
 * direction L and a view direction V, the path difference between two
 * neighbouring tracks is `pitch * dot(L + V, radial)`; a wavelength shows up
 * where that difference is a whole number of wavelengths. The shader evaluates
 * the first few orders per pixel and per light, which is what splits each
 * highlight into the familiar wedges of colour.
 */

export interface OpticalDiscElements {
	canvas: HTMLCanvasElement;
}

export interface OpticalDiscLiveOptions {
	/** Seconds per full turn. 0 keeps the disc still; negative turns the other way. */
	spin?: number;
	/** Lean of the spin axis toward the viewer, in degrees. */
	tilt?: number;
	/** Strength of the diffraction colours. 0 leaves a plain mirror. */
	iridescence?: number;
	/** Track pitch in nanometres. Smaller spreads the colours wider. */
	pitch?: number;
	/** Image printed on the label side. `null` keeps the built-in label. */
	label?: string | null;
	/** Label paper colour, `#rgb` or `#rrggbb`. */
	labelColor?: string;
	/** Tint of the clear hub, `#rgb` or `#rrggbb`. */
	tint?: string;
	/** Drag to turn the disc. */
	interactive?: boolean;
	/** No automatic spin and no coasting after a drag. */
	reducedMotion?: boolean;
}

export interface OpticalDiscInitOptions extends OpticalDiscLiveOptions {
	/** Starting angle in degrees. 0 faces the label to the viewer, 180 the mirror. */
	angle?: number;
	/**
	 * Lose the WebGL context on destroy. Leave on unless the same canvas element
	 * is handed to a second engine afterwards (a context cannot be un-lost).
	 */
	releaseContext?: boolean;
}

export interface OpticalDiscEngine {
	setOptions(options: OpticalDiscLiveOptions): void;
	/** Current angle in degrees, for tests and for wrappers that persist it. */
	getAngle(): number;
	destroy(): void;
}

export const OPTICAL_DISC_DEFAULTS = {
	spin: 9,
	tilt: 14,
	iridescence: 1,
	pitch: 1600,
	labelColor: "#f2f1ee",
	tint: "#6f9ef0",
	angle: -24,
} as const;

/** Device pixel ratio above this is not worth its fill cost for a soft effect. */
export const MAX_PIXEL_RATIO = 2;
/** Longest step the motion integrates, so a background tab does not teleport. */
export const MAX_STEP = 1 / 20;
/** Per-second decay of the extra speed a drag leaves behind. */
export const COAST_DECAY = 1.6;
/** Extra speed below this (radians per second) counts as settled. */
export const COAST_EPSILON = 0.02;
/** How fast a dragged lean returns to rest, per second. */
export const LEAN_RETURN = 5;

const TAU = Math.PI * 2;

/**
 * CSS background of the flat stand-in shown on the server, before the first
 * frame and without WebGL: hole, clear hub, grey ring, then label paper.
 */
export function fallbackBackground(paper: string): string {
	return `radial-gradient(circle closest-side, transparent 12%, rgb(128 128 128 / 0.25) 12.5% 33%, #9a9ea8 33.5% 38%, ${paper} 38.5%)`;
}

/** Parse `#rgb` / `#rrggbb` to 0..1 components; anything else gives the fallback. */
export function parseHexColor(
	value: string | undefined,
	fallback: readonly [number, number, number]
): [number, number, number] {
	if (!value) return [fallback[0], fallback[1], fallback[2]];
	const hex = value.trim().replace(/^#/, "");
	const full =
		hex.length === 3
			? hex
					.split("")
					.map((c) => c + c)
					.join("")
			: hex;
	if (!/^[0-9a-fA-F]{6}$/.test(full)) return [fallback[0], fallback[1], fallback[2]];
	const n = Number.parseInt(full, 16);
	return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

/** Radians per second for a `spin` given in seconds per turn. */
export function spinRate(spin: number, reducedMotion: boolean): number {
	if (reducedMotion || !Number.isFinite(spin) || spin === 0) return 0;
	return TAU / spin;
}

export interface DiscMotion {
	/** Angle around the vertical axis, radians. */
	yaw: number;
	/** Speed added by the last drag, radians per second, decaying to 0. */
	coast: number;
	/** Extra lean from a vertical drag, radians, returning to 0. */
	lean: number;
}

/**
 * Advance the motion by `dt` seconds. Pure, so the feel is unit-tested without
 * a clock: base spin plus a decaying coast, and a lean that eases home.
 */
export function stepMotion(
	motion: DiscMotion,
	dt: number,
	rate: number,
	dragging: boolean
): DiscMotion {
	const step = Math.min(Math.max(dt, 0), MAX_STEP);
	if (dragging) return motion;
	const decay = Math.exp(-COAST_DECAY * step);
	const coast = Math.abs(motion.coast) < COAST_EPSILON ? 0 : motion.coast * decay;
	const lean = Math.abs(motion.lean) < 1e-4 ? 0 : motion.lean * Math.exp(-LEAN_RETURN * step);
	return { yaw: motion.yaw + (rate + coast) * step, coast, lean };
}

/** True while another frame would look different from the current one. */
export function isMoving(motion: DiscMotion, rate: number, dragging: boolean): boolean {
	return dragging || rate !== 0 || motion.coast !== 0 || motion.lean !== 0;
}

export const VERTEX_SHADER = `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

export const FRAGMENT_SHADER = `
precision highp float;

uniform vec2 uRes;
uniform float uYaw;
uniform float uTilt;
uniform float uIridescence;
uniform float uPitch;
uniform float uHasLabel;
uniform vec3 uLabelColor;
uniform vec3 uTint;
uniform sampler2D uLabel;

const float HALF_THICKNESS = 0.011;
const float R_HOLE = 0.125;
const float R_CLEAR = 0.335;
const float R_HUB = 0.385;
const float R_DATA = 0.972;
const float CAMERA = 4.2;
const float FOCAL = 3.55;

mat3 rotX(float a) { float c = cos(a), s = sin(a); return mat3(1.0, 0.0, 0.0, 0.0, c, s, 0.0, -s, c); }
mat3 rotY(float a) { float c = cos(a), s = sin(a); return mat3(c, 0.0, -s, 0.0, 1.0, 0.0, s, 0.0, c); }

float bump(float x, float centre, float width) {
	float d = (x - centre) / width;
	return exp(-0.5 * d * d);
}

// Wavelength in nanometres to RGB: three response bumps plus the short-wave
// red lobe that makes violet read as violet.
vec3 spectrum(float nm) {
	float fade = smoothstep(380.0, 420.0, nm) * (1.0 - smoothstep(680.0, 760.0, nm));
	vec3 c = vec3(
		bump(nm, 605.0, 42.0) + 0.32 * bump(nm, 440.0, 18.0),
		bump(nm, 540.0, 38.0),
		bump(nm, 455.0, 30.0)
	);
	return c * fade;
}

// A stand-in for the room: dark floor, bright overhead band and one soft
// window, so the mirror breathes between dark and light while the disc turns.
vec3 room(vec3 dir) {
	float up = dir.y * 0.5 + 0.5;
	vec3 c = mix(vec3(0.07, 0.08, 0.10), vec3(0.62, 0.68, 0.76), smoothstep(0.15, 0.95, up));
	c += vec3(0.55) * bump(dir.x, 0.35, 0.22) * smoothstep(0.2, 0.8, up);
	return c;
}

vec3 lightDir(int i) {
	if (i == 0) return normalize(vec3(0.35, 0.75, 1.0));
	if (i == 1) return normalize(vec3(-0.85, 0.15, 0.7));
	return normalize(vec3(0.25, -0.9, 0.6));
}

vec3 lightColor(int i) {
	if (i == 0) return vec3(1.0, 0.98, 0.94);
	if (i == 1) return vec3(0.55, 0.62, 0.75);
	return vec3(0.5, 0.45, 0.4);
}

vec3 builtInLabel(vec2 q, float r) {
	// Three printed rules in the lower half and one ring near the edge.
	float rule = 0.0;
	for (int i = 0; i < 3; i++) {
		float y = -0.42 - float(i) * 0.13;
		rule += (1.0 - smoothstep(0.004, 0.009, abs(q.y - y))) * step(abs(q.x), 0.62);
	}
	float ring = 1.0 - smoothstep(0.003, 0.008, abs(r - 0.935));
	return mix(uLabelColor, uLabelColor * 0.62, clamp(rule * 0.7 + ring * 0.5, 0.0, 1.0));
}

vec4 shade(vec2 frag) {
	vec2 uv = (frag - 0.5 * uRes) / (0.5 * min(uRes.x, uRes.y));
	mat3 rot = rotY(uYaw) * rotX(uTilt);
	mat3 inv = mat3(
		rot[0][0], rot[1][0], rot[2][0],
		rot[0][1], rot[1][1], rot[2][1],
		rot[0][2], rot[1][2], rot[2][2]
	);
	// Work in the disc's own frame: the disc is the slab |z| < HALF_THICKNESS.
	vec3 ro = inv * vec3(0.0, 0.0, CAMERA);
	vec3 rd = inv * normalize(vec3(uv, -FOCAL));

	float side = rd.z < 0.0 ? 1.0 : -1.0;
	float tFace = (side * HALF_THICKNESS - ro.z) / rd.z;
	vec3 p = ro + rd * tFace;
	float r = length(p.xy);

	if (r > 1.0) {
		// Missed the face: maybe the rim.
		float a = dot(rd.xy, rd.xy);
		float b = dot(ro.xy, rd.xy);
		float c = dot(ro.xy, ro.xy) - 1.0;
		float h = b * b - a * c;
		if (h < 0.0) return vec4(0.0);
		vec3 e = ro + rd * ((-b - sqrt(h)) / a);
		if (abs(e.z) > HALF_THICKNESS) return vec4(0.0);
		vec3 rim = mix(vec3(0.55, 0.58, 0.62), room(rot * reflect(rd, vec3(e.xy, 0.0))), 0.6);
		return vec4(rim, 1.0) * 0.92;
	}
	if (r < R_HOLE) return vec4(0.0);

	vec3 n = vec3(0.0, 0.0, side);
	vec3 v = -rd;
	vec3 refl = rot * reflect(rd, n);
	float fresnel = pow(1.0 - abs(rd.z), 4.0);
	vec3 radial = vec3(p.xy / r, 0.0);
	vec3 track = vec3(-radial.y, radial.x, 0.0);

	// The lights stand in the room in front of the disc; bring them into its frame.
	vec3 glare = vec3(0.0);
	vec3 sheen = vec3(0.0);
	vec3 rainbow = vec3(0.0);
	float lambert = 0.0;
	for (int i = 0; i < 3; i++) {
		vec3 l = inv * lightDir(i);
		float facing = l.z * side;
		if (facing <= 0.0) continue;
		vec3 lc = lightColor(i) * smoothstep(0.0, 0.25, facing);
		lambert += facing * dot(lightColor(i), vec3(0.333));
		vec3 hv = l + v;
		float across = dot(hv, radial);
		float along = dot(hv, track);
		glare += lc * exp(-(across * across + along * along) / 0.005);
		// Light only leaves the grating in the plane across the tracks.
		sheen += lc * exp(-(along * along) / 0.006) * exp(-(across * across) / 0.5);
		float fan = exp(-(along * along) / 0.05);
		vec3 orders = vec3(0.0);
		for (int k = 1; k <= 5; k++) {
			orders += spectrum(uPitch * abs(across) / float(k)) / float(k);
		}
		rainbow += lc * orders * fan;
	}

	if (r < R_CLEAR) {
		// Clear hub: mostly see-through, a stacking ring, a lip at the hole.
		float ring = 1.0 - smoothstep(0.004, 0.012, abs(r - 0.292));
		float lip = 1.0 - smoothstep(0.0, 0.012, r - R_HOLE);
		float alpha = 0.22 + 0.35 * fresnel + 0.4 * ring + 0.5 * lip;
		vec3 col = mix(uTint, vec3(1.0), 0.3) * 0.9 + room(refl) * (0.15 + 0.5 * fresnel) + glare * 0.6;
		alpha = clamp(alpha + dot(glare, vec3(0.3)), 0.0, 1.0);
		return vec4(col * alpha, alpha);
	}

	if (side > 0.0) {
		vec3 col;
		if (r < R_HUB) {
			col = vec3(0.60, 0.62, 0.66) + room(refl) * 0.25;
		} else {
			vec3 ink = builtInLabel(p.xy, r);
			if (uHasLabel > 0.5) {
				vec4 art = texture2D(uLabel, p.xy * vec2(0.5, -0.5) + 0.5);
				ink = mix(ink, art.rgb, art.a);
			}
			col = ink * (0.66 + 0.34 * min(lambert, 1.0));
		}
		col += room(refl) * (0.04 + 0.35 * fresnel) + glare * 0.5;
		return vec4(col, 1.0);
	}

	// Data side: a mirror, with the grating between the hub and the outer edge.
	vec3 col = room(refl) * 0.85 + glare * 1.6;
	if (r >= R_HUB && r <= R_DATA) {
		float lead = smoothstep(R_HUB, R_HUB + 0.012, r) * (1.0 - smoothstep(R_DATA - 0.01, R_DATA, r));
		col = col * 0.8 + (rainbow * 1.5 * uIridescence + sheen * 0.55) * lead;
		// The faint band where a burn stopped.
		col *= 1.0 - 0.05 * smoothstep(0.68, 0.685, r);
	} else {
		col = col * 0.9 + vec3(0.08);
	}
	col += vec3(0.5) * fresnel;
	return vec4(col, 1.0);
}

void main() {
	// Four rotated-grid taps: the silhouette is analytic, so this is the antialiasing.
	vec4 acc = shade(gl_FragCoord.xy + vec2(-0.375, -0.125));
	acc += shade(gl_FragCoord.xy + vec2(0.125, -0.375));
	acc += shade(gl_FragCoord.xy + vec2(0.375, 0.125));
	acc += shade(gl_FragCoord.xy + vec2(-0.125, 0.375));
	gl_FragColor = acc * 0.25;
}
`;

const UNIFORMS = [
	"uRes",
	"uYaw",
	"uTilt",
	"uIridescence",
	"uPitch",
	"uHasLabel",
	"uLabelColor",
	"uTint",
	"uLabel",
] as const;

type UniformName = (typeof UNIFORMS)[number];

function compile(gl: WebGLRenderingContext, type: number, source: string): WebGLShader | null {
	const shader = gl.createShader(type);
	if (!shader) return null;
	gl.shaderSource(shader, source);
	gl.compileShader(shader);
	if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
		gl.deleteShader(shader);
		return null;
	}
	return shader;
}

/**
 * Start the disc on `canvas`. Returns `null` when WebGL is unavailable or the
 * shader does not compile, so a wrapper can leave its fallback showing.
 */
export function createOpticalDisc(
	elements: OpticalDiscElements,
	options: OpticalDiscInitOptions = {}
): OpticalDiscEngine | null {
	const { canvas } = elements;
	const releaseContext = options.releaseContext ?? true;

	let gl: WebGLRenderingContext | null = null;
	try {
		gl = canvas.getContext("webgl", {
			alpha: true,
			premultipliedAlpha: true,
			antialias: false,
			powerPreference: "low-power",
		}) as WebGLRenderingContext | null;
	} catch {
		gl = null;
	}
	if (!gl) return null;
	const context = gl;

	const vertex = compile(context, context.VERTEX_SHADER, VERTEX_SHADER);
	const fragment = compile(context, context.FRAGMENT_SHADER, FRAGMENT_SHADER);
	const program = context.createProgram();
	if (!vertex || !fragment || !program) {
		if (vertex) context.deleteShader(vertex);
		if (fragment) context.deleteShader(fragment);
		if (program) context.deleteProgram(program);
		return null;
	}
	context.attachShader(program, vertex);
	context.attachShader(program, fragment);
	context.bindAttribLocation(program, 0, "aPos");
	context.linkProgram(program);
	// Linked or not, the program keeps what it needs; the shader objects can go.
	context.deleteShader(vertex);
	context.deleteShader(fragment);
	if (!context.getProgramParameter(program, context.LINK_STATUS)) {
		context.deleteProgram(program);
		return null;
	}
	context.useProgram(program);

	const buffer = context.createBuffer();
	context.bindBuffer(context.ARRAY_BUFFER, buffer);
	context.bufferData(
		context.ARRAY_BUFFER,
		new Float32Array([-1, -1, 3, -1, -1, 3]),
		context.STATIC_DRAW
	);
	context.enableVertexAttribArray(0);
	context.vertexAttribPointer(0, 2, context.FLOAT, false, 0, 0);

	const uniforms = {} as Record<UniformName, WebGLUniformLocation | null>;
	for (const name of UNIFORMS) uniforms[name] = context.getUniformLocation(program, name);

	const texture = context.createTexture();
	context.bindTexture(context.TEXTURE_2D, texture);
	context.texParameteri(context.TEXTURE_2D, context.TEXTURE_MIN_FILTER, context.LINEAR);
	context.texParameteri(context.TEXTURE_2D, context.TEXTURE_MAG_FILTER, context.LINEAR);
	context.texParameteri(context.TEXTURE_2D, context.TEXTURE_WRAP_S, context.CLAMP_TO_EDGE);
	context.texParameteri(context.TEXTURE_2D, context.TEXTURE_WRAP_T, context.CLAMP_TO_EDGE);
	context.texImage2D(
		context.TEXTURE_2D,
		0,
		context.RGBA,
		1,
		1,
		0,
		context.RGBA,
		context.UNSIGNED_BYTE,
		new Uint8Array([0, 0, 0, 0])
	);
	context.uniform1i(uniforms.uLabel, 0);
	context.disable(context.DEPTH_TEST);
	context.clearColor(0, 0, 0, 0);

	const live: Required<Omit<OpticalDiscLiveOptions, "label">> & { label: string | null } = {
		spin: options.spin ?? OPTICAL_DISC_DEFAULTS.spin,
		tilt: options.tilt ?? OPTICAL_DISC_DEFAULTS.tilt,
		iridescence: options.iridescence ?? OPTICAL_DISC_DEFAULTS.iridescence,
		pitch: options.pitch ?? OPTICAL_DISC_DEFAULTS.pitch,
		label: null,
		labelColor: options.labelColor ?? OPTICAL_DISC_DEFAULTS.labelColor,
		tint: options.tint ?? OPTICAL_DISC_DEFAULTS.tint,
		interactive: options.interactive ?? true,
		reducedMotion: options.reducedMotion ?? false,
	};

	let motion: DiscMotion = {
		yaw: ((options.angle ?? OPTICAL_DISC_DEFAULTS.angle) * Math.PI) / 180,
		coast: 0,
		lean: 0,
	};
	let destroyed = false;
	let contextLost = false;
	let frame = 0;
	let last = 0;
	let inView = true;
	let pageVisible = typeof document === "undefined" || !document.hidden;
	let hasLabel = false;
	let labelRequest = 0;
	let labelImage: HTMLImageElement | null = null;

	let dragging = false;
	let dragPointer = -1;
	let dragX = 0;
	let dragY = 0;
	let dragTime = 0;

	function resize(): boolean {
		const ratio = Math.min(
			(typeof window !== "undefined" && window.devicePixelRatio) || 1,
			MAX_PIXEL_RATIO
		);
		const width = Math.max(1, Math.round(canvas.clientWidth * ratio));
		const height = Math.max(1, Math.round(canvas.clientHeight * ratio));
		if (canvas.width === width && canvas.height === height) return false;
		canvas.width = width;
		canvas.height = height;
		return true;
	}

	function draw(): void {
		if (destroyed || contextLost) return;
		resize();
		const paper = parseHexColor(live.labelColor, [0.95, 0.945, 0.933]);
		const tint = parseHexColor(live.tint, [0.435, 0.62, 0.94]);
		context.viewport(0, 0, canvas.width, canvas.height);
		context.clear(context.COLOR_BUFFER_BIT);
		context.uniform2f(uniforms.uRes, canvas.width, canvas.height);
		context.uniform1f(uniforms.uYaw, motion.yaw);
		context.uniform1f(uniforms.uTilt, (live.tilt * Math.PI) / 180 + motion.lean);
		context.uniform1f(uniforms.uIridescence, Math.max(0, live.iridescence));
		context.uniform1f(uniforms.uPitch, Math.max(1, live.pitch));
		context.uniform1f(uniforms.uHasLabel, hasLabel ? 1 : 0);
		context.uniform3f(uniforms.uLabelColor, paper[0], paper[1], paper[2]);
		context.uniform3f(uniforms.uTint, tint[0], tint[1], tint[2]);
		context.drawArrays(context.TRIANGLES, 0, 3);
	}

	function rate(): number {
		return spinRate(live.spin, live.reducedMotion);
	}

	function shouldRun(): boolean {
		return (
			!destroyed && !contextLost && inView && pageVisible && isMoving(motion, rate(), dragging)
		);
	}

	function tick(now: number): void {
		frame = 0;
		if (destroyed) return;
		const dt = last === 0 ? 0 : (now - last) / 1000;
		last = now;
		motion = stepMotion(motion, dt, rate(), dragging);
		draw();
		if (shouldRun()) frame = requestAnimationFrame(tick);
		else last = 0;
	}

	/** Paint now, and keep the loop alive if something is still moving. */
	function wake(): void {
		if (destroyed) return;
		if (frame !== 0) return;
		if (shouldRun()) {
			last = 0;
			frame = requestAnimationFrame(tick);
		} else {
			draw();
		}
	}

	function setLabel(source: string | null): void {
		if (source === live.label) return;
		live.label = source;
		const request = ++labelRequest;
		if (labelImage) {
			labelImage.onload = null;
			labelImage.onerror = null;
			labelImage = null;
		}
		if (!source || typeof Image === "undefined") {
			hasLabel = false;
			wake();
			return;
		}
		const image = new Image();
		image.crossOrigin = "anonymous";
		image.decoding = "async";
		image.onload = () => {
			if (destroyed || contextLost || request !== labelRequest) return;
			try {
				context.bindTexture(context.TEXTURE_2D, texture);
				context.texImage2D(
					context.TEXTURE_2D,
					0,
					context.RGBA,
					context.RGBA,
					context.UNSIGNED_BYTE,
					image
				);
				hasLabel = true;
			} catch {
				// A cross-origin image without CORS headers cannot be uploaded.
				hasLabel = false;
			}
			wake();
		};
		image.onerror = () => {
			if (request !== labelRequest) return;
			hasLabel = false;
			wake();
		};
		labelImage = image;
		image.src = source;
	}

	function onPointerDown(event: PointerEvent): void {
		if (!live.interactive || dragging) return;
		if (event.pointerType === "mouse" && event.button !== 0) return;
		dragging = true;
		dragPointer = event.pointerId;
		dragX = event.clientX;
		dragY = event.clientY;
		dragTime = event.timeStamp;
		motion = { ...motion, coast: 0 };
		try {
			canvas.setPointerCapture(event.pointerId);
		} catch {
			// Synthetic pointers have no capture target; the drag still works.
		}
		wake();
	}

	function onPointerMove(event: PointerEvent): void {
		if (!dragging || event.pointerId !== dragPointer) return;
		const width = Math.max(1, canvas.clientWidth);
		const dx = event.clientX - dragX;
		const dy = event.clientY - dragY;
		const dt = Math.max(1, event.timeStamp - dragTime) / 1000;
		const turn = (dx / width) * Math.PI;
		const lean = Math.max(-0.6, Math.min(0.6, motion.lean + (dy / width) * 1.2));
		// Smooth the release speed so one jittery sample does not fling the disc.
		const speed = live.reducedMotion ? 0 : motion.coast * 0.6 + (turn / dt) * 0.4;
		motion = { yaw: motion.yaw + turn, coast: speed, lean };
		dragX = event.clientX;
		dragY = event.clientY;
		dragTime = event.timeStamp;
		wake();
	}

	function endDrag(event: PointerEvent): void {
		if (!dragging || event.pointerId !== dragPointer) return;
		dragging = false;
		dragPointer = -1;
		// The drag speed replaces the base spin while it lasts; keep only the surplus.
		motion = { ...motion, coast: live.reducedMotion ? 0 : motion.coast - rate() };
		try {
			canvas.releasePointerCapture(event.pointerId);
		} catch {
			// Never captured.
		}
		wake();
	}

	function onVisibility(): void {
		pageVisible = !document.hidden;
		wake();
	}

	function onContextLost(event: Event): void {
		event.preventDefault();
		contextLost = true;
		if (frame !== 0) cancelAnimationFrame(frame);
		frame = 0;
	}

	canvas.addEventListener("pointerdown", onPointerDown);
	canvas.addEventListener("pointermove", onPointerMove);
	canvas.addEventListener("pointerup", endDrag);
	canvas.addEventListener("pointercancel", endDrag);
	canvas.addEventListener("webglcontextlost", onContextLost, false);
	if (typeof document !== "undefined") {
		document.addEventListener("visibilitychange", onVisibility);
	}

	let resizeObserver: ResizeObserver | null = null;
	if (typeof ResizeObserver !== "undefined") {
		resizeObserver = new ResizeObserver(() => wake());
		resizeObserver.observe(canvas);
	}

	let intersectionObserver: IntersectionObserver | null = null;
	if (typeof IntersectionObserver !== "undefined") {
		intersectionObserver = new IntersectionObserver((entries) => {
			for (const entry of entries) inView = entry.isIntersecting;
			wake();
		});
		intersectionObserver.observe(canvas);
	}

	setLabel(options.label ?? null);
	wake();

	return {
		setOptions(next) {
			if (destroyed) return;
			if (next.spin !== undefined) live.spin = next.spin;
			if (next.tilt !== undefined) live.tilt = next.tilt;
			if (next.iridescence !== undefined) live.iridescence = next.iridescence;
			if (next.pitch !== undefined) live.pitch = next.pitch;
			if (next.labelColor !== undefined) live.labelColor = next.labelColor;
			if (next.tint !== undefined) live.tint = next.tint;
			if (next.interactive !== undefined) live.interactive = next.interactive;
			if (next.reducedMotion !== undefined) {
				live.reducedMotion = next.reducedMotion;
				if (next.reducedMotion) motion = { ...motion, coast: 0 };
			}
			if (next.label !== undefined) setLabel(next.label);
			if (frame === 0) wake();
		},
		getAngle() {
			return (motion.yaw * 180) / Math.PI;
		},
		destroy() {
			if (destroyed) return;
			destroyed = true;
			if (frame !== 0) cancelAnimationFrame(frame);
			frame = 0;
			labelRequest++;
			if (labelImage) {
				labelImage.onload = null;
				labelImage.onerror = null;
				labelImage = null;
			}
			canvas.removeEventListener("pointerdown", onPointerDown);
			canvas.removeEventListener("pointermove", onPointerMove);
			canvas.removeEventListener("pointerup", endDrag);
			canvas.removeEventListener("pointercancel", endDrag);
			canvas.removeEventListener("webglcontextlost", onContextLost, false);
			if (typeof document !== "undefined") {
				document.removeEventListener("visibilitychange", onVisibility);
			}
			resizeObserver?.disconnect();
			intersectionObserver?.disconnect();
			context.deleteTexture(texture);
			context.deleteBuffer(buffer);
			context.deleteProgram(program);
			if (releaseContext) context.getExtension("WEBGL_lose_context")?.loseContext();
		},
	};
}
