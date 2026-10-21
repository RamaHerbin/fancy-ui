import { render, cleanup, screen } from "@testing-library/svelte";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { tick } from "svelte";
import DisplacementText from "./DisplacementText.svelte";
import { STATIC_LAYER_STYLE } from "./displacement-text-core.js";

// Holds the last renderer instance created by the mock
const lastMock = { renderer: null as any };

// Three.js uses WebGL which is not available in jsdom — mock the module
vi.mock("three", () => {
	function Vector2() {
		return { x: 0, y: 0 };
	}
	function Vector3() {
		return { x: 0, y: 0, z: 0, copy: vi.fn() };
	}
	function CanvasTexture() {
		return { needsUpdate: false, dispose: vi.fn() };
	}
	function ShaderMaterial() {
		return {
			uniforms: { uTexture: { value: null }, uDisplacement: { value: { copy: vi.fn() } } },
			dispose: vi.fn(),
		};
	}
	function PlaneGeometry() {
		return { dispose: vi.fn() };
	}
	function MeshBasicMaterial() {
		return { dispose: vi.fn() };
	}
	function Mesh() {
		return { rotation: { z: 0 } };
	}
	function Scene() {
		return { background: null, add: vi.fn() };
	}
	function OrthographicCamera() {
		return {
			position: { set: vi.fn() },
			left: 0,
			right: 0,
			updateProjectionMatrix: vi.fn(),
			lookAt: vi.fn(),
		};
	}
	function Raycaster() {
		return {
			setFromCamera: vi.fn(),
			intersectObject: vi.fn(() => []),
		};
	}
	function WebGLRenderer() {
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
		lastMock.renderer = instance;
		return instance;
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

const REDUCE = "(prefers-reduced-motion: reduce)";

/**
 * Replaces the ambient `getContext -> null` stub (WebGL "unavailable") with a
 * WebGL2 stand-in good enough for the component's preflight probe.
 */
function stubWebGL() {
	const gl = {
		getExtension: (name: string) =>
			name === "WEBGL_lose_context" ? { loseContext: vi.fn() } : null,
	};
	const original = HTMLCanvasElement.prototype.getContext;
	HTMLCanvasElement.prototype.getContext = ((id: string) =>
		id === "webgl2" ? gl : null) as typeof HTMLCanvasElement.prototype.getContext;
	return () => {
		HTMLCanvasElement.prototype.getContext = original;
	};
}

/** A `prefers-reduced-motion` query the test can flip, firing `change` like a browser. */
function stubReducedMotion(initial: boolean) {
	const original = window.matchMedia;
	const listeners = new Set<(event: MediaQueryListEvent) => void>();
	const mql = {
		matches: initial,
		media: REDUCE,
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
		value: (query: string) => (query === REDUCE ? mql : { ...mql, matches: false, media: query }),
	});
	return {
		listeners,
		set(matches: boolean) {
			mql.matches = matches;
			for (const l of [...listeners]) l({ matches, media: REDUCE } as MediaQueryListEvent);
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

describe("DisplacementText", () => {
	let restoreWebGL: () => void;

	beforeEach(() => {
		lastMock.renderer = null;
		restoreWebGL = stubWebGL();
	});

	afterEach(() => {
		cleanup();
		restoreWebGL();
	});

	it("renders a div container", () => {
		const { container } = render(DisplacementText);
		expect(container.querySelector("div")).toBeTruthy();
	});

	it("applies default height class", () => {
		const { container } = render(DisplacementText);
		expect(container.querySelector("div")?.className).toContain("h-[400px]");
	});

	it("applies additional class", () => {
		const { container } = render(DisplacementText, { props: { class: "h-[600px]" } });
		expect(container.querySelector("div")?.className).toContain("h-[600px]");
	});

	it("renders with custom text prop", () => {
		const { container } = render(DisplacementText, { props: { text: "FancyUI" } });
		expect(container.querySelector("div")).toBeTruthy();
	});

	it("exposes the text to assistive technology via an accessible img role", () => {
		render(DisplacementText, { props: { text: "Hello" } });
		expect(screen.getByRole("img", { name: "Hello" })).toBeTruthy();
	});

	describe("cleanup on unmount", () => {
		it("removes resize listener", () => {
			const spy = vi.spyOn(window, "removeEventListener");
			const { unmount } = render(DisplacementText);
			unmount();
			expect(spy).toHaveBeenCalledWith("resize", expect.any(Function));
			spy.mockRestore();
		});

		it("cancels animation frame", () => {
			const spy = vi.spyOn(window, "cancelAnimationFrame");
			const { unmount } = render(DisplacementText);
			unmount();
			expect(spy).toHaveBeenCalled();
			spy.mockRestore();
		});

		it("disposes renderer", () => {
			const { unmount } = render(DisplacementText);
			const renderer = lastMock.renderer;
			unmount();
			expect(renderer.dispose).toHaveBeenCalled();
		});
	});

	describe("theme observer", () => {
		let originalMutationObserver: typeof MutationObserver;

		beforeEach(() => {
			originalMutationObserver = global.MutationObserver;
		});

		afterEach(() => {
			global.MutationObserver = originalMutationObserver;
		});

		it("does not observe document when color prop is provided", () => {
			const observeSpy = vi.fn();
			global.MutationObserver = function MutationObserver() {
				return { observe: observeSpy, disconnect: vi.fn() };
			} as unknown as typeof MutationObserver;

			render(DisplacementText, { props: { color: "#ff0000" } });
			expect(observeSpy).not.toHaveBeenCalled();
		});

		it("observes document when no fixed color is provided", () => {
			const observeSpy = vi.fn();
			global.MutationObserver = function MutationObserver() {
				return { observe: observeSpy, disconnect: vi.fn() };
			} as unknown as typeof MutationObserver;

			render(DisplacementText);
			expect(observeSpy).toHaveBeenCalledWith(
				document.documentElement,
				expect.objectContaining({ attributes: true, attributeFilter: ["class"] })
			);
		});
	});

	describe("prefers-reduced-motion", () => {
		let motion: ReturnType<typeof stubReducedMotion> | undefined;

		afterEach(() => {
			motion?.restore();
			motion = undefined;
			vi.restoreAllMocks();
		});

		it("starts no render loop and shows the real text, styled, when reduce is on at mount", () => {
			motion = stubReducedMotion(true);
			const rafSpy = vi.spyOn(window, "requestAnimationFrame");

			const { container } = render(DisplacementText, {
				props: { text: "Calm", font: "Georgia, serif", color: "#123456" },
			});

			expect(rafSpy).not.toHaveBeenCalled();
			expect(lastMock.renderer).toBeNull();
			expect(container.querySelector("canvas")).toBeNull();
			const textNode = screen.getByText("Calm");
			expect(textNode.style.fontFamily).toBe("Georgia, serif");
			expect(textNode.style.fontWeight).toBe("bold");
			expect(textNode.style.color).toBe("rgb(18, 52, 86)");
		});

		it("lays out the static layer from the shared STATIC_LAYER_STYLE", () => {
			motion = stubReducedMotion(true);
			render(DisplacementText, { props: { text: "Layer" } });
			const layer = screen.getByText("Layer").parentElement as HTMLElement;
			for (const [key, value] of Object.entries(STATIC_LAYER_STYLE)) {
				const prop = key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
				expect(layer.style.getPropertyValue(prop)).toBe(value);
			}
		});

		it("stops on a change to reduce and starts again on a change back, without remounting", async () => {
			motion = stubReducedMotion(false);
			const { container } = render(DisplacementText, { props: { text: "Flip" } });
			const root = container.firstElementChild;
			const first = lastMock.renderer;

			expect(first).not.toBeNull();
			expect(container.querySelector("canvas")).toBe(first.domElement);
			expect(screen.queryByText("Flip")).toBeNull();

			const cafSpy = vi.spyOn(window, "cancelAnimationFrame");
			motion.set(true);
			await tick();

			expect(cafSpy).toHaveBeenCalled();
			expect(first.dispose).toHaveBeenCalledTimes(1);
			expect(container.querySelector("canvas")).toBeNull();
			expect(screen.getByText("Flip")).toBeInTheDocument();

			motion.set(false);
			await tick();

			expect(lastMock.renderer).not.toBe(first);
			expect(container.querySelector("canvas")).toBe(lastMock.renderer.domElement);
			expect(screen.queryByText("Flip")).toBeNull();
			expect(container.firstElementChild).toBe(root);
		});

		it("drops its media-query listener on unmount", () => {
			motion = stubReducedMotion(false);
			const { unmount } = render(DisplacementText);
			expect(motion.listeners.size).toBe(1);
			unmount();
			expect(motion.listeners.size).toBe(0);
		});

		it("shows the static text when WebGL is unavailable", () => {
			restoreWebGL();
			const rafSpy = vi.spyOn(window, "requestAnimationFrame");
			render(DisplacementText, { props: { text: "No GPU" } });
			expect(rafSpy).not.toHaveBeenCalled();
			expect(screen.getByText("No GPU")).toBeInTheDocument();
			restoreWebGL = stubWebGL();
		});
	});
});
