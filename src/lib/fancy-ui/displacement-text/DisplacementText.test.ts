import { render, cleanup } from "@testing-library/svelte";
import { afterEach, describe, it, expect, vi } from "vitest";
import DisplacementText from "./DisplacementText.svelte";

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
		return {};
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
	const domCanvas = document.createElement("canvas");
	domCanvas.style.width = "";
	domCanvas.style.height = "";
	function WebGLRenderer() {
		return {
			setClearColor: vi.fn(),
			setPixelRatio: vi.fn(),
			setSize: vi.fn(),
			render: vi.fn(),
			dispose: vi.fn(),
			domElement: domCanvas,
		};
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
		const div = container.querySelector("div");
		expect(div?.className).toContain("h-[400px]");
	});

	it("applies additional class", () => {
		const { container } = render(DisplacementText, { props: { class: "h-[600px]" } });
		const div = container.querySelector("div");
		expect(div?.className).toContain("h-[600px]");
	});

	it("renders with custom text prop", () => {
		const { container } = render(DisplacementText, { props: { text: "FancyUI" } });
		expect(container.querySelector("div")).toBeTruthy();
	});
});
