import { render, cleanup } from "@testing-library/svelte";
import { afterEach, describe, it, expect, vi } from "vitest";
import FireworksHdr from "./FireworksHdr.svelte";
import type { FireworksEngineHandle } from "./webgpu-renderer.js";

// jsdom has no real GPU, so the only way to reach the code that wires the
// window listeners is to hand the component a stand-in engine. The component
// only calls this factory when `navigator.gpu` exists, so every test that does
// not stub it keeps exercising the untouched no-renderer path below.
vi.mock("./webgpu-renderer.js", async (importOriginal) => {
	const actual = await importOriginal<typeof import("./webgpu-renderer.js")>();
	return {
		...actual,
		startWebGpuFireworks: vi.fn(
			async (): Promise<FireworksEngineHandle> => ({
				frame() {},
				resizeIfNeeded() {},
				setRenderScale() {},
				extendedToneMapping: true,
				renderLevel: "webgpu-hdr",
				lost: false,
				instanceCapacity: 4096,
				destroy() {},
			})
		),
	};
});

/** Pretend a WebGPU adapter exists for the duration of one test. */
function withFakeGpu(): () => void {
	Object.defineProperty(navigator, "gpu", { value: {}, configurable: true });
	return () => {
		Reflect.deleteProperty(navigator, "gpu");
	};
}

function calledWithPointerdown(spy: { mock: { calls: unknown[][] } }): boolean {
	return spy.mock.calls.some((call) => call[0] === "pointerdown");
}

// jsdom exposes no `navigator.gpu`, so these exercise the no-renderer path:
// the component mounts inertly and never fires onReady (the app's own timeout
// owns the fallback decision).
describe("FireworksHdr", () => {
	afterEach(cleanup);

	it("renders a wrapper div", () => {
		const { container } = render(FireworksHdr);
		const div = container.firstElementChild as HTMLElement;
		expect(div).toBeInTheDocument();
	});

	it("renders a canvas element", () => {
		const { container } = render(FireworksHdr);
		expect(container.querySelector("canvas")).toBeInTheDocument();
	});

	it("wrapper is pointer-events-none and absolutely fills its parent", () => {
		const { container } = render(FireworksHdr);
		const div = container.firstElementChild as HTMLElement;
		expect(div.className).toContain("pointer-events-none");
		expect(div.className).toContain("absolute");
		expect(div.className).toContain("inset-0");
	});

	it("wrapper is aria-hidden (decorative)", () => {
		const { container } = render(FireworksHdr);
		const div = container.firstElementChild as HTMLElement;
		expect(div.getAttribute("aria-hidden")).toBe("true");
	});

	it("applies a custom class name", () => {
		const { container } = render(FireworksHdr, { props: { class: "my-fireworks" } });
		const div = container.firstElementChild as HTMLElement;
		expect(div.className).toContain("my-fireworks");
	});

	it("does not fire onReady when no GPU renderer is available (jsdom)", async () => {
		const onReady = vi.fn();
		render(FireworksHdr, { props: { onReady } });
		await new Promise((resolve) => setTimeout(resolve, 0));
		expect(onReady).not.toHaveBeenCalled();
	});

	it("does not fire onLost when no engine ever booted (that is not a loss)", async () => {
		const onLost = vi.fn();
		render(FireworksHdr, { props: { onLost } });
		await new Promise((resolve) => setTimeout(resolve, 0));
		expect(onLost).not.toHaveBeenCalled();
	});

	it("re-exports the figure helpers consumers are told to import", async () => {
		// The package barrel is `export * from "./fireworks-hdr/index.js"`, so what
		// this module exposes is exactly what `import { … } from "fancy-ui-svelte"`
		// can reach.
		const barrel = await import("./index.js");
		expect(typeof barrel.heartOutline).toBe("function");
		expect(typeof barrel.starOutline).toBe("function");
		expect(typeof barrel.polygonOutline).toBe("function");
		expect(typeof barrel.outlineBurst).toBe("function");
	});

	it("does not attempt WebGPU when hdr={false}", () => {
		const { container } = render(FireworksHdr, { props: { hdr: false } });
		expect(container.querySelector("canvas")).toBeInTheDocument();
	});

	it("unmounts without throwing", () => {
		const { unmount } = render(FireworksHdr, { props: { interactive: true, ambient: true } });
		expect(() => unmount()).not.toThrow();
	});

	it("removes the pointerdown listener at unmount after `interactive` flips to false", async () => {
		const restoreGpu = withFakeGpu();
		const addSpy = vi.spyOn(window, "addEventListener");
		const removeSpy = vi.spyOn(window, "removeEventListener");
		try {
			const { rerender, unmount } = render(FireworksHdr, {
				props: { interactive: true, ambient: false },
			});
			await vi.waitFor(() => expect(calledWithPointerdown(addSpy)).toBe(true));
			await rerender({ interactive: false, ambient: false });
			unmount();
			// Teardown must remove what it actually wired, not what the prop says now.
			expect(calledWithPointerdown(removeSpy)).toBe(true);
		} finally {
			addSpy.mockRestore();
			removeSpy.mockRestore();
			restoreGpu();
		}
	});

	it("never arms the pointerdown listener when it mounted with interactive={false}", async () => {
		const restoreGpu = withFakeGpu();
		const addSpy = vi.spyOn(window, "addEventListener");
		try {
			const onReady = vi.fn();
			const { rerender, unmount } = render(FireworksHdr, {
				props: { interactive: false, ambient: false, onReady },
			});
			await vi.waitFor(() => expect(onReady).toHaveBeenCalled());
			// The wiring happens once, at engine activation: `interactive` is a
			// mount-time decision, so a later flip stays inert.
			await rerender({ interactive: true, ambient: false, onReady });
			expect(calledWithPointerdown(addSpy)).toBe(false);
			unmount();
		} finally {
			addSpy.mockRestore();
			restoreGpu();
		}
	});

	it("mounts without error across quality tiers and reduced-motion", () => {
		for (const quality of ["auto", "high", "mid", "low"] as const) {
			const { container, unmount } = render(FireworksHdr, {
				props: { quality, respectReducedMotion: true },
			});
			expect(container.querySelector("canvas")).toBeInTheDocument();
			unmount();
		}
	});
});
