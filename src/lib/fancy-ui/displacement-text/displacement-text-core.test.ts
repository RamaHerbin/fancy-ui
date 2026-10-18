import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createDisplacementText, createTextTexture } from "./displacement-text-core.js";

/**
 * Records every three.js object the core builds, so the tests can assert on the
 * scene it wires up without a GPU. Only referenced from inside the mocked
 * constructors, never at module-factory time.
 */
const made = {
	renderers: [] as any[],
	cameras: [] as any[],
	cameraArgs: [] as number[][],
	geometryArgs: [] as number[][],
	materials: [] as any[],
	textures: [] as any[],
	meshes: [] as any[],
	raycasters: [] as any[],
	hit: null as null | { point: unknown },
};

function resetMade() {
	made.renderers = [];
	made.cameras = [];
	made.cameraArgs = [];
	made.geometryArgs = [];
	made.materials = [];
	made.textures = [];
	made.meshes = [];
	made.raycasters = [];
	made.hit = null;
}

// Three.js needs WebGL, which jsdom does not have — mock the module.
vi.mock("three", () => {
	function Vector2(this: any) {
		return { x: 0, y: 0 };
	}
	function Vector3(this: any, x = 0, y = 0, z = 0) {
		return { x, y, z, copy: vi.fn() };
	}
	function CanvasTexture(this: any, canvas: HTMLCanvasElement) {
		const tex = { canvas, needsUpdate: false, dispose: vi.fn() };
		made.textures.push(tex);
		return tex;
	}
	function ShaderMaterial(this: any, params: any) {
		const mat = { ...params, dispose: vi.fn() };
		made.materials.push(mat);
		return mat;
	}
	function PlaneGeometry(this: any, ...args: number[]) {
		made.geometryArgs.push(args);
		return { dispose: vi.fn() };
	}
	function MeshBasicMaterial(this: any, params: any) {
		return { ...params, dispose: vi.fn() };
	}
	function Mesh(this: any) {
		const mesh = { rotation: { x: 0, y: 0, z: 0 } };
		made.meshes.push(mesh);
		return mesh;
	}
	function Scene(this: any) {
		return { background: undefined, add: vi.fn() };
	}
	function OrthographicCamera(this: any, ...args: number[]) {
		made.cameraArgs.push(args);
		const cam = {
			position: { set: vi.fn() },
			lookAt: vi.fn(),
			left: 0,
			right: 0,
			updateProjectionMatrix: vi.fn(),
		};
		made.cameras.push(cam);
		return cam;
	}
	function Raycaster(this: any) {
		const ray = {
			setFromCamera: vi.fn(),
			intersectObject: vi.fn(() => (made.hit ? [made.hit] : [])),
		};
		made.raycasters.push(ray);
		return ray;
	}
	function WebGLRenderer(this: any) {
		const renderer = {
			setClearColor: vi.fn(),
			setPixelRatio: vi.fn(),
			setSize: vi.fn(),
			render: vi.fn(),
			dispose: vi.fn(),
			domElement: document.createElement("canvas"),
		};
		made.renderers.push(renderer);
		return renderer;
	}

	return {
		Scene,
		OrthographicCamera,
		WebGLRenderer,
		PlaneGeometry,
		ShaderMaterial,
		Mesh,
		MeshBasicMaterial,
		Raycaster,
		Vector2,
		Vector3,
		CanvasTexture,
		DoubleSide: 2,
	};
});

function makeHost(width = 400, height = 200): HTMLDivElement {
	const el = document.createElement("div");
	el.getBoundingClientRect = () =>
		({ width, height, left: 0, top: 0, right: width, bottom: height }) as DOMRect;
	document.body.appendChild(el);
	return el;
}

function fakeCtx() {
	return {
		font: "",
		fillStyle: "",
		textAlign: "",
		textBaseline: "",
		clearRect: vi.fn(),
		fillText: vi.fn(),
	};
}

describe("createDisplacementText", () => {
	let rafSpy: ReturnType<typeof vi.spyOn>;
	let cafSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		resetMade();
		document.documentElement.classList.remove("dark");
		rafSpy = vi.spyOn(window, "requestAnimationFrame").mockImplementation(() => 42);
		cafSpy = vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});
	});

	afterEach(() => {
		rafSpy.mockRestore();
		cafSpy.mockRestore();
		document.body.innerHTML = "";
		document.documentElement.classList.remove("dark");
		vi.restoreAllMocks();
	});

	it("mounts the renderer canvas in the host and starts the rAF loop", () => {
		const host = makeHost();
		const engine = createDisplacementText({ container: host }, {});

		expect(engine).not.toBeNull();
		expect(made.renderers).toHaveLength(1);
		expect(host.querySelector("canvas")).toBe(made.renderers[0].domElement);
		expect(rafSpy).toHaveBeenCalled();
		// animate() renders once synchronously before the first scheduled frame
		expect(made.renderers[0].render).toHaveBeenCalledTimes(1);
		expect(made.renderers[0].setSize).toHaveBeenCalledWith(400, 200, false);
		expect(made.renderers[0].setClearColor).toHaveBeenCalledWith(0x000000, 0);
		engine?.destroy();
	});

	it("builds the orthographic frustum from the host aspect ratio (half-height 8)", () => {
		const engine = createDisplacementText({ container: makeHost(400, 200) }, {});
		expect(made.cameraArgs[0]).toEqual([-16, 16, 8, -8, 0.01, 1000]);
		expect(made.cameras[0].position.set).toHaveBeenCalledWith(0, -10, 5);
		expect(made.cameras[0].lookAt).toHaveBeenCalledWith(0, 0, 0);
		engine?.destroy();
	});

	it("falls back to a 1x1 box when the host reports no size", () => {
		const engine = createDisplacementText({ container: makeHost(0, 0) }, {});
		expect(engine).not.toBeNull();
		expect(made.renderers[0].setSize).toHaveBeenCalledWith(1, 1, false);
		expect(made.cameraArgs[0]).toEqual([-8, 8, 8, -8, 0.01, 1000]);
		engine?.destroy();
	});

	it("keeps the 15x15/100-segment text plane, the 500x500 hit plane and the 45deg tilt", () => {
		const engine = createDisplacementText({ container: makeHost() }, {});
		expect(made.geometryArgs[0]).toEqual([15, 15, 100, 100]);
		expect(made.geometryArgs[1]).toEqual([500, 500]);
		expect(made.meshes[0].rotation.z).toBe(Math.PI / 4);
		expect(made.meshes[1].rotation.z).toBe(0);
		engine?.destroy();
	});

	it("rasterizes the text bold, centred on a 2048x2048 canvas", () => {
		const ctx = fakeCtx();
		const getContext = vi
			.spyOn(HTMLCanvasElement.prototype, "getContext")
			.mockReturnValue(ctx as never);

		const engine = createDisplacementText(
			{ container: makeHost() },
			{ text: "Fancy", fontSize: 120, font: "Georgia, serif", color: "#ff0000" }
		);

		expect(ctx.font).toBe("bold 120px Georgia, serif");
		expect(ctx.fillStyle).toBe("#ff0000");
		expect(ctx.textAlign).toBe("center");
		expect(ctx.textBaseline).toBe("middle");
		expect(ctx.fillText).toHaveBeenCalledWith("Fancy", 1024, 1024);
		expect(made.textures[0].canvas.width).toBe(2048);
		expect(made.textures[0].canvas.height).toBe(2048);
		expect(made.textures[0].needsUpdate).toBe(true);

		engine?.destroy();
		getContext.mockRestore();
	});

	it("resolves the colour from the theme when no fixed colour is given", () => {
		const ctx = fakeCtx();
		vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(ctx as never);

		const light = createDisplacementText({ container: makeHost() }, {});
		expect(ctx.fillStyle).toBe("#000000");
		light?.destroy();

		document.documentElement.classList.add("dark");
		const dark = createDisplacementText({ container: makeHost() }, {});
		expect(ctx.fillStyle).toBe("#ffffff");
		dark?.destroy();
	});

	it("copies the raycast hit point into the uDisplacement uniform on pointermove", () => {
		const host = makeHost();
		const engine = createDisplacementText({ container: host }, {});
		const point = { x: 1, y: 2, z: 3 };
		made.hit = { point };

		host.dispatchEvent(new MouseEvent("pointermove", { clientX: 200, clientY: 100 }));

		expect(made.raycasters[0].setFromCamera).toHaveBeenCalled();
		expect(made.materials[0].uniforms.uDisplacement.value.copy).toHaveBeenCalledWith(point);
		engine?.destroy();
	});

	it("leaves the uniform untouched when the ray misses", () => {
		const host = makeHost();
		const engine = createDisplacementText({ container: host }, {});
		made.hit = null;

		host.dispatchEvent(new MouseEvent("pointermove", { clientX: 10, clientY: 10 }));

		expect(made.materials[0].uniforms.uDisplacement.value.copy).not.toHaveBeenCalled();
		engine?.destroy();
	});

	describe("setOptions", () => {
		const cases: [string, Record<string, unknown>][] = [
			["text", { text: "Other" }],
			["fontSize", { fontSize: 42 }],
			["font", { font: "Georgia, serif" }],
			["color", { color: "#00ff00" }],
			["lightColor", { lightColor: "#111111" }],
			["darkColor", { darkColor: "#eeeeee" }],
		];

		for (const [key, patch] of cases) {
			it(`rebuilds the scene when ${key} changes`, () => {
				const host = makeHost();
				const engine = createDisplacementText({ container: host }, {});
				const first = made.renderers[0];

				engine?.setOptions(patch);

				expect(made.renderers).toHaveLength(2);
				expect(first.dispose).toHaveBeenCalledTimes(1);
				// the old canvas is swapped out for the new one, never stacked
				expect(host.querySelectorAll("canvas")).toHaveLength(1);
				expect(host.querySelector("canvas")).toBe(made.renderers[1].domElement);
				engine?.destroy();
			});
		}

		it("does nothing when every live key keeps its value", () => {
			const engine = createDisplacementText(
				{ container: makeHost() },
				{ text: "Hi", fontSize: 10 }
			);
			engine?.setOptions({ text: "Hi", fontSize: 10 });
			engine?.setOptions({});

			expect(made.renderers).toHaveLength(1);
			expect(made.renderers[0].dispose).not.toHaveBeenCalled();
			engine?.destroy();
		});

		it("is a no-op after destroy", () => {
			const engine = createDisplacementText({ container: makeHost() }, {});
			engine?.destroy();
			engine?.setOptions({ text: "Nope" });

			expect(made.renderers).toHaveLength(1);
		});
	});

	describe("theme observer", () => {
		let originalMutationObserver: typeof MutationObserver;
		let callbacks: MutationCallback[];
		let disconnects: ReturnType<typeof vi.fn>[];
		let observeSpy: ReturnType<typeof vi.fn>;

		beforeEach(() => {
			originalMutationObserver = global.MutationObserver;
			callbacks = [];
			disconnects = [];
			observeSpy = vi.fn();
			global.MutationObserver = function (cb: MutationCallback) {
				callbacks.push(cb);
				const disconnect = vi.fn();
				disconnects.push(disconnect);
				return { observe: observeSpy, disconnect };
			} as unknown as typeof MutationObserver;
		});

		afterEach(() => {
			global.MutationObserver = originalMutationObserver;
		});

		it("watches the documentElement class only when no fixed colour is set", () => {
			const a = createDisplacementText({ container: makeHost() }, {});
			expect(observeSpy).toHaveBeenCalledWith(document.documentElement, {
				attributes: true,
				attributeFilter: ["class"],
			});
			a?.destroy();

			observeSpy.mockClear();
			const b = createDisplacementText({ container: makeHost() }, { color: "#abcdef" });
			expect(observeSpy).not.toHaveBeenCalled();
			b?.destroy();
		});

		it("swaps and disposes the texture when the resolved colour changes", () => {
			const engine = createDisplacementText({ container: makeHost() }, {});
			const firstTexture = made.textures[0];

			// no class change yet → same colour → no new texture
			callbacks[0]?.([], {} as MutationObserver);
			expect(made.textures).toHaveLength(1);

			document.documentElement.classList.add("dark");
			callbacks[0]?.([], {} as MutationObserver);

			expect(made.textures).toHaveLength(2);
			expect(firstTexture.dispose).toHaveBeenCalledTimes(1);
			expect(made.materials[0].uniforms.uTexture.value).toBe(made.textures[1]);
			engine?.destroy();
		});

		it("disconnects the observer on destroy", () => {
			const engine = createDisplacementText({ container: makeHost() }, {});
			engine?.destroy();
			expect(disconnects[0]).toHaveBeenCalledTimes(1);
		});
	});

	describe("resize", () => {
		it("re-derives the frustum and the renderer size from the host", () => {
			const host = makeHost(400, 200);
			const engine = createDisplacementText({ container: host }, {});
			made.renderers[0].setSize.mockClear();

			host.getBoundingClientRect = () =>
				({ width: 800, height: 200, left: 0, top: 0, right: 800, bottom: 200 }) as DOMRect;
			engine?.resize();

			expect(made.cameras[0].left).toBe(-32);
			expect(made.cameras[0].right).toBe(32);
			expect(made.cameras[0].updateProjectionMatrix).toHaveBeenCalled();
			expect(made.renderers[0].setSize).toHaveBeenCalledWith(800, 200, false);
			engine?.destroy();
		});

		it("bails out on a zero-height host", () => {
			const host = makeHost(400, 200);
			const engine = createDisplacementText({ container: host }, {});
			made.renderers[0].setSize.mockClear();

			host.getBoundingClientRect = () =>
				({ width: 400, height: 0, left: 0, top: 0, right: 400, bottom: 0 }) as DOMRect;
			engine?.resize();

			expect(made.renderers[0].setSize).not.toHaveBeenCalled();
			engine?.destroy();
		});

		it("is a no-op after destroy", () => {
			const host = makeHost();
			const engine = createDisplacementText({ container: host }, {});
			engine?.destroy();
			made.renderers[0].setSize.mockClear();

			expect(() => engine?.resize()).not.toThrow();
			expect(made.renderers[0].setSize).not.toHaveBeenCalled();
		});

		it("is driven by the window resize listener, which is dropped on destroy", () => {
			const host = makeHost(400, 200);
			const removeSpy = vi.spyOn(window, "removeEventListener");
			const engine = createDisplacementText({ container: host }, {});
			made.renderers[0].setSize.mockClear();

			window.dispatchEvent(new Event("resize"));
			expect(made.renderers[0].setSize).toHaveBeenCalledWith(400, 200, false);

			engine?.destroy();
			expect(removeSpy).toHaveBeenCalledWith("resize", expect.any(Function));

			made.renderers[0].setSize.mockClear();
			window.dispatchEvent(new Event("resize"));
			expect(made.renderers[0].setSize).not.toHaveBeenCalled();
			removeSpy.mockRestore();
		});
	});

	describe("destroy", () => {
		it("cancels the frame, unmounts the canvas and disposes every three resource", () => {
			const host = makeHost();
			const engine = createDisplacementText({ container: host }, {});
			const renderer = made.renderers[0];

			engine?.destroy();

			expect(cafSpy).toHaveBeenCalledTimes(1);
			expect(cafSpy).toHaveBeenCalledWith(42);
			expect(host.querySelector("canvas")).toBeNull();
			expect(renderer.dispose).toHaveBeenCalledTimes(1);
			expect(made.textures[0].dispose).toHaveBeenCalledTimes(1);
			expect(made.materials[0].dispose).toHaveBeenCalledTimes(1);
		});

		it("is idempotent", () => {
			const engine = createDisplacementText({ container: makeHost() }, {});
			engine?.destroy();
			engine?.destroy();
			engine?.destroy();

			expect(cafSpy).toHaveBeenCalledTimes(1);
			expect(made.renderers[0].dispose).toHaveBeenCalledTimes(1);
		});

		it("stops the pointer handler", () => {
			const host = makeHost();
			const engine = createDisplacementText({ container: host }, {});
			engine?.destroy();
			made.hit = { point: { x: 1, y: 1, z: 1 } };

			host.dispatchEvent(new MouseEvent("pointermove", { clientX: 5, clientY: 5 }));

			expect(made.materials[0].uniforms.uDisplacement.value.copy).not.toHaveBeenCalled();
		});
	});
});

describe("createTextTexture", () => {
	beforeEach(resetMade);

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("still returns a texture when the 2d context is unavailable", () => {
		vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
		const texture = createTextTexture("x", 10, "serif", "#000");
		expect(texture).toBeTruthy();
		expect(made.textures).toHaveLength(1);
	});
});
