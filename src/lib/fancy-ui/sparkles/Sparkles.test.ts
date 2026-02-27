import { render, cleanup } from "@testing-library/svelte";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import Sparkles from "./Sparkles.svelte";

describe("Sparkles", () => {
	beforeEach(() => {
		vi.stubGlobal(
			"ResizeObserver",
			class {
				observe() {}
				unobserve() {}
				disconnect() {}
			}
		);
	});

	afterEach(() => {
		cleanup();
		vi.restoreAllMocks();
	});

	it("renders container div", () => {
		const { container } = render(Sparkles);
		const div = container.firstElementChild as HTMLElement;
		expect(div).toBeInTheDocument();
		expect(div.tagName).toBe("DIV");
	});

	it("renders canvas element inside container", () => {
		const { container } = render(Sparkles);
		const canvas = container.querySelector("canvas");
		expect(canvas).toBeInTheDocument();
	});

	it("applies default background style", () => {
		const { container } = render(Sparkles);
		const div = container.firstElementChild as HTMLElement;
		const style = div?.getAttribute("style") ?? "";
		expect(style).toContain("background");
		// jsdom converts hex to rgb
		expect(style).toMatch(/background.*rgb\(13,\s*71,\s*161\)|#0d47a1/);
	});

	it("applies custom background style", () => {
		const { container } = render(Sparkles, {
			props: { background: "#ff0000" },
		});
		const div = container.firstElementChild as HTMLElement;
		const style = div?.getAttribute("style") ?? "";
		expect(style).toMatch(/rgb\(255,\s*0,\s*0\)|#ff0000/);
	});

	it("applies custom class", () => {
		const { container } = render(Sparkles, { props: { class: "my-sparkles" } });
		const div = container.firstElementChild as HTMLElement;
		expect(div?.className).toContain("my-sparkles");
	});

	it("has overflow-hidden class", () => {
		const { container } = render(Sparkles);
		const div = container.firstElementChild as HTMLElement;
		expect(div?.className).toContain("overflow-hidden");
	});

	it("preserves base classes when custom class is added", () => {
		const { container } = render(Sparkles, { props: { class: "extra" } });
		const div = container.firstElementChild as HTMLElement;
		expect(div?.className).toContain("relative");
		expect(div?.className).toContain("overflow-hidden");
		expect(div?.className).toContain("will-change-transform");
	});

	it("canvas has absolute positioning classes", () => {
		const { container } = render(Sparkles);
		const canvas = container.querySelector("canvas") as HTMLElement;
		expect(canvas?.className).toContain("absolute");
		expect(canvas?.className).toContain("inset-0");
	});
});
