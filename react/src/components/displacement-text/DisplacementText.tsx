import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { useLiveRef } from "../../internals/dom/use-live-ref.js";
import { cn } from "../../utils.js";

/**
 * DisplacementText - Large text rendered as a WebGL plane that bulges toward the
 * viewer near the cursor.
 *
 * The text is rasterized to a 2048x2048 canvas and uploaded as a texture; a
 * vertex shader offsets each vertex's `z` by its distance to a `uDisplacement`
 * uniform, which a raycast against an invisible hit-plane updates on every
 * `pointermove`. With reduced motion preferred, without WebGL, or after a lost
 * GPU context, the real text is shown instead, styled like the resting frame.
 */
export interface DisplacementTextProps {
	/** Text to display */
	text?: string;
	/** Font size in pixels */
	fontSize?: number;
	/** Font family */
	font?: string;
	/** Fixed text color (overrides theme colors) */
	color?: string;
	/** Text color in light mode */
	lightColor?: string;
	/** Text color in dark mode */
	darkColor?: string;
	/** Upper bound for the renderer's device pixel ratio */
	maxDpr?: number;
	/** Additional CSS classes */
	className?: string;
}

// The engine below mirrors the Svelte/Vue shared core (displacement-text-core.ts)
// line for line; keep the two in step.

interface DisplacementTextElements {
	/** Host the renderer canvas is appended to; also the pointer/raycast surface. */
	container: HTMLElement;
}

/** Read once, when the engine is created — changing them later has no effect. */
interface DisplacementTextInitOptions {
	/**
	 * Called once if the GPU drops the WebGL context. By then the engine has
	 * already stopped its loop and released every resource; it stays dead.
	 */
	onContextLost?: () => void;
}

/**
 * Every key here is live, and none of them rebuilds the scene: the text keys and
 * the colours re-rasterize the texture in place, `color` going from set to unset
 * (or back) only starts/stops the theme observer, and `maxDpr` re-applies the
 * pixel ratio to the existing renderer.
 */
interface DisplacementTextLiveOptions {
	/** Text to display */
	text?: string;
	/** Font size in pixels */
	fontSize?: number;
	/** Font family */
	font?: string;
	/** Fixed text color (overrides theme colors, and disables the dark-mode observer) */
	color?: string;
	/** Text color in light mode */
	lightColor?: string;
	/** Text color in dark mode */
	darkColor?: string;
	/** Upper bound for the renderer's device pixel ratio (default 2). */
	maxDpr?: number;
}

interface DisplacementTextEngine {
	/** Applies only the keys that changed; never rebuilds the scene. */
	setOptions(next: Partial<DisplacementTextLiveOptions>): void;
	resize(): void;
	destroy(): void;
}

/** Resolved options: every key present, `color` still optional in meaning (undefined = follow the theme). */
type ResolvedOptions = {
	text: string;
	fontSize: number;
	font: string;
	color: string | undefined;
	lightColor: string;
	darkColor: string;
	maxDpr: number | undefined;
};

const DEFAULTS: ResolvedOptions = {
	text: "Hover Me",
	fontSize: 200,
	font: "Inter, sans-serif",
	color: undefined,
	lightColor: "#000000",
	darkColor: "#ffffff",
	maxDpr: undefined,
};

/** Default ceiling for the renderer's pixel ratio. */
const DEFAULT_MAX_DPR = 2;

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

/** Edge of the square canvas the text is rasterized onto, in device px. */
const TEXTURE_SIZE = 2048;
/** Orthographic half-height of the camera frustum. */
const CAMERA_DISTANCE = 8;
/** Visible text plane: 15×15 world units, 100×100 segments so the displacement reads smoothly. */
const PLANE_SIZE = 15;
const PLANE_SEGMENTS = 100;
/** Invisible raycast target, big enough that the pointer always hits it. */
const HIT_PLANE_SIZE = 500;

/**
 * How the resting frame looks on screen, as a CSS transform. The camera sits at
 * (0, -10, 5) looking at the origin, so the plane is seen tilted: screen x is
 * world x and screen y is world y times 5/√125 (= 1/√5). The plane itself is
 * turned 45° about z, which reads as a counter-clockwise turn on screen.
 */
const STATIC_TEXT_TRANSFORM = `scaleY(${1 / Math.sqrt(5)}) rotate(-45deg)`;

/**
 * Static text size, as a share of the layer's height: texture px → world units
 * (PLANE_SIZE / TEXTURE_SIZE) → share of the 2 × CAMERA_DISTANCE tall frustum.
 */
function staticFontSize(fontSize: number): string {
	return `calc(${(fontSize * PLANE_SIZE) / TEXTURE_SIZE / (2 * CAMERA_DISTANCE)} * 100cqh)`;
}

/** Inline style for the layer that holds the static text (a size container filling the host). */
const STATIC_LAYER_STYLE = {
	position: "absolute",
	inset: "0",
	display: "flex",
	alignItems: "center",
	justifyContent: "center",
	containerType: "size",
	overflow: "hidden",
} as const;

/** Inline style for the static text: the real string, laid out like the resting frame. */
function staticTextStyle(
	options: { fontSize?: number; font?: string },
	color: string
): {
	fontFamily: string;
	fontSize: string;
	fontWeight: string;
	color: string;
	lineHeight: string;
	whiteSpace: string;
	transform: string;
} {
	return {
		fontFamily: options.font ?? DEFAULTS.font,
		fontSize: staticFontSize(options.fontSize ?? DEFAULTS.fontSize),
		fontWeight: "bold",
		color,
		lineHeight: "1",
		whiteSpace: "nowrap",
		transform: STATIC_TEXT_TRANSFORM,
	};
}

/** `min(deviceRatio, maxDpr)`; a missing device ratio counts as 1, an unusable cap as the default. */
function resolvePixelRatio(deviceRatio: number | undefined, maxDpr: number | undefined): number {
	const cap =
		maxDpr !== undefined && Number.isFinite(maxDpr) && maxDpr > 0 ? maxDpr : DEFAULT_MAX_DPR;
	const device = deviceRatio && Number.isFinite(deviceRatio) && deviceRatio > 0 ? deviceRatio : 1;
	return Math.min(device, cap);
}

/** The colour on screen: the fixed one, else the theme's. Light when there is no document. */
function resolveTextColor(options: {
	color?: string;
	lightColor?: string;
	darkColor?: string;
}): string {
	if (options.color) return options.color;
	const dark =
		typeof document !== "undefined" && document.documentElement.classList.contains("dark");
	return dark
		? (options.darkColor ?? DEFAULTS.darkColor)
		: (options.lightColor ?? DEFAULTS.lightColor);
}

/**
 * Whether a WebGL2 context (what the renderer needs) can be created here. The
 * probe context is released straight away so it does not count against the
 * browser's limit of live contexts.
 */
function canCreateWebGLContext(): boolean {
	if (typeof document === "undefined") return false;
	try {
		const probe = document.createElement("canvas");
		const gl = probe.getContext("webgl2") as WebGL2RenderingContext | null;
		if (!gl) return false;
		gl.getExtension("WEBGL_lose_context")?.loseContext();
		return true;
	} catch {
		return false;
	}
}

const vertexShader = `
	varying vec2 vUv;
	uniform vec3 uDisplacement;

	float easeInOutCubic(float x) {
		return x < 0.5 ? 4.0 * x * x * x : 1.0 - pow(-2.0 * x + 2.0, 3.0) / 2.0;
	}

	float map(float value, float min1, float max1, float min2, float max2) {
		return min2 + (value - min1) * (max2 - min2) / (max1 - min1);
	}

	void main() {
		vUv = uv;
		vec3 displaced = position;
		vec4 worldPosition = modelMatrix * vec4(position, 1.0);
		float dist = length(uDisplacement - worldPosition.rgb);
		float minDistance = 3.0;

		if (dist < minDistance) {
			float mapped = map(dist, 0.0, minDistance, 1.0, 0.0);
			displaced.z += easeInOutCubic(mapped);
		}

		gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
	}
`;

const fragmentShader = `
	varying vec2 vUv;
	uniform sampler2D uTexture;

	void main() {
		gl_FragColor = texture2D(uTexture, vUv);
	}
`;

/** Rasterize `t` centred on a square canvas and upload it as a texture. */
function createTextTexture(t: string, size: number, f: string, c: string): THREE.Texture {
	const canvas = document.createElement("canvas");
	canvas.width = TEXTURE_SIZE;
	canvas.height = TEXTURE_SIZE;
	const ctx = canvas.getContext("2d");
	if (!ctx) return new THREE.CanvasTexture(canvas);

	ctx.clearRect(0, 0, canvas.width, canvas.height);
	ctx.font = `bold ${size}px ${f}`;
	ctx.fillStyle = c;
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.fillText(t, canvas.width / 2, canvas.height / 2);

	const texture = new THREE.CanvasTexture(canvas);
	texture.needsUpdate = true;
	return texture;
}

const LIVE_KEYS = [
	"text",
	"fontSize",
	"font",
	"color",
	"lightColor",
	"darkColor",
	"maxDpr",
] as const;

/**
 * Build the three.js scene inside `container` and drive it.
 *
 * Returns `null` when the host reports a zero height, when the renderer
 * cannot get a WebGL context (three throws), or when building the scene throws;
 * in every case nothing is left appended to the host and nothing stays allocated.
 */
function createDisplacementText(
	elements: DisplacementTextElements,
	options: DisplacementTextInitOptions & DisplacementTextLiveOptions
): DisplacementTextEngine | null {
	const { container } = elements;
	const { onContextLost } = options;

	let opts: ResolvedOptions = { ...DEFAULTS };
	for (const key of LIVE_KEYS) {
		if (options[key] !== undefined) (opts as Record<string, unknown>)[key] = options[key];
	}

	const rect = container.getBoundingClientRect();
	const width = rect.width || 1;
	const height = rect.height || 1;
	if (height === 0) return null;

	let renderer: THREE.WebGLRenderer;
	try {
		renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
	} catch {
		return null;
	}

	// Everything the scene needs is built before the canvas joins the host, and
	// a throw part-way (a shader or texture the platform rejects) releases what
	// was already made, so a failed build leaves no canvas and no GPU objects.
	const built: { dispose(): void }[] = [renderer];
	let scene: THREE.Scene;
	let camera: THREE.OrthographicCamera;
	let geometry: THREE.PlaneGeometry;
	let currentColor: string;
	let textTexture: THREE.Texture;
	let shaderMaterial: THREE.ShaderMaterial;
	let hitGeometry: THREE.PlaneGeometry;
	let hitMaterial: THREE.MeshBasicMaterial;
	let hitPlane: THREE.Mesh;
	try {
		scene = new THREE.Scene();
		scene.background = null;

		const aspect = width / height;
		camera = new THREE.OrthographicCamera(
			-CAMERA_DISTANCE * aspect,
			CAMERA_DISTANCE * aspect,
			CAMERA_DISTANCE,
			-CAMERA_DISTANCE,
			0.01,
			1000
		);
		camera.position.set(0, -10, 5);
		camera.lookAt(0, 0, 0);

		renderer.setClearColor(0x000000, 0);
		renderer.setPixelRatio(resolvePixelRatio(window.devicePixelRatio, opts.maxDpr));
		renderer.setSize(width, height, false);
		renderer.domElement.style.width = "100%";
		renderer.domElement.style.height = "100%";

		geometry = new THREE.PlaneGeometry(PLANE_SIZE, PLANE_SIZE, PLANE_SEGMENTS, PLANE_SEGMENTS);
		built.push(geometry);

		currentColor = resolveTextColor(opts);
		textTexture = createTextTexture(opts.text, opts.fontSize, opts.font, currentColor);
		built.push(textTexture);

		shaderMaterial = new THREE.ShaderMaterial({
			uniforms: {
				uTexture: { value: textTexture },
				uDisplacement: { value: new THREE.Vector3(0, 0, 0) },
			},
			vertexShader,
			fragmentShader,
			transparent: true,
			depthWrite: false,
			side: THREE.DoubleSide,
		});
		built.push(shaderMaterial);

		const plane = new THREE.Mesh(geometry, shaderMaterial);
		plane.rotation.z = Math.PI / 4;
		scene.add(plane);

		hitGeometry = new THREE.PlaneGeometry(HIT_PLANE_SIZE, HIT_PLANE_SIZE);
		built.push(hitGeometry);
		hitMaterial = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 });
		built.push(hitMaterial);
		hitPlane = new THREE.Mesh(hitGeometry, hitMaterial);
		scene.add(hitPlane);
	} catch {
		for (const item of built) item.dispose();
		return null;
	}

	container.appendChild(renderer.domElement);

	const raycaster = new THREE.Raycaster();
	const pointer = new THREE.Vector2();

	/** Swap in a freshly rasterized texture and release the old one. */
	function retexture(nextColor: string) {
		const tex = createTextTexture(opts.text, opts.fontSize, opts.font, nextColor);
		// `uTexture` is one of the two uniforms declared just above — always present.
		shaderMaterial.uniforms.uTexture!.value = tex;
		textTexture.dispose();
		textTexture = tex;
		currentColor = nextColor;
	}

	const onPointerMove = (e: PointerEvent) => {
		const bounds = container.getBoundingClientRect();
		pointer.x = ((e.clientX - bounds.left) / bounds.width) * 2 - 1;
		pointer.y = -((e.clientY - bounds.top) / bounds.height) * 2 + 1;
		raycaster.setFromCamera(pointer, camera);
		const [hit] = raycaster.intersectObject(hitPlane);
		// `uDisplacement` is one of the two uniforms declared just above — always present.
		if (hit) (shaderMaterial.uniforms.uDisplacement!.value as THREE.Vector3).copy(hit.point);
	};

	container.addEventListener("pointermove", onPointerMove);

	const handleResize = () => {
		const r = container.getBoundingClientRect();
		if (r.height === 0) return;
		const a = r.width / r.height;
		camera.left = -CAMERA_DISTANCE * a;
		camera.right = CAMERA_DISTANCE * a;
		camera.updateProjectionMatrix();
		renderer.setSize(r.width, r.height, false);
	};

	window.addEventListener("resize", handleResize);

	let animationId = 0;
	const animate = () => {
		animationId = requestAnimationFrame(animate);
		renderer.render(scene, camera);
	};
	animate();

	const observer = new MutationObserver(() => {
		const next = resolveTextColor(opts);
		if (next !== currentColor) retexture(next);
	});
	let observing = false;
	function syncObserver() {
		const want = !opts.color;
		if (want === observing) return;
		observing = want;
		if (want)
			observer.observe(document.documentElement, {
				attributes: true,
				attributeFilter: ["class"],
			});
		else observer.disconnect();
	}
	syncObserver();

	// A lost context invalidates every GL object, so rather than rebuild in
	// place the engine releases everything and hands the decision back to the
	// caller. preventDefault() keeps the context eligible for restoration.
	const onContextLostEvent = (event: Event) => {
		event.preventDefault();
		release();
		onContextLost?.();
	};
	renderer.domElement.addEventListener("webglcontextlost", onContextLostEvent, false);

	let released = false;
	function release() {
		if (released) return;
		released = true;
		renderer.domElement.removeEventListener("webglcontextlost", onContextLostEvent);
		window.removeEventListener("resize", handleResize);
		container.removeEventListener("pointermove", onPointerMove);
		cancelAnimationFrame(animationId);
		if (observing) observer.disconnect();
		observing = false;
		if (renderer.domElement.parentNode === container) container.removeChild(renderer.domElement);
		renderer.dispose();
		textTexture.dispose();
		geometry.dispose();
		shaderMaterial.dispose();
		hitGeometry.dispose();
		hitMaterial.dispose();
	}

	return {
		setOptions(next: Partial<DisplacementTextLiveOptions>) {
			if (released) return;
			const prev = opts;
			const merged: ResolvedOptions = { ...opts };
			for (const key of LIVE_KEYS) {
				if (key in next) (merged as Record<string, unknown>)[key] = next[key];
			}
			// Defaults stand in for keys passed as undefined, as at creation.
			for (const key of LIVE_KEYS) {
				if (merged[key] === undefined && key !== "color" && key !== "maxDpr")
					(merged as Record<string, unknown>)[key] = DEFAULTS[key];
			}
			if (LIVE_KEYS.every((k) => merged[k] === prev[k])) return;
			opts = merged;

			if (merged.maxDpr !== prev.maxDpr) {
				renderer.setPixelRatio(resolvePixelRatio(window.devicePixelRatio, merged.maxDpr));
				handleResize();
			}
			syncObserver();
			const nextColor = resolveTextColor(merged);
			if (
				nextColor !== currentColor ||
				merged.text !== prev.text ||
				merged.fontSize !== prev.fontSize ||
				merged.font !== prev.font
			)
				retexture(nextColor);
		},
		resize() {
			if (released) return;
			handleResize();
		},
		destroy() {
			release();
		},
	};
}

type DisplacementTextMode = "static" | "webgl";

interface DisplacementTextState {
	/** `static`: the wrapper shows the real text; `webgl`: the canvas is live. */
	mode: DisplacementTextMode;
	/** The colour the text resolves to right now (theme-aware unless `color` is fixed). */
	color: string;
}

interface DisplacementTextControllerOptions extends DisplacementTextLiveOptions {
	/** Read once at mount: called with every state change (and once with the initial state). */
	onChange: (state: DisplacementTextState) => void;
}

interface DisplacementTextController {
	setOptions(next: Partial<DisplacementTextLiveOptions>): void;
	resize(): void;
	destroy(): void;
}

/**
 * Owns the engine's lifecycle for a mounted wrapper:
 *
 * - while `prefers-reduced-motion: reduce` matches, no engine exists — no loop,
 *   no GL context — and the state is `static`; a live change of the preference
 *   destroys or creates the engine without remounting the wrapper;
 * - the engine is only created once a WebGL2 context is known to be obtainable,
 *   and a context loss drops to `static` for the rest of the mount;
 * - the resolved text colour is reported (and follows the theme) so the static
 *   text matches what the canvas would draw.
 */
function mountDisplacementText(
	elements: DisplacementTextElements,
	options: DisplacementTextControllerOptions
): DisplacementTextController {
	const { onChange } = options;
	let opts: DisplacementTextLiveOptions = {};
	for (const key of LIVE_KEYS) opts[key] = options[key] as never;

	let engine: DisplacementTextEngine | null = null;
	let contextLost = false;
	let destroyed = false;
	let state: DisplacementTextState = { mode: "static", color: resolveTextColor(opts) };

	function publish(next: DisplacementTextState) {
		if (next.mode === state.mode && next.color === state.color) return;
		state = next;
		onChange(state);
	}

	const mql =
		typeof window !== "undefined" && typeof window.matchMedia === "function"
			? window.matchMedia(REDUCED_MOTION_QUERY)
			: null;

	function start() {
		if (engine || contextLost || destroyed || mql?.matches) return;
		if (!canCreateWebGLContext()) return;
		// The engine already cleans up after a failed build; the guard keeps any
		// other throw from escaping into the wrapper's mount hook, so the
		// controller always exists and `destroy()` always drops its listeners.
		try {
			engine = createDisplacementText(elements, {
				...opts,
				onContextLost() {
					engine = null;
					contextLost = true;
					publish({ ...state, mode: "static" });
				},
			});
		} catch {
			engine = null;
		}
		if (engine) publish({ ...state, mode: "webgl" });
	}

	function stop() {
		const current = engine;
		engine = null;
		current?.destroy();
		publish({ ...state, mode: "static" });
	}

	const onMotionChange = (event: MediaQueryListEvent) => {
		if (destroyed) return;
		if (event.matches) stop();
		else start();
	};
	mql?.addEventListener("change", onMotionChange);

	const themeObserver =
		typeof MutationObserver !== "undefined"
			? new MutationObserver(() => publish({ ...state, color: resolveTextColor(opts) }))
			: null;
	let watchingTheme = false;
	function syncThemeObserver() {
		const want = !opts.color && themeObserver !== null;
		if (want === watchingTheme) return;
		watchingTheme = want;
		if (want)
			themeObserver?.observe(document.documentElement, {
				attributes: true,
				attributeFilter: ["class"],
			});
		else themeObserver?.disconnect();
	}

	onChange(state);
	syncThemeObserver();
	start();

	return {
		setOptions(next) {
			if (destroyed) return;
			opts = { ...opts, ...next };
			syncThemeObserver();
			publish({ ...state, color: resolveTextColor(opts) });
			engine?.setOptions(next);
		},
		resize() {
			if (destroyed) return;
			engine?.resize();
		},
		destroy() {
			if (destroyed) return;
			destroyed = true;
			mql?.removeEventListener("change", onMotionChange);
			if (watchingTheme) themeObserver?.disconnect();
			watchingTheme = false;
			const current = engine;
			engine = null;
			current?.destroy();
		},
	};
}

export function DisplacementText({
	text = "Hover Me",
	fontSize = 200,
	font = "Inter, sans-serif",
	color,
	lightColor = "#000000",
	darkColor = "#ffffff",
	maxDpr = DEFAULT_MAX_DPR,
	className = "",
}: DisplacementTextProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const controllerRef = useRef<DisplacementTextController | null>(null);
	const options = { text, fontSize, font, color, lightColor, darkColor, maxDpr };
	const mountOptions = useLiveRef(options);

	// Starts "static" so the server render (and the first client render) carry
	// the real text; the controller promotes to the canvas once motion is
	// allowed and WebGL is available, and drops back when reduced motion turns on.
	const [state, setState] = useState<DisplacementTextState>(() => ({
		mode: "static",
		color: color ?? lightColor,
	}));

	useEffect(() => {
		const container = containerRef.current;
		if (!container) return;
		const controller = mountDisplacementText(
			{ container },
			{ ...mountOptions.current, onChange: setState }
		);
		controllerRef.current = controller;
		return () => {
			controller.destroy();
			if (controllerRef.current === controller) controllerRef.current = null;
		};
	}, [mountOptions]);

	// Options are diffed by the engine: nothing here rebuilds the scene.
	useEffect(() => {
		controllerRef.current?.setOptions({
			text,
			fontSize,
			font,
			color,
			lightColor,
			darkColor,
			maxDpr,
		});
	}, [text, fontSize, font, color, lightColor, darkColor, maxDpr]);

	// The canvas is a decorative rendering of the text, so the container carries
	// it for assistive technology; the static fallback is the real string.
	return (
		<div
			ref={containerRef}
			role="img"
			aria-label={text}
			className={cn("relative h-[400px] w-full", className)}
		>
			{state.mode === "static" ? (
				<div style={STATIC_LAYER_STYLE}>
					<span style={staticTextStyle({ fontSize, font }, state.color)}>{text}</span>
				</div>
			) : null}
		</div>
	);
}
