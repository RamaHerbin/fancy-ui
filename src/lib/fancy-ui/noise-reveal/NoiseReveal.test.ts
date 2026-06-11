import { render, cleanup } from "@testing-library/svelte";
import { afterEach, describe, it, expect, vi } from "vitest";
import NoiseReveal from "./NoiseReveal.svelte";

// Holds the last renderer instance created by the mock
const lastMock = { renderer: null as any };

// Three.js uses WebGL which is not available in jsdom — mock the module
vi.mock("three", () => {
	function Vector2() {
		return { x: 0, y: 0, set: vi.fn() };
	}
	function Texture() {
		return { dispose: vi.fn(), colorSpace: "", image: {} };
	}
	function TextureLoader() {
		return { load: vi.fn(() => Texture()) };
	}
	function ShaderMaterial() {
		return {
			uniforms: {
				uTexture: { value: null },
				uTime: { value: 0 },
				uProgress: { value: 0 },
				uRes: { value: Vector2() },
				uImageRes: { value: Vector2() },
			},
			dispose: vi.fn(),
		};
	}
	function PlaneGeometry() {
		return { dispose: vi.fn() };
	}
	function Mesh() {
		return { scale: { set: vi.fn() } };
	}
	function Scene() {
		return { background: null, add: vi.fn() };
	}
	function PerspectiveCamera() {
		return {
			position: { set: vi.fn() },
			aspect: 1,
			updateProjectionMatrix: vi.fn(),
		};
	}
	function Clock() {
		return { getElapsedTime: vi.fn(() => 0) };
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

const src = "https://example.com/image.jpg";

describe("NoiseReveal", () => {
	afterEach(cleanup);

	it("renders a div container", () => {
		const { container } = render(NoiseReveal, { props: { src } });
		expect(container.querySelector("div")).toBeTruthy();
	});

	it("applies default height class", () => {
		const { container } = render(NoiseReveal, { props: { src } });
		expect(container.querySelector("div")?.className).toContain("h-[400px]");
	});

	it("applies additional class", () => {
		const { container } = render(NoiseReveal, { props: { src, class: "h-[600px]" } });
		expect(container.querySelector("div")?.className).toContain("h-[600px]");
	});

	it("exposes alt text as an accessible image role", () => {
		const { container } = render(NoiseReveal, { props: { src, alt: "Mountain at dusk" } });
		const div = container.querySelector("div[role='img']");
		expect(div).toBeTruthy();
		expect(div?.getAttribute("aria-label")).toBe("Mountain at dusk");
	});

	it("has no img role without alt text", () => {
		const { container } = render(NoiseReveal, { props: { src } });
		expect(container.querySelector("div[role='img']")).toBeFalsy();
	});

	describe("cleanup on unmount", () => {
		it("removes resize listener", () => {
			const spy = vi.spyOn(window, "removeEventListener");
			const { unmount } = render(NoiseReveal, { props: { src } });
			unmount();
			expect(spy).toHaveBeenCalledWith("resize", expect.any(Function));
			spy.mockRestore();
		});

		it("cancels animation frame", () => {
			const spy = vi.spyOn(window, "cancelAnimationFrame");
			const { unmount } = render(NoiseReveal, { props: { src } });
			unmount();
			expect(spy).toHaveBeenCalled();
			spy.mockRestore();
		});

		it("disposes renderer", () => {
			const { unmount } = render(NoiseReveal, { props: { src } });
			const renderer = lastMock.renderer;
			unmount();
			expect(renderer.dispose).toHaveBeenCalled();
		});
	});
});
