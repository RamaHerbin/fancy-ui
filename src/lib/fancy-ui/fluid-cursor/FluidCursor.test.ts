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

	it('canvas has id="fluid"', () => {
		const { container } = render(FluidCursor);
		const canvas = container.querySelector("canvas#fluid");
		expect(canvas).toBeInTheDocument();
	});

	it("container has pointer-events-none class", () => {
		const { container } = render(FluidCursor);
		const div = container.firstElementChild as HTMLElement;
		expect(div?.className).toContain("pointer-events-none");
	});

	it("container has fixed positioning class", () => {
		const { container } = render(FluidCursor);
		const div = container.firstElementChild as HTMLElement;
		expect(div?.className).toContain("fixed");
	});

	it("container has z-50 class", () => {
		const { container } = render(FluidCursor);
		const div = container.firstElementChild as HTMLElement;
		expect(div?.className).toContain("z-50");
	});

	it("applies custom class names", () => {
		const { container } = render(FluidCursor, { props: { class: "my-fluid" } });
		const div = container.firstElementChild as HTMLElement;
		expect(div?.className).toContain("my-fluid");
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
			// Both props accepted without throw — fluidColor priority is exercised at runtime
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
