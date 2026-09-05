import { render, cleanup, act } from "@testing-library/react";
import { afterEach, describe, it, expect, vi } from "vitest";
import { NoiseReveal } from "./NoiseReveal.js";
import { FakeIntersectionObserver } from "../../test-setup.js";

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
		const { container } = render(<NoiseReveal src={src} />);
		expect(container.querySelector("div")).toBeTruthy();
	});

	it("applies default height class", () => {
		const { container } = render(<NoiseReveal src={src} />);
		expect(container.querySelector("div")?.className).toContain("h-[400px]");
	});

	it("applies additional class", () => {
		const { container } = render(<NoiseReveal src={src} className="h-[600px]" />);
		expect(container.querySelector("div")?.className).toContain("h-[600px]");
	});

	it("exposes alt text as an accessible image role", () => {
		const { container } = render(<NoiseReveal src={src} alt="Mountain at dusk" />);
		const div = container.querySelector("div[role='img']");
		expect(div).toBeTruthy();
		expect(div?.getAttribute("aria-label")).toBe("Mountain at dusk");
	});

	it("has no img role without alt text", () => {
		const { container } = render(<NoiseReveal src={src} />);
		expect(container.querySelector("div[role='img']")).toBeFalsy();
	});

	describe("cleanup on unmount", () => {
		it("removes resize listener", () => {
			const spy = vi.spyOn(window, "removeEventListener");
			const { unmount } = render(<NoiseReveal src={src} />);
			unmount();
			expect(spy).toHaveBeenCalledWith("resize", expect.any(Function));
			spy.mockRestore();
		});

		it("cancels animation frame", () => {
			const spy = vi.spyOn(window, "cancelAnimationFrame");
			const { unmount } = render(<NoiseReveal src={src} />);
			unmount();
			expect(spy).toHaveBeenCalled();
			spy.mockRestore();
		});

		it("disposes renderer", () => {
			const { unmount } = render(<NoiseReveal src={src} />);
			const renderer = lastMock.renderer;
			unmount();
			expect(renderer.dispose).toHaveBeenCalled();
		});
	});
	describe("render loop visibility gating", () => {
		/** The observer that gates the render loop — `threshold: 0`, unlike the
		 * reveal trigger's `0.1`. */
		function gateObserver(): FakeIntersectionObserver {
			const gate = FakeIntersectionObserver.instances.find((o) => o.options?.threshold === 0);
			return gate as FakeIntersectionObserver;
		}

		/** Takes the frame queue over so a test can pump it one frame at a time. */
		function installFrameHarness() {
			let pending: FrameRequestCallback | null = null;
			const raf = vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
				pending = cb;
				return 1;
			});
			const caf = vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {
				pending = null;
			});
			return {
				get pending() {
					return pending;
				},
				step() {
					const cb = pending;
					pending = null;
					cb?.(0);
				},
				restore() {
					raf.mockRestore();
					caf.mockRestore();
				},
			};
		}

		function setHidden(hidden: boolean) {
			Object.defineProperty(document, "hidden", { configurable: true, value: hidden });
		}

		function restoreHidden() {
			delete (document as unknown as { hidden?: boolean }).hidden;
		}

		it("stops the loop while the container is out of view and resumes it on the way back", () => {
			const frames = installFrameHarness();
			try {
				render(<NoiseReveal src={src} />);
				const renderer = lastMock.renderer;
				expect(renderer.render).toHaveBeenCalledTimes(1);

				frames.step();
				expect(renderer.render).toHaveBeenCalledTimes(2);

				act(() => gateObserver().trigger(false));

				// The queued frame was cancelled and no replacement scheduled, so pumping
				// the queue paints nothing at all.
				expect(frames.pending).toBeNull();
				frames.step();
				expect(renderer.render).toHaveBeenCalledTimes(2);

				act(() => gateObserver().trigger(true));
				expect(renderer.render).toHaveBeenCalledTimes(3);
			} finally {
				frames.restore();
			}
		});

		it("does not queue a second loop when the observer reports visible while already running", () => {
			const frames = installFrameHarness();
			try {
				render(<NoiseReveal src={src} />);
				const renderer = lastMock.renderer;

				act(() => gateObserver().trigger(true));
				act(() => gateObserver().trigger(true));

				// A second loop would paint two frames per pump.
				frames.step();
				expect(renderer.render).toHaveBeenCalledTimes(2);
			} finally {
				frames.restore();
			}
		});

		it("stops the loop while the tab is hidden and resumes it when it comes back", () => {
			const frames = installFrameHarness();
			try {
				render(<NoiseReveal src={src} />);
				const renderer = lastMock.renderer;
				expect(renderer.render).toHaveBeenCalledTimes(1);

				setHidden(true);
				act(() => {
					document.dispatchEvent(new Event("visibilitychange"));
				});
				expect(frames.pending).toBeNull();
				frames.step();
				expect(renderer.render).toHaveBeenCalledTimes(1);

				setHidden(false);
				act(() => {
					document.dispatchEvent(new Event("visibilitychange"));
				});
				expect(renderer.render).toHaveBeenCalledTimes(2);
			} finally {
				restoreHidden();
				frames.restore();
			}
		});
	});
});
