// displacement-text-core.ts — framework-free three.js vertex-displacement text engine.
// No framework imports; no module-scope window/document/navigator access;
// no build-time env access; no Math.random (this engine is fully deterministic,
// so it takes no `random` injection).

import * as THREE from "three";

export interface DisplacementTextElements {
	/** Host the renderer canvas is appended to; also the pointer/raycast surface. */
	container: HTMLElement;
}

// Nothing here is read only once at mount: the wrapper's single `$effect` re-read
// every prop and rebuilt the whole scene, so all six options are live (and every
// one of them rebuilds — see `setOptions`).
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface DisplacementTextInitOptions {}

export interface DisplacementTextLiveOptions {
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
}

export interface DisplacementTextEngine {
	/** Any changed key rebuilds the scene, exactly as the wrapper's `$effect` re-run did. */
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
};

const DEFAULTS: ResolvedOptions = {
	text: "Hover Me",
	fontSize: 200,
	font: "Inter, sans-serif",
	color: undefined,
	lightColor: "#000000",
	darkColor: "#ffffff",
};

/** Edge of the square canvas the text is rasterized onto, in device px. */
const TEXTURE_SIZE = 2048;
/** Orthographic half-height of the camera frustum. */
const CAMERA_DISTANCE = 8;
/** Visible text plane: 15×15 world units, 100×100 segments so the displacement reads smoothly. */
const PLANE_SIZE = 15;
const PLANE_SEGMENTS = 100;
/** Invisible raycast target, big enough that the pointer always hits it. */
const HIT_PLANE_SIZE = 500;

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
export function createTextTexture(t: string, size: number, f: string, c: string): THREE.Texture {
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

const LIVE_KEYS = ["text", "fontSize", "font", "color", "lightColor", "darkColor"] as const;

/**
 * Build the three.js scene inside `container` and drive it.
 *
 * Returns `null` when the host reports a zero height — the guard the wrapper's
 * effect already had. WebGL availability is not probed: `THREE.WebGLRenderer`
 * throws on a context-less browser here exactly as it did inside the effect.
 */
export function createDisplacementText(
	elements: DisplacementTextElements,
	options: DisplacementTextInitOptions & DisplacementTextLiveOptions
): DisplacementTextEngine | null {
	const { container } = elements;

	let opts: ResolvedOptions = { ...DEFAULTS, ...options };
	let destroyed = false;
	let teardown: (() => void) | null = null;
	let doResize: (() => void) | null = null;

	function build(): boolean {
		const rect = container.getBoundingClientRect();
		const width = rect.width || 1;
		const height = rect.height || 1;
		if (height === 0) return false;

		const { text, fontSize, font, color, lightColor, darkColor } = opts;

		const scene = new THREE.Scene();
		scene.background = null;

		const aspect = width / height;
		const camera = new THREE.OrthographicCamera(
			-CAMERA_DISTANCE * aspect,
			CAMERA_DISTANCE * aspect,
			CAMERA_DISTANCE,
			-CAMERA_DISTANCE,
			0.01,
			1000
		);
		camera.position.set(0, -10, 5);
		camera.lookAt(0, 0, 0);

		const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
		renderer.setClearColor(0x000000, 0);
		renderer.setPixelRatio(window.devicePixelRatio);
		renderer.setSize(width, height, false);
		renderer.domElement.style.width = "100%";
		renderer.domElement.style.height = "100%";
		container.appendChild(renderer.domElement);

		const geometry = new THREE.PlaneGeometry(
			PLANE_SIZE,
			PLANE_SIZE,
			PLANE_SEGMENTS,
			PLANE_SEGMENTS
		);
		const getActiveColor = () =>
			color || (document.documentElement.classList.contains("dark") ? darkColor : lightColor);

		let currentColor = getActiveColor();
		let textTexture = createTextTexture(text, fontSize, font, currentColor);

		const shaderMaterial = new THREE.ShaderMaterial({
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

		const plane = new THREE.Mesh(geometry, shaderMaterial);
		plane.rotation.z = Math.PI / 4;
		scene.add(plane);

		const hitGeometry = new THREE.PlaneGeometry(HIT_PLANE_SIZE, HIT_PLANE_SIZE);
		const hitMaterial = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 });
		const hitPlane = new THREE.Mesh(hitGeometry, hitMaterial);
		scene.add(hitPlane);

		const raycaster = new THREE.Raycaster();
		const pointer = new THREE.Vector2();

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
			const next = getActiveColor();
			if (next !== currentColor) {
				const tex = createTextTexture(text, fontSize, font, next);
				// `uTexture` is one of the two uniforms declared just above — always present.
				shaderMaterial.uniforms.uTexture!.value = tex;
				textTexture.dispose();
				textTexture = tex;
				currentColor = next;
			}
		});
		if (!color)
			observer.observe(document.documentElement, {
				attributes: true,
				attributeFilter: ["class"],
			});

		doResize = handleResize;
		teardown = () => {
			window.removeEventListener("resize", handleResize);
			container.removeEventListener("pointermove", onPointerMove);
			cancelAnimationFrame(animationId);
			observer.disconnect();
			if (renderer.domElement.parentNode === container) container.removeChild(renderer.domElement);
			renderer.dispose();
			textTexture.dispose();
			geometry.dispose();
			shaderMaterial.dispose();
			hitGeometry.dispose();
			hitMaterial.dispose();
		};
		return true;
	}

	if (!build()) return null;

	function teardownCurrent() {
		const fn = teardown;
		teardown = null;
		doResize = null;
		fn?.();
	}

	return {
		setOptions(next: Partial<DisplacementTextLiveOptions>) {
			if (destroyed) return;
			const merged: ResolvedOptions = { ...opts, ...next };
			if (LIVE_KEYS.every((k) => merged[k] === opts[k])) return;
			opts = merged;
			// Every live key rebuilds: the wrapper's effect disposed the scene and
			// built a new one from scratch whenever any of them changed.
			teardownCurrent();
			build();
		},
		resize() {
			if (destroyed) return;
			doResize?.();
		},
		destroy() {
			if (destroyed) return;
			destroyed = true;
			teardownCurrent();
		},
	};
}
