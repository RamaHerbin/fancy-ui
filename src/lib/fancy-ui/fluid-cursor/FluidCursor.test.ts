import { render, cleanup } from "@testing-library/svelte";
import { afterEach, describe, it, expect, vi } from "vitest";
import FluidCursor from "./FluidCursor.svelte";

describe("FluidCursor", () => {
	afterEach(cleanup);

	it("renders a container div", () => {
		const { container } = render(FluidCursor);
		const div = container.firstElementChild as HTMLElement;
		expect(div).toBeInTheDocument();
	});

	it("renders a canvas element", () => {
		const { container } = render(FluidCursor);
		const canvas = container.querySelector("canvas");
		expect(canvas).toBeInTheDocument();
	});

	it("container has pointer-events-none class", () => {
		const { container } = render(FluidCursor);
		const div = container.firstElementChild as HTMLElement;
		expect(div?.className).toContain("pointer-events-none");
	});

	it("defaults to contained mode (absolute positioning)", () => {
		const { container } = render(FluidCursor);
		const div = container.firstElementChild as HTMLElement;
		expect(div?.className).toContain("absolute");
		expect(div?.className).toContain("inset-0");
	});

	it("canvas fills container in contained mode", () => {
		const { container } = render(FluidCursor);
		const canvas = container.querySelector("canvas") as HTMLElement;
		expect(canvas?.className).toContain("h-full");
		expect(canvas?.className).toContain("w-full");
	});

	it("uses fixed positioning when contained={false}", () => {
		const { container } = render(FluidCursor, { props: { contained: false } });
		const div = container.firstElementChild as HTMLElement;
		expect(div?.className).toContain("fixed");
		expect(div?.className).toContain("z-50");
	});

	it("applies custom class names", () => {
		const { container } = render(FluidCursor, { props: { class: "my-fluid" } });
		const div = container.firstElementChild as HTMLElement;
		expect(div?.className).toContain("my-fluid");
	});

	describe("interaction props", () => {
		it("interactive={false} does not register mouse event listeners", () => {
			const addSpy = vi.spyOn(window, "addEventListener");
			render(FluidCursor, { props: { interactive: false } });
			const mousedownCalls = addSpy.mock.calls.filter(([event]) => event === "mousedown");
			expect(mousedownCalls).toHaveLength(0);
			const mousemoveCalls = addSpy.mock.calls.filter(([event]) => event === "mousemove");
			expect(mousemoveCalls).toHaveLength(0);
			addSpy.mockRestore();
		});

		it("mounts without error with autoSplat={true} and splatOnMount={true}", () => {
			const { container } = render(FluidCursor, {
				props: { autoSplat: true, splatOnMount: true },
			});
			expect(container.querySelector("canvas")).toBeInTheDocument();
		});

		it("pauseWhenHidden={false} does not instantiate IntersectionObserver", () => {
			const observeSpy = vi.fn();
			const mockObserver = vi.fn(() => ({ observe: observeSpy, disconnect: vi.fn() }));
			vi.stubGlobal("IntersectionObserver", mockObserver);
			render(FluidCursor, { props: { pauseWhenHidden: false } });
			expect(mockObserver).not.toHaveBeenCalled();
			vi.unstubAllGlobals();
		});
	});

	describe("color props", () => {
		it("renders without error when fluidColor is provided", () => {
			const { container } = render(FluidCursor, { props: { fluidColor: "#00ffcc" } });
			expect(container.querySelector("canvas")).toBeInTheDocument();
		});

		it("renders without error when fluidColors is provided", () => {
			const { container } = render(FluidCursor, {
				props: { fluidColors: ["#ff0080", "#00ffcc", "#7700ff"] },
			});
			expect(container.querySelector("canvas")).toBeInTheDocument();
		});

		it("renders without error when fluidColor and fluidColors are both provided (fluidColor takes priority)", () => {
			const { container } = render(FluidCursor, {
				props: { fluidColor: "#ff0000", fluidColors: ["#00ffcc", "#7700ff"] },
			});
			expect(container.querySelector("canvas")).toBeInTheDocument();
		});

		it("renders without error when backColor is a hex string", () => {
			const { container } = render(FluidCursor, { props: { backColor: "#1a1a2e" } });
			expect(container.querySelector("canvas")).toBeInTheDocument();
		});

		it("warns and falls back when an invalid hex string is passed to backColor", () => {
			const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
			render(FluidCursor, { props: { backColor: "not-a-color" } });
			expect(warn).toHaveBeenCalledWith(expect.stringContaining("[FluidCursor] Invalid hex color"));
			warn.mockRestore();
		});

		it("renders without error when colorIntensity is out of [0,1] range (clamped internally)", () => {
			const { container } = render(FluidCursor, { props: { colorIntensity: 5 } });
			expect(container.querySelector("canvas")).toBeInTheDocument();
		});
	});
});
