/**
 * NoiseReveal core — the framework-free three.js engine behind `NoiseReveal.svelte`.
 *
 * A unit plane fills the camera frustum and carries a dissolve shader: classic
 * Perlin noise displaces the UVs, a radial gradient driven by `uProgress` eats
 * into the mask, and the plane ripples while the reveal runs. The engine owns
 * the scene, the texture load, the tween and the rAF loop; the wrapper owns the
 * markup, the reveal trigger (IntersectionObserver or a prop) and the
 * reduced-motion query.
 *
 * Zero framework imports, no module-level DOM access — safe to import on the
 * server. The easing helpers below are copies of the shared animation utils:
 * a core file may not reach into `$lib/`, so they live here verbatim.
 */
import * as THREE from "three";

// --- shaders -----------------------------------------------------------------

export const VERTEX_SHADER = `
	uniform float uProgress;
	varying vec2 vUv;

	void main() {
		vec3 newPosition = position;

		float distanceToCenter = distance(vec2(0.5), uv);
		float wave = (1.0 - uProgress) * sin(distanceToCenter * 20.0 - uProgress * 5.0);
		newPosition.z += wave;

		gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
		vUv = uv;
	}
`;

// cnoise: classic 3D Perlin noise by Stefan Gustavson (MIT, github.com/stegu/webgl-noise)
export const FRAGMENT_SHADER = `
	uniform sampler2D uTexture;
	uniform float uTime;
	uniform float uProgress;
	uniform vec2 uRes;
	uniform vec2 uImageRes;
	varying vec2 vUv;

	vec4 permute(vec4 x) { return mod(((x * 34.0) + 1.0) * x, 289.0); }
	vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
	vec3 fade(vec3 t) { return t * t * t * (t * (t * 6.0 - 15.0) + 10.0); }

	float cnoise(vec3 P) {
		vec3 Pi0 = floor(P);
		vec3 Pi1 = Pi0 + vec3(1.0);
		Pi0 = mod(Pi0, 289.0);
		Pi1 = mod(Pi1, 289.0);
		vec3 Pf0 = fract(P);
		vec3 Pf1 = Pf0 - vec3(1.0);
		vec4 ix = vec4(Pi0.x, Pi1.x, Pi0.x, Pi1.x);
		vec4 iy = vec4(Pi0.yy, Pi1.yy);
		vec4 iz0 = Pi0.zzzz;
		vec4 iz1 = Pi1.zzzz;

		vec4 ixy = permute(permute(ix) + iy);
		vec4 ixy0 = permute(ixy + iz0);
		vec4 ixy1 = permute(ixy + iz1);

		vec4 gx0 = ixy0 / 7.0;
		vec4 gy0 = fract(floor(gx0) / 7.0) - 0.5;
		gx0 = fract(gx0);
		vec4 gz0 = vec4(0.5) - abs(gx0) - abs(gy0);
		vec4 sz0 = step(gz0, vec4(0.0));
		gx0 -= sz0 * (step(0.0, gx0) - 0.5);
		gy0 -= sz0 * (step(0.0, gy0) - 0.5);

		vec4 gx1 = ixy1 / 7.0;
		vec4 gy1 = fract(floor(gx1) / 7.0) - 0.5;
		gx1 = fract(gx1);
		vec4 gz1 = vec4(0.5) - abs(gx1) - abs(gy1);
		vec4 sz1 = step(gz1, vec4(0.0));
		gx1 -= sz1 * (step(0.0, gx1) - 0.5);
		gy1 -= sz1 * (step(0.0, gy1) - 0.5);

		vec3 g000 = vec3(gx0.x, gy0.x, gz0.x);
		vec3 g100 = vec3(gx0.y, gy0.y, gz0.y);
		vec3 g010 = vec3(gx0.z, gy0.z, gz0.z);
		vec3 g110 = vec3(gx0.w, gy0.w, gz0.w);
		vec3 g001 = vec3(gx1.x, gy1.x, gz1.x);
		vec3 g101 = vec3(gx1.y, gy1.y, gz1.y);
		vec3 g011 = vec3(gx1.z, gy1.z, gz1.z);
		vec3 g111 = vec3(gx1.w, gy1.w, gz1.w);

		vec4 norm0 = taylorInvSqrt(vec4(dot(g000, g000), dot(g010, g010), dot(g100, g100), dot(g110, g110)));
		g000 *= norm0.x;
		g010 *= norm0.y;
		g100 *= norm0.z;
		g110 *= norm0.w;
		vec4 norm1 = taylorInvSqrt(vec4(dot(g001, g001), dot(g011, g011), dot(g101, g101), dot(g111, g111)));
		g001 *= norm1.x;
		g011 *= norm1.y;
		g101 *= norm1.z;
		g111 *= norm1.w;

		float n000 = dot(g000, Pf0);
		float n100 = dot(g100, vec3(Pf1.x, Pf0.yz));
		float n010 = dot(g010, vec3(Pf0.x, Pf1.y, Pf0.z));
		float n110 = dot(g110, vec3(Pf1.xy, Pf0.z));
		float n001 = dot(g001, vec3(Pf0.xy, Pf1.z));
		float n101 = dot(g101, vec3(Pf1.x, Pf0.y, Pf1.z));
		float n011 = dot(g011, vec3(Pf0.x, Pf1.yz));
		float n111 = dot(g111, Pf1);

		vec3 fade_xyz = fade(Pf0);
		vec4 n_z = mix(vec4(n000, n100, n010, n110), vec4(n001, n101, n011, n111), fade_xyz.z);
		vec2 n_yz = mix(n_z.xy, n_z.zw, fade_xyz.y);
		float n_xyz = mix(n_yz.x, n_yz.y, fade_xyz.x);
		return 2.2 * n_xyz;
	}

	vec2 CoverUV(vec2 u, vec2 s, vec2 i) {
		float rs = s.x / s.y;
		float ri = i.x / i.y;
		vec2 st = rs < ri ? vec2(i.x * s.y / i.y, s.y) : vec2(s.x, i.y * s.x / i.x);
		vec2 o = (rs < ri ? vec2((st.x - s.x) / 2.0, 0.0) : vec2(0.0, (st.y - s.y) / 2.0)) / st;
		return u * s / st + o;
	}

	void main() {
		vec2 newUv = CoverUV(vUv, uRes, uImageRes);

		vec2 displacedUv = vUv + cnoise(vec3(vUv * 5.0, uTime * 0.1));
		float strength = cnoise(vec3(displacedUv * 5.0, uTime * 0.2));

		float radialGradient = distance(vUv, vec2(0.5)) * 12.5 - 7.0 * uProgress;
		strength += radialGradient;

		strength = clamp(strength, 0.0, 1.0);
		strength = 1.0 - strength;

		vec3 textureColor = texture2D(uTexture, newUv).rgb;

		float opacityProgress = smoothstep(0.0, 0.7, uProgress);

		gl_FragColor = vec4(textureColor, strength * opacityProgress);
	}
`;

// --- constants ---------------------------------------------------------------

/** Camera distance on z. With `FOV` it fixes the size of the plane that fills the view. */
export const CAMERA_DISTANCE = 5;
/** Vertical field of view in degrees. */
export const FOV = 50;
/** Plane subdivisions — enough vertices for the vertex-shader ripple to read as a wave. */
export const PLANE_SEGMENTS = 32;

/**
 * Size of the camera frustum at z = 0, i.e. the exact scale the unit plane needs
 * to fill the viewport for a host of `width` × `height`.
 */
export function visibleSize(width: number, height: number): { w: number; h: number } {
	const h = 2 * Math.tan((FOV * Math.PI) / 360) * CAMERA_DISTANCE;
	return { w: h * (width / height), h };
}

// --- easing (copies of `$lib/utils/animation.ts`, which a core may not import) -

function clamp(value: number, min: number, max: number): number {
	return Math.min(Math.max(value, min), max);
}

/** Elapsed / duration, clamped to 0..1. */
export function getProgress(elapsed: number, duration: number): number {
	return clamp(elapsed / duration, 0, 1);
}

/** Cubic ease in-out. */
export function easeInOutCubic(t: number): number {
	return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/** Interpolate between two values. */
export function lerp(start: number, end: number, t: number): number {
	return start + (end - start) * t;
}

// --- contract ----------------------------------------------------------------

export interface NoiseRevealElements {
	/** Host the renderer canvas is appended to; it is also the measured box. */
	container: HTMLElement;
}

/**
 * Read once, when the engine is built. The wrapper rebuilds the engine when one
 * of these changes — exactly what its scene `$effect` did before the extraction.
 */
export interface NoiseRevealInitOptions {
	/** Image URL handed to `THREE.TextureLoader`. */
	src: string;
	/** Reveal tween duration in seconds. */
	duration: number;
	/** Which trigger the wrapper uses; only the initial progress depends on it. */
	trigger: "view" | "manual";
	/** Initial reveal state — honoured only for `trigger: "manual"`. */
	revealed: boolean;
}

/** Applied after mount through `setOptions`. */
export interface NoiseRevealLiveOptions {
	/** Dissolve target: 1 = revealed, 0 = hidden. Setting a new value starts the tween. */
	target?: number;
	/** `prefers-reduced-motion` as read by the wrapper: target changes jump instead of tweening. */
	reducedMotion?: boolean;
}

export interface NoiseRevealEngine {
	setOptions(next: Partial<NoiseRevealLiveOptions>): void;
	resize(): void;
	destroy(): void;
}

/** three throws when the browser cannot hand out a WebGL context — fail quiet. */
function createRenderer(): THREE.WebGLRenderer | null {
	try {
		return new THREE.WebGLRenderer({ antialias: true, alpha: true });
	} catch {
		return null;
	}
}

/**
 * Build the scene, start the loop. Returns `null` when the host cannot be
 * measured or no WebGL context is available.
 */
export function createNoiseReveal(
	el: NoiseRevealElements,
	options: NoiseRevealInitOptions & NoiseRevealLiveOptions
): NoiseRevealEngine | null {
	const container = el.container;
	if (!container) return null;

	const duration = options.duration;

	const rect = container.getBoundingClientRect();
	const width = rect.width || 1;
	const height = rect.height || 1;
	if (height === 0) return null;

	const scene = new THREE.Scene();
	scene.background = null;

	const camera = new THREE.PerspectiveCamera(FOV, width / height, 0.01, 1000);
	camera.position.set(0, 0, CAMERA_DISTANCE);

	const renderer = createRenderer();
	if (!renderer) return null;

	renderer.setClearColor(0x000000, 0);
	renderer.setPixelRatio(window.devicePixelRatio);
	renderer.setSize(width, height, false);
	renderer.domElement.style.width = "100%";
	renderer.domElement.style.height = "100%";
	container.appendChild(renderer.domElement);

	const geometry = new THREE.PlaneGeometry(1, 1, PLANE_SEGMENTS, PLANE_SEGMENTS);

	// Held locally as well as on the material: `uniforms[key]` widens to
	// `IUniform | undefined` under `noUncheckedIndexedAccess`, and these are the
	// very same objects the material renders from.
	const uniforms = {
		uTexture: { value: null as THREE.Texture | null },
		uTime: { value: 0 },
		uProgress: { value: options.trigger === "manual" && options.revealed ? 1 : 0 },
		uRes: { value: new THREE.Vector2(1, 1) },
		uImageRes: { value: new THREE.Vector2(1, 1) },
	};

	const material = new THREE.ShaderMaterial({
		uniforms,
		vertexShader: VERTEX_SHADER,
		fragmentShader: FRAGMENT_SHADER,
		transparent: true,
	});

	const plane = new THREE.Mesh(geometry, material);
	scene.add(plane);

	// Scale the unit plane to exactly fill the camera frustum at z=0
	const fitPlane = (w: number, h: number) => {
		const visible = visibleSize(w, h);
		plane.scale.set(visible.w, visible.h, 1);
		uniforms.uRes.value.set(visible.w, visible.h);
	};
	fitPlane(width, height);

	let texture: THREE.Texture | null = null;
	new THREE.TextureLoader().load(options.src, (loaded) => {
		loaded.colorSpace = THREE.SRGBColorSpace;
		texture = loaded;
		uniforms.uTexture.value = loaded;
		const image = loaded.image as HTMLImageElement;
		uniforms.uImageRes.value.set(image.naturalWidth || 1, image.naturalHeight || 1);
	});

	let destroyed = false;
	let reducedMotion = options.reducedMotion ?? false;
	let progress = uniforms.uProgress.value;
	const tween = { from: progress, to: progress, start: 0, active: false };

	const setTarget = (value: number) => {
		if (value === tween.to) return;
		tween.to = value;
		if (reducedMotion) {
			progress = value;
			tween.active = false;
			return;
		}
		tween.from = progress;
		tween.start = performance.now();
		tween.active = true;
	};

	const handleResize = () => {
		if (destroyed) return;
		const r = container.getBoundingClientRect();
		if (r.height === 0) return;
		camera.aspect = r.width / r.height;
		camera.updateProjectionMatrix();
		renderer.setSize(r.width, r.height, false);
		fitPlane(r.width, r.height);
	};

	window.addEventListener("resize", handleResize);

	const clock = new THREE.Clock();
	let animationId = 0;
	const animate = () => {
		animationId = requestAnimationFrame(animate);
		if (tween.active) {
			const t = getProgress(performance.now() - tween.start, duration * 1000);
			progress = lerp(tween.from, tween.to, easeInOutCubic(t));
			if (t >= 1) tween.active = false;
		}
		uniforms.uProgress.value = progress;
		uniforms.uTime.value = clock.getElapsedTime();
		renderer.render(scene, camera);
	};
	animate();

	if (options.target !== undefined) setTarget(options.target);

	return {
		setOptions(next) {
			if (destroyed) return;
			if (next.reducedMotion !== undefined) reducedMotion = next.reducedMotion;
			if (next.target !== undefined) setTarget(next.target);
		},
		resize: handleResize,
		destroy() {
			if (destroyed) return;
			destroyed = true;
			window.removeEventListener("resize", handleResize);
			cancelAnimationFrame(animationId);
			if (renderer.domElement.parentNode === container) container.removeChild(renderer.domElement);
			renderer.dispose();
			geometry.dispose();
			material.dispose();
			texture?.dispose();
		},
	};
}
