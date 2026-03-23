import { render, cleanup } from "@testing-library/svelte";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import DisplacementText from "./DisplacementText.svelte";

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

describe("DisplacementText", () => {
	afterEach(cleanup);

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
});
