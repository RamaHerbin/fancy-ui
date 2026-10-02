import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	CAMERA_DISTANCE,
	FOV,
	PLANE_SEGMENTS,
	createNoiseReveal,
	easeInOutCubic,
	getProgress,
	lerp,
	visibleSize,
	FRAGMENT_SHADER,
	VERTEX_SHADER,
} from "./noise-reveal-core";

// Control surface for the three mock — read lazily, inside the mocked constructors.
const mock = {
	renderer: null as any,
	material: null as any,
	mesh: null as any,
	camera: null as any,
	geometry: null as any,
	loader: null as any,
	failRenderer: false,
};

// Three.js uses WebGL which is not available in jsdom — mock the module
vi.mock("three", () => {
	function Vector2(this: any, x = 0, y = 0) {
		return { x, y, set: vi.fn() };
	}
	function Texture() {
		return { dispose: vi.fn(), colorSpace: "", image: {} };
	}
	function TextureLoader() {
		const instance = { load: vi.fn((_src: string, _cb: (t: any) => void) => Texture()) };
		mock.loader = instance;
		return instance;
	}
	function ShaderMaterial(this: any, params: any) {
		const instance = { ...params, dispose: vi.fn() };
		mock.material = instance;
		return instance;
	}
	function PlaneGeometry(this: any, ...args: number[]) {
		const instance = { args, dispose: vi.fn() };
		mock.geometry = instance;
		return instance;
	}
	function Mesh() {
		const instance = { scale: { set: vi.fn() } };
		mock.mesh = instance;
		return instance;
	}
	function Scene() {
		return { background: null, add: vi.fn() };
	}
	function PerspectiveCamera(this: any, ...args: number[]) {
		const instance = {
			args,
			position: { set: vi.fn() },
			aspect: 1,
			updateProjectionMatrix: vi.fn(),
		};
		mock.camera = instance;
		return instance;
	}
	function Clock() {
		return { getElapsedTime: vi.fn(() => 0) };
	}
	function WebGLRenderer() {
		if (mock.failRenderer) throw new Error("Error creating WebGL context.");
		const instance = {
			setClearColor: vi.fn(),
			setPixelRatio: vi.fn(),
			setSize: vi.fn(),
			render: vi.fn(),
			dispose: vi.fn(),
			domElement: Object.assign(document.createElement("canvas"), {
				style: { width: "", height: "" },
			}),
		};
		mock.renderer = instance;
		return instance;
	}

	return {
		Scene,
		PerspectiveCamera,
		WebGLRenderer,
		PlaneGeometry,
		ShaderMaterial,
		Mesh,
		TextureLoader,
		Texture,
		Vector2,
		Clock,
		SRGBColorSpace: "srgb",
	};
});

const SRC = "https://example.com/image.jpg";

/** A host with a real box, so `getBoundingClientRect` is not the jsdom all-zeros stub. */
function makeHost(width = 800, height = 400): HTMLDivElement {
	const host = document.createElement("div");
	host.getBoundingClientRect = () => ({ width, height, top: 0, left: 0 }) as DOMRect;
	document.body.appendChild(host);
	return host;
}

function init(overrides: Partial<Parameters<typeof createNoiseReveal>[1]> = {}) {
	return { src: SRC, duration: 1.5, trigger: "view" as const, revealed: false, ...overrides };
}

describe("noise-reveal-core / shaders", () => {
	it("ships the dissolve uniforms and the Perlin noise helper", () => {
		expect(VERTEX_SHADER).toContain("uniform float uProgress");
		expect(FRAGMENT_SHADER).toContain("float cnoise(vec3 P)");
		expect(FRAGMENT_SHADER).toContain("uniform sampler2D uTexture");
	});

	it("keeps the radial gradient and opacity constants", () => {
		// distance * 12.5 - 7.0 * uProgress, then smoothstep(0.0, 0.7, uProgress)
		expect(FRAGMENT_SHADER).toContain("distance(vUv, vec2(0.5)) * 12.5 - 7.0 * uProgress");
		expect(FRAGMENT_SHADER).toContain("smoothstep(0.0, 0.7, uProgress)");
	});
});

describe("noise-reveal-core / pure helpers", () => {
	it("visibleSize fills the frustum at the camera distance", () => {
		const expectedH = 2 * Math.tan((FOV * Math.PI) / 360) * CAMERA_DISTANCE;
		const { w, h } = visibleSize(800, 400);
		expect(h).toBeCloseTo(expectedH, 10);
		expect(w).toBeCloseTo(expectedH * 2, 10);
	});

	it("getProgress clamps to 0..1", () => {
		expect(getProgress(-100, 1000)).toBe(0);
		expect(getProgress(500, 1000)).toBe(0.5);
		expect(getProgress(5000, 1000)).toBe(1);
	});

	it("easeInOutCubic is symmetric around 0.5", () => {
		expect(easeInOutCubic(0)).toBe(0);
		expect(easeInOutCubic(0.5)).toBe(0.5);
		expect(easeInOutCubic(1)).toBe(1);
		expect(easeInOutCubic(0.25) + easeInOutCubic(0.75)).toBeCloseTo(1, 10);
	});

	it("lerp interpolates linearly", () => {
		expect(lerp(0, 1, 0.25)).toBe(0.25);
		expect(lerp(1, 0, 0.25)).toBe(0.75);
	});
});

describe("noise-reveal-core / lifecycle", () => {
	beforeEach(() => {
		mock.failRenderer = false;
	});

	afterEach(() => {
		vi.restoreAllMocks();
		document.body.innerHTML = "";
	});

	it("returns null when no WebGL context is available", () => {
		mock.failRenderer = true;
		const host = makeHost();
		expect(createNoiseReveal({ container: host }, init())).toBeNull();
		expect(host.querySelector("canvas")).toBeNull();
		mock.failRenderer = false;
	});

	it("mounts the renderer canvas into the host and starts a frame loop", () => {
		const raf = vi.spyOn(window, "requestAnimationFrame").mockReturnValue(1);
		const host = makeHost();
		const engine = createNoiseReveal({ container: host }, init());
		expect(engine).not.toBeNull();
		expect(host.querySelector("canvas")).toBe(mock.renderer.domElement);
		expect(raf).toHaveBeenCalled();
		engine?.destroy();
	});

	it("keeps the camera and plane constants", () => {
		const raf = vi.spyOn(window, "requestAnimationFrame").mockReturnValue(1);
		const host = makeHost(800, 400);
		const engine = createNoiseReveal({ container: host }, init());
		// fov, aspect, near, far
		expect(mock.camera.args).toEqual([50, 2, 0.01, 1000]);
		expect(mock.camera.position.set).toHaveBeenCalledWith(0, 0, 5);
		expect(mock.geometry.args).toEqual([1, 1, PLANE_SEGMENTS, PLANE_SEGMENTS]);
		expect(mock.renderer.setSize).toHaveBeenCalledWith(800, 400, false);
		expect(mock.material.transparent).toBe(true);
		raf.mockRestore();
		engine?.destroy();
	});

	it("starts hidden unless the manual trigger is already revealed", () => {
		vi.spyOn(window, "requestAnimationFrame").mockReturnValue(1);
		const a = createNoiseReveal({ container: makeHost() }, init());
		expect(mock.material.uniforms.uProgress.value).toBe(0);
		a?.destroy();

		const b = createNoiseReveal({ container: makeHost() }, init({ revealed: true }));
		expect(mock.material.uniforms.uProgress.value).toBe(0);
		b?.destroy();

		const c = createNoiseReveal(
			{ container: makeHost() },
			init({ trigger: "manual", revealed: true })
		);
		expect(mock.material.uniforms.uProgress.value).toBe(1);
		c?.destroy();
	});

	it("scales the plane to the frustum and feeds uRes", () => {
		vi.spyOn(window, "requestAnimationFrame").mockReturnValue(1);
		const engine = createNoiseReveal({ container: makeHost(800, 400) }, init());
		const { w, h } = visibleSize(800, 400);
		expect(mock.mesh.scale.set).toHaveBeenCalledWith(w, h, 1);
		expect(mock.material.uniforms.uRes.value.set).toHaveBeenCalledWith(w, h);
		engine?.destroy();
	});

	it("sizes the image uniform from the loaded texture", () => {
		vi.spyOn(window, "requestAnimationFrame").mockReturnValue(1);
		const engine = createNoiseReveal({ container: makeHost() }, init());
		const [url, onLoad] = mock.loader.load.mock.calls[0];
		expect(url).toBe(SRC);
		const loaded = {
			colorSpace: "",
			image: { naturalWidth: 0, naturalHeight: 600 },
			dispose: vi.fn(),
		};
		onLoad(loaded);
		expect(loaded.colorSpace).toBe("srgb");
		expect(mock.material.uniforms.uTexture.value).toBe(loaded);
		// falls back to 1 for a zero dimension
		expect(mock.material.uniforms.uImageRes.value.set).toHaveBeenCalledWith(1, 600);
		engine?.destroy();
		expect(loaded.dispose).toHaveBeenCalled();
	});
});

describe("noise-reveal-core / setOptions", () => {
	afterEach(() => {
		vi.restoreAllMocks();
		document.body.innerHTML = "";
	});

	/** Run exactly one frame of the loop the engine scheduled. */
	function frameRunner() {
		let next: FrameRequestCallback | null = null;
		vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
			next = cb;
			return 1;
		});
		return () => {
			const cb = next;
			next = null;
			cb?.(performance.now());
		};
	}

	it("tweens toward the target over `duration` seconds", () => {
		const step = frameRunner();
		const now = vi.spyOn(performance, "now");
		now.mockReturnValue(0);
		const engine = createNoiseReveal({ container: makeHost() }, init({ duration: 2 }));
		step(); // first scheduled frame

		engine?.setOptions({ target: 1 });
		now.mockReturnValue(1000); // half of 2s
		step();
		expect(mock.material.uniforms.uProgress.value).toBeCloseTo(easeInOutCubic(0.5), 10);

		now.mockReturnValue(2000);
		step();
		expect(mock.material.uniforms.uProgress.value).toBe(1);

		// tween finished: further frames hold the value
		now.mockReturnValue(9000);
		step();
		expect(mock.material.uniforms.uProgress.value).toBe(1);
		engine?.destroy();
	});

	it("jumps instantly when reducedMotion is set", () => {
		const step = frameRunner();
		const engine = createNoiseReveal({ container: makeHost() }, init({ reducedMotion: true }));
		step();
		engine?.setOptions({ target: 1 });
		step();
		expect(mock.material.uniforms.uProgress.value).toBe(1);
		engine?.destroy();
	});

	it("applies reducedMotion before the target in the same call", () => {
		const step = frameRunner();
		const engine = createNoiseReveal({ container: makeHost() }, init());
		step();
		engine?.setOptions({ reducedMotion: true, target: 1 });
		step();
		expect(mock.material.uniforms.uProgress.value).toBe(1);
		engine?.destroy();
	});

	it("ignores a target equal to the current one", () => {
		const step = frameRunner();
		const now = vi.spyOn(performance, "now").mockReturnValue(0);
		const engine = createNoiseReveal({ container: makeHost() }, init());
		step();
		engine?.setOptions({ target: 0 }); // already 0 — no tween started
		now.mockReturnValue(10_000);
		step();
		expect(mock.material.uniforms.uProgress.value).toBe(0);
		engine?.destroy();
	});

	it("can re-hide after a reveal", () => {
		const step = frameRunner();
		const engine = createNoiseReveal({ container: makeHost() }, init({ reducedMotion: true }));
		step();
		engine?.setOptions({ target: 1 });
		step();
		engine?.setOptions({ target: 0 });
		step();
		expect(mock.material.uniforms.uProgress.value).toBe(0);
		engine?.destroy();
	});

	it("is inert after destroy", () => {
		const step = frameRunner();
		const engine = createNoiseReveal({ container: makeHost() }, init({ reducedMotion: true }));
		step();
		engine?.destroy();
		expect(() => engine?.setOptions({ target: 1 })).not.toThrow();
		expect(mock.material.uniforms.uProgress.value).toBe(0);
	});
});

describe("noise-reveal-core / resize and destroy", () => {
	afterEach(() => {
		vi.restoreAllMocks();
		document.body.innerHTML = "";
	});

	it("resize re-aspects the camera and refits the plane", () => {
		vi.spyOn(window, "requestAnimationFrame").mockReturnValue(1);
		const host = makeHost(800, 400);
		const engine = createNoiseReveal({ container: host }, init());
		host.getBoundingClientRect = () => ({ width: 600, height: 200 }) as DOMRect;
		engine?.resize();
		expect(mock.camera.aspect).toBe(3);
		expect(mock.camera.updateProjectionMatrix).toHaveBeenCalled();
		expect(mock.renderer.setSize).toHaveBeenLastCalledWith(600, 200, false);
		const { w, h } = visibleSize(600, 200);
		expect(mock.mesh.scale.set).toHaveBeenLastCalledWith(w, h, 1);
		engine?.destroy();
	});

	it("resize is a no-op on a collapsed host and after destroy", () => {
		vi.spyOn(window, "requestAnimationFrame").mockReturnValue(1);
		const host = makeHost(800, 400);
		const engine = createNoiseReveal({ container: host }, init());
		const calls = mock.renderer.setSize.mock.calls.length;

		host.getBoundingClientRect = () => ({ width: 600, height: 0 }) as DOMRect;
		expect(() => engine?.resize()).not.toThrow();
		expect(mock.renderer.setSize.mock.calls.length).toBe(calls);

		host.getBoundingClientRect = () => ({ width: 600, height: 200 }) as DOMRect;
		engine?.destroy();
		expect(() => engine?.resize()).not.toThrow();
		expect(mock.renderer.setSize.mock.calls.length).toBe(calls);
	});

	it("listens for window resize and drops the listener on destroy", () => {
		vi.spyOn(window, "requestAnimationFrame").mockReturnValue(1);
		const add = vi.spyOn(window, "addEventListener");
		const remove = vi.spyOn(window, "removeEventListener");
		const engine = createNoiseReveal({ container: makeHost() }, init());
		expect(add).toHaveBeenCalledWith("resize", expect.any(Function));
		engine?.destroy();
		expect(remove).toHaveBeenCalledWith("resize", expect.any(Function));
	});

	it("destroy cancels the frame, unmounts the canvas and disposes three resources", () => {
		vi.spyOn(window, "requestAnimationFrame").mockReturnValue(42);
		const cancel = vi.spyOn(window, "cancelAnimationFrame");
		const host = makeHost();
		const engine = createNoiseReveal({ container: host }, init());
		const { renderer, geometry, material } = mock;

		engine?.destroy();
		expect(cancel).toHaveBeenCalledWith(42);
		expect(host.querySelector("canvas")).toBeNull();
		expect(renderer.dispose).toHaveBeenCalledTimes(1);
		expect(geometry.dispose).toHaveBeenCalledTimes(1);
		expect(material.dispose).toHaveBeenCalledTimes(1);
	});

	it("destroy is idempotent", () => {
		vi.spyOn(window, "requestAnimationFrame").mockReturnValue(42);
		const cancel = vi.spyOn(window, "cancelAnimationFrame");
		const engine = createNoiseReveal({ container: makeHost() }, init());
		engine?.destroy();
		engine?.destroy();
		engine?.destroy();
		expect(cancel).toHaveBeenCalledTimes(1);
		expect(mock.renderer.dispose).toHaveBeenCalledTimes(1);
	});
});
