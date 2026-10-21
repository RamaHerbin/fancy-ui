import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
	DEFAULT_MAX_DPR,
	REDUCED_MOTION_QUERY,
	STATIC_TEXT_TRANSFORM,
	canCreateWebGLContext,
	createDisplacementText,
	createTextTexture,
	mountDisplacementText,
	resolvePixelRatio,
	staticTextStyle,
	type DisplacementTextState,
} from "./displacement-text-core.js";

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
	/** When set, the mocked `WebGLRenderer` constructor throws like three does without a context. */
	failRenderer: false,
	/** When set, the mocked `ShaderMaterial` constructor throws, after the renderer exists. */
	failMaterial: false,
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
	made.failRenderer = false;
	made.failMaterial = false;
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
		if (made.failMaterial) throw new Error("Material construction failed.");
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
		if (made.failRenderer) throw new Error("Error creating WebGL context.");
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
		];

		for (const [key, patch] of cases) {
			it(`re-rasterizes the texture in place, without rebuilding the scene, when ${key} changes`, () => {
				const host = makeHost();
				const engine = createDisplacementText({ container: host }, {});
				const first = made.renderers[0];
				const firstTexture = made.textures[0];

				engine?.setOptions(patch);

				expect(made.renderers).toHaveLength(1);
				expect(first.dispose).not.toHaveBeenCalled();
				expect(host.querySelectorAll("canvas")).toHaveLength(1);
				expect(made.textures).toHaveLength(2);
				expect(firstTexture.dispose).toHaveBeenCalledTimes(1);
				expect(made.materials[0].uniforms.uTexture.value).toBe(made.textures[1]);
				engine?.destroy();
			});
		}

		it("leaves the texture alone when only the inactive theme colour changes", () => {
			const engine = createDisplacementText({ container: makeHost() }, {});
			// light mode: darkColor is not the colour on screen
			engine?.setOptions({ darkColor: "#eeeeee" });
			expect(made.textures).toHaveLength(1);
			expect(made.renderers).toHaveLength(1);
			engine?.destroy();
		});

		it("re-applies the capped pixel ratio when maxDpr changes, without rebuilding", () => {
			const dpr = vi.spyOn(window, "devicePixelRatio", "get").mockReturnValue(3);
			const engine = createDisplacementText({ container: makeHost() }, {});
			expect(made.renderers[0].setPixelRatio).toHaveBeenLastCalledWith(2);

			engine?.setOptions({ maxDpr: 1 });

			expect(made.renderers).toHaveLength(1);
			expect(made.renderers[0].setPixelRatio).toHaveBeenLastCalledWith(1);
			expect(made.renderers[0].setSize).toHaveBeenLastCalledWith(400, 200, false);
			engine?.destroy();
			dpr.mockRestore();
		});

		it("does nothing when every live key keeps its value", () => {
			const engine = createDisplacementText(
				{ container: makeHost() },
				{ text: "Hi", fontSize: 10 }
			);
			engine?.setOptions({ text: "Hi", fontSize: 10 });
			engine?.setOptions({});

			expect(made.renderers).toHaveLength(1);
			expect(made.textures).toHaveLength(1);
			expect(made.renderers[0].dispose).not.toHaveBeenCalled();
			engine?.destroy();
		});

		it("is a no-op after destroy", () => {
			const engine = createDisplacementText({ container: makeHost() }, {});
			engine?.destroy();
			engine?.setOptions({ text: "Nope" });

			expect(made.renderers).toHaveLength(1);
			expect(made.textures).toHaveLength(1);
		});
	});

	describe("pixel ratio", () => {
		it("caps the device pixel ratio at 2 by default", () => {
			const dpr = vi.spyOn(window, "devicePixelRatio", "get").mockReturnValue(3);
			const engine = createDisplacementText({ container: makeHost() }, {});
			expect(made.renderers[0].setPixelRatio).toHaveBeenCalledWith(2);
			engine?.destroy();
			dpr.mockRestore();
		});

		it("honours a custom cap", () => {
			const dpr = vi.spyOn(window, "devicePixelRatio", "get").mockReturnValue(3);
			const engine = createDisplacementText({ container: makeHost() }, { maxDpr: 1.5 });
			expect(made.renderers[0].setPixelRatio).toHaveBeenCalledWith(1.5);
			engine?.destroy();
			dpr.mockRestore();
		});
	});

	describe("WebGL failures", () => {
		it("returns null and leaves the host untouched when the renderer cannot get a context", () => {
			made.failRenderer = true;
			const host = makeHost();
			const engine = createDisplacementText({ container: host }, {});

			expect(engine).toBeNull();
			expect(host.querySelector("canvas")).toBeNull();
			expect(rafSpy).not.toHaveBeenCalled();
		});

		it("releases the renderer and leaves the host untouched when the scene build throws", () => {
			made.failMaterial = true;
			const host = makeHost();
			const engine = createDisplacementText({ container: host }, {});

			expect(engine).toBeNull();
			expect(made.renderers).toHaveLength(1);
			expect(made.renderers[0].dispose).toHaveBeenCalledTimes(1);
			expect(made.textures[0].dispose).toHaveBeenCalledTimes(1);
			expect(host.querySelector("canvas")).toBeNull();
			expect(rafSpy).not.toHaveBeenCalled();
		});

		it("stops the loop, releases everything and reports a lost context", () => {
			const onContextLost = vi.fn();
			const host = makeHost();
			const engine = createDisplacementText({ container: host }, { onContextLost });
			const renderer = made.renderers[0];
			const event = new Event("webglcontextlost", { cancelable: true });

			renderer.domElement.dispatchEvent(event);

			expect(event.defaultPrevented).toBe(true);
			expect(onContextLost).toHaveBeenCalledTimes(1);
			expect(cafSpy).toHaveBeenCalledWith(42);
			expect(renderer.dispose).toHaveBeenCalledTimes(1);
			expect(made.textures[0].dispose).toHaveBeenCalledTimes(1);
			expect(host.querySelector("canvas")).toBeNull();

			// a later destroy does not release anything twice
			engine?.destroy();
			expect(renderer.dispose).toHaveBeenCalledTimes(1);
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

describe("resolvePixelRatio", () => {
	it("caps at the default of 2", () => {
		expect(DEFAULT_MAX_DPR).toBe(2);
		expect(resolvePixelRatio(3, undefined)).toBe(2);
		expect(resolvePixelRatio(1, undefined)).toBe(1);
	});

	it("caps at a custom maximum", () => {
		expect(resolvePixelRatio(3, 1.5)).toBe(1.5);
		expect(resolvePixelRatio(1, 4)).toBe(1);
	});

	it("treats a missing device ratio as 1 and an unusable cap as the default", () => {
		expect(resolvePixelRatio(undefined, 2)).toBe(1);
		expect(resolvePixelRatio(3, 0)).toBe(2);
		expect(resolvePixelRatio(3, Number.NaN)).toBe(2);
	});
});

describe("staticTextStyle", () => {
	it("styles the DOM text like the resting frame: bold, same family, colour and projected size", () => {
		const style = staticTextStyle({ fontSize: 200, font: "Georgia, serif" }, "#123456");
		expect(style.fontFamily).toBe("Georgia, serif");
		expect(style.fontWeight).toBe("bold");
		expect(style.color).toBe("#123456");
		// 200 texture px → 200 * 15/2048 world units; the frustum is 16 units tall
		expect(style.fontSize).toBe(`calc(${(200 * 15) / 2048 / 16} * 100cqh)`);
		expect(style.transform).toBe(STATIC_TEXT_TRANSFORM);
		expect(style.whiteSpace).toBe("nowrap");
	});
});

/** A minimal WebGL2 stand-in for the preflight probe. */
function stubWebGL(available = true) {
	const loseContext = vi.fn();
	const gl = {
		getExtension: (name: string) => (name === "WEBGL_lose_context" ? { loseContext } : null),
	};
	const spy = vi
		.spyOn(HTMLCanvasElement.prototype, "getContext")
		.mockImplementation(((id: string) => (available && id === "webgl2" ? gl : null)) as never);
	return { loseContext, spy };
}

/** A controllable `prefers-reduced-motion` media query. */
function stubReducedMotion(initial: boolean) {
	const original = window.matchMedia;
	const listeners = new Set<(event: MediaQueryListEvent) => void>();
	const mql = {
		matches: initial,
		media: REDUCED_MOTION_QUERY,
		onchange: null,
		addEventListener: (_: string, l: (event: MediaQueryListEvent) => void) => listeners.add(l),
		removeEventListener: (_: string, l: (event: MediaQueryListEvent) => void) =>
			listeners.delete(l),
		addListener: () => {},
		removeListener: () => {},
		dispatchEvent: () => false,
	};
	Object.defineProperty(window, "matchMedia", {
		writable: true,
		configurable: true,
		value: (query: string) =>
			query === REDUCED_MOTION_QUERY ? mql : { ...mql, matches: false, media: query },
	});
	return {
		listeners,
		set(matches: boolean) {
			mql.matches = matches;
			for (const l of [...listeners])
				l({ matches, media: REDUCED_MOTION_QUERY } as MediaQueryListEvent);
		},
		restore() {
			Object.defineProperty(window, "matchMedia", {
				writable: true,
				configurable: true,
				value: original,
			});
		},
	};
}

describe("canCreateWebGLContext", () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("is false when no WebGL2 context can be created", () => {
		stubWebGL(false);
		expect(canCreateWebGLContext()).toBe(false);
	});

	it("is true when a context comes back, and releases the probe context at once", () => {
		const { loseContext } = stubWebGL(true);
		expect(canCreateWebGLContext()).toBe(true);
		expect(loseContext).toHaveBeenCalledTimes(1);
	});
});

describe("mountDisplacementText", () => {
	let rafSpy: ReturnType<typeof vi.spyOn>;
	let cafSpy: ReturnType<typeof vi.spyOn>;
	let motion: ReturnType<typeof stubReducedMotion> | undefined;
	let states: DisplacementTextState[];
	const onChange = (state: DisplacementTextState) => {
		states.push(state);
	};
	const last = () => states[states.length - 1];

	beforeEach(() => {
		resetMade();
		states = [];
		motion = undefined;
		document.documentElement.classList.remove("dark");
		rafSpy = vi.spyOn(window, "requestAnimationFrame").mockImplementation(() => 42);
		cafSpy = vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});
	});

	afterEach(() => {
		motion?.restore();
		document.body.innerHTML = "";
		document.documentElement.classList.remove("dark");
		vi.restoreAllMocks();
	});

	it("starts no loop and stays static when reduced motion is on at mount", () => {
		motion = stubReducedMotion(true);
		stubWebGL(true);
		const host = makeHost();
		const controller = mountDisplacementText({ container: host }, { text: "Still", onChange });

		expect(last()?.mode).toBe("static");
		expect(made.renderers).toHaveLength(0);
		expect(rafSpy).not.toHaveBeenCalled();
		expect(host.querySelector("canvas")).toBeNull();
		controller.destroy();
	});

	it("runs the effect when motion is allowed and WebGL is available", () => {
		motion = stubReducedMotion(false);
		stubWebGL(true);
		const host = makeHost();
		const controller = mountDisplacementText({ container: host }, { onChange });

		expect(last()?.mode).toBe("webgl");
		expect(made.renderers).toHaveLength(1);
		expect(rafSpy).toHaveBeenCalled();
		controller.destroy();
	});

	it("stops and releases the scene when reduced motion turns on, and restarts when it turns off", () => {
		motion = stubReducedMotion(false);
		stubWebGL(true);
		const host = makeHost();
		const controller = mountDisplacementText({ container: host }, { onChange });
		const first = made.renderers[0];

		motion.set(true);
		expect(last()?.mode).toBe("static");
		expect(cafSpy).toHaveBeenCalledWith(42);
		expect(first.dispose).toHaveBeenCalledTimes(1);
		expect(host.querySelector("canvas")).toBeNull();

		rafSpy.mockClear();
		motion.set(false);
		expect(last()?.mode).toBe("webgl");
		expect(made.renderers).toHaveLength(2);
		expect(rafSpy).toHaveBeenCalled();
		expect(host.querySelectorAll("canvas")).toHaveLength(1);
		controller.destroy();
	});

	it("stays static when the WebGL preflight fails", () => {
		motion = stubReducedMotion(false);
		stubWebGL(false);
		const controller = mountDisplacementText({ container: makeHost() }, { onChange });

		expect(last()?.mode).toBe("static");
		expect(made.renderers).toHaveLength(0);
		expect(rafSpy).not.toHaveBeenCalled();
		controller.destroy();
	});

	it("stays static when the renderer itself throws", () => {
		motion = stubReducedMotion(false);
		stubWebGL(true);
		made.failRenderer = true;
		const controller = mountDisplacementText({ container: makeHost() }, { onChange });
		expect(last()?.mode).toBe("static");
		controller.destroy();
	});

	it("never throws when the scene build fails, and still drops its listener on destroy", () => {
		motion = stubReducedMotion(false);
		stubWebGL(true);
		made.failMaterial = true;
		const host = makeHost();
		const controller = mountDisplacementText({ container: host }, { onChange });

		expect(last()?.mode).toBe("static");
		expect(host.querySelector("canvas")).toBeNull();
		expect(made.renderers[0].dispose).toHaveBeenCalledTimes(1);
		expect(motion.listeners.size).toBe(1);

		controller.destroy();
		expect(motion.listeners.size).toBe(0);
	});

	it("falls back to static for the rest of the mount after a context loss", () => {
		motion = stubReducedMotion(false);
		stubWebGL(true);
		const controller = mountDisplacementText({ container: makeHost() }, { onChange });

		made.renderers[0].domElement.dispatchEvent(new Event("webglcontextlost", { cancelable: true }));
		expect(last()?.mode).toBe("static");

		motion.set(true);
		motion.set(false);
		expect(made.renderers).toHaveLength(1);
		expect(last()?.mode).toBe("static");
		controller.destroy();
	});

	it("reports the resolved text colour and follows option changes while static", () => {
		motion = stubReducedMotion(true);
		const controller = mountDisplacementText(
			{ container: makeHost() },
			{ lightColor: "#111111", darkColor: "#eeeeee", onChange }
		);
		expect(last()?.color).toBe("#111111");

		controller.setOptions({ lightColor: "#222222" });
		expect(last()?.color).toBe("#222222");

		controller.setOptions({ color: "#ff0000" });
		expect(last()?.color).toBe("#ff0000");
		controller.destroy();
	});

	it("forwards option changes to the running engine without rebuilding it", () => {
		motion = stubReducedMotion(false);
		stubWebGL(true);
		const controller = mountDisplacementText({ container: makeHost() }, { onChange });
		controller.setOptions({ text: "Next" });
		expect(made.renderers).toHaveLength(1);
		expect(made.textures).toHaveLength(2);
		controller.destroy();
	});

	it("drops its media-query listener and the engine on destroy", () => {
		motion = stubReducedMotion(false);
		stubWebGL(true);
		const controller = mountDisplacementText({ container: makeHost() }, { onChange });
		expect(motion.listeners.size).toBe(1);

		controller.destroy();
		expect(motion.listeners.size).toBe(0);
		expect(made.renderers[0].dispose).toHaveBeenCalledTimes(1);

		const count = states.length;
		motion.set(true);
		motion.set(false);
		expect(made.renderers).toHaveLength(1);
		expect(states).toHaveLength(count);
	});
});
