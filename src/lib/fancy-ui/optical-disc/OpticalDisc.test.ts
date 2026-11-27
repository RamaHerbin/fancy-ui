import { cleanup, render } from "@testing-library/svelte";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import OpticalDisc from "./OpticalDisc.svelte";

const engine = { setOptions: vi.fn(), getAngle: vi.fn(() => 0), destroy: vi.fn() };
const create = vi.fn<(...args: unknown[]) => typeof engine | null>(() => engine);

vi.mock("./optical-disc-core.js", async (original) => ({
	...(await original<typeof import("./optical-disc-core")>()),
	createOpticalDisc: (...args: unknown[]) => create(...args),
}));

describe("OpticalDisc", () => {
	beforeEach(() => {
		create.mockClear();
		create.mockImplementation(() => engine);
		engine.setOptions.mockClear();
		engine.destroy.mockClear();
	});

	afterEach(() => cleanup());

	it("creates one engine on its canvas with the props", () => {
		const { container } = render(OpticalDisc, { props: { spin: 4, angle: 30, label: "/art.png" } });
		expect(create).toHaveBeenCalledTimes(1);
		const [elements, options] = create.mock.calls[0] as [
			{ canvas: HTMLCanvasElement },
			Record<string, unknown>,
		];
		expect(elements.canvas).toBe(container.querySelector("canvas"));
		expect(options).toMatchObject({ spin: 4, angle: 30, label: "/art.png", interactive: true });
		const root = container.querySelector(".fancy-optical-disc")!;
		expect(root.hasAttribute("data-ready")).toBe(true);
		expect(root.querySelector(".fancy-optical-disc-fallback")).toBeNull();
	});

	it("forwards a prop change without rebuilding the engine", async () => {
		const { rerender } = render(OpticalDisc, { props: { iridescence: 1 } });
		engine.setOptions.mockClear();
		await rerender({ iridescence: 0.3, interactive: false });
		expect(create).toHaveBeenCalledTimes(1);
		expect(engine.setOptions).toHaveBeenLastCalledWith(
			expect.objectContaining({ iridescence: 0.3, interactive: false, label: null })
		);
	});

	it("destroys the engine on unmount", () => {
		const { unmount } = render(OpticalDisc);
		unmount();
		expect(engine.destroy).toHaveBeenCalledTimes(1);
	});

	it("keeps the fallback when the engine cannot start", () => {
		create.mockImplementation(() => null);
		const { container } = render(OpticalDisc);
		const root = container.querySelector(".fancy-optical-disc")!;
		expect(root.hasAttribute("data-ready")).toBe(false);
		expect(root.querySelector(".fancy-optical-disc-fallback")).not.toBeNull();
	});

	it("is an image with a name, or decorative without one", () => {
		const named = render(OpticalDisc, { props: { alt: "A spinning disc" } });
		const root = named.container.querySelector(".fancy-optical-disc")!;
		expect(root.getAttribute("role")).toBe("img");
		expect(root.getAttribute("aria-label")).toBe("A spinning disc");
		expect(root.hasAttribute("aria-hidden")).toBe(false);
		named.unmount();

		const bare = render(OpticalDisc);
		const decorative = bare.container.querySelector(".fancy-optical-disc")!;
		expect(decorative.getAttribute("role")).toBeNull();
		expect(decorative.getAttribute("aria-hidden")).toBe("true");
	});

	it("merges a custom class and only offers the grab cursor when interactive", async () => {
		const { container, rerender } = render(OpticalDisc, { props: { class: "max-w-xs" } });
		expect(container.querySelector(".fancy-optical-disc")?.classList.contains("max-w-xs")).toBe(
			true
		);
		const canvas = container.querySelector("canvas")!;
		expect(canvas.style.cursor).toBe("grab");
		await rerender({ interactive: false });
		expect(canvas.style.cursor).toBe("");
	});
});
