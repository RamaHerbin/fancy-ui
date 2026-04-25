import { render, cleanup } from "@testing-library/svelte";
import { afterEach, describe, it, expect, vi } from "vitest";
import FluidCursorAdvanced from "./FluidCursorAdvanced.svelte";

describe("FluidCursorAdvanced", () => {
	afterEach(cleanup);

	it("renders a container div", () => {
		const { container } = render(FluidCursorAdvanced);
		const div = container.firstElementChild as HTMLElement;
		expect(div).toBeInTheDocument();
	});

	it("renders a canvas element", () => {
		const { container } = render(FluidCursorAdvanced);
		const canvas = container.querySelector("canvas");
		expect(canvas).toBeInTheDocument();
	});

	it("canvas does not share the hard-coded id with FluidCursor", () => {
		const { container } = render(FluidCursorAdvanced);
		const canvas = container.querySelector("canvas");
		expect(canvas?.id).not.toBe("fluid");
	});

	it("container has pointer-events-none class (contained mode)", () => {
		const { container } = render(FluidCursorAdvanced);
		const div = container.firstElementChild as HTMLElement;
		expect(div?.className).toContain("pointer-events-none");
	});

	it("container has absolute positioning in contained mode", () => {
		const { container } = render(FluidCursorAdvanced);
		const div = container.firstElementChild as HTMLElement;
		expect(div?.className).toContain("absolute");
		expect(div?.className).toContain("inset-0");
	});

	it("canvas fills container in contained mode", () => {
		const { container } = render(FluidCursorAdvanced);
		const canvas = container.querySelector("canvas") as HTMLElement;
		expect(canvas?.className).toContain("h-full");
		expect(canvas?.className).toContain("w-full");
	});

	it("applies custom class names", () => {
		const { container } = render(FluidCursorAdvanced, { props: { class: "my-advanced" } });
		const div = container.firstElementChild as HTMLElement;
		expect(div?.className).toContain("my-advanced");
	});

	describe("color props", () => {
		it("renders without error when fluidColor is provided", () => {
			const { container } = render(FluidCursorAdvanced, { props: { fluidColor: "#6366f1" } });
			expect(container.querySelector("canvas")).toBeInTheDocument();
		});

		it("renders without error when fluidColors palette is provided", () => {
			const { container } = render(FluidCursorAdvanced, {
				props: { fluidColors: ["#6366f1", "#ec4899"] },
			});
			expect(container.querySelector("canvas")).toBeInTheDocument();
		});

		it("warns and falls back when an invalid hex color is passed", () => {
			const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
			render(FluidCursorAdvanced, { props: { backColor: "not-a-color" } });
			expect(warn).toHaveBeenCalledWith(
				expect.stringContaining("[FluidCursorAdvanced] Invalid hex color"),
			);
			warn.mockRestore();
		});
	});
});
