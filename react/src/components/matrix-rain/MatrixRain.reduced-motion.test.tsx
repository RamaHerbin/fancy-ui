/**
 * Under `prefers-reduced-motion: reduce` the rain paints one still frame and no
 * animation frame is ever scheduled; the no-preference control proves the loop
 * really runs otherwise.
 */
import { render, cleanup } from "@testing-library/react";
import { afterEach, describe, it, expect, vi } from "vitest";
import { MatrixRain } from "./MatrixRain.js";

function stubMotion(reduce: boolean) {
	vi.stubGlobal("matchMedia", (query: string) => ({
		matches: reduce && query.includes("reduce") && !query.includes("no-preference"),
		media: query,
		onchange: null,
		addEventListener: () => {},
		removeEventListener: () => {},
		addListener: () => {},
		removeListener: () => {},
		dispatchEvent: () => false,
	}));
}

function stubCanvas() {
	const fillRects: string[] = [];
	const fillTexts: string[] = [];
	const ctx = {
		fillStyle: "",
		font: "",
		shadowBlur: 0,
		shadowColor: "",
		setTransform: () => {},
		fillRect: () => {
			fillRects.push(String(ctx.fillStyle));
		},
		fillText: () => {
			fillTexts.push(String(ctx.fillStyle));
		},
	};
	vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(ctx as never);
	vi.spyOn(HTMLCanvasElement.prototype, "clientWidth", "get").mockReturnValue(300);
	vi.spyOn(HTMLCanvasElement.prototype, "clientHeight", "get").mockReturnValue(150);
	return { fillRects, fillTexts };
}

describe("MatrixRain reduced motion", () => {
	afterEach(() => {
		cleanup();
		vi.restoreAllMocks();
		vi.unstubAllGlobals();
	});

	it("schedules no animation frame under reduce", () => {
		stubMotion(true);
		stubCanvas();
		const raf = vi.spyOn(window, "requestAnimationFrame").mockReturnValue(1);
		render(<MatrixRain />);
		expect(raf).not.toHaveBeenCalled();
	});

	it("runs the loop with no preference (control)", () => {
		stubMotion(false);
		stubCanvas();
		const raf = vi.spyOn(window, "requestAnimationFrame").mockReturnValue(1);
		render(<MatrixRain />);
		expect(raf).toHaveBeenCalled();
	});

	it("paints a pre-rolled still, denser than one frame, under reduce", () => {
		stubMotion(true);
		const { fillTexts } = stubCanvas();
		vi.spyOn(window, "requestAnimationFrame").mockReturnValue(1);
		render(<MatrixRain />);
		// 300 / 16 => 18 columns, a head + body glyph each per step: one step is 36.
		expect(fillTexts.length).toBeGreaterThan(36);
	});

	it("repaints the idle still when color or fadeOpacity changes", () => {
		stubMotion(true);
		const { fillRects, fillTexts } = stubCanvas();
		vi.spyOn(window, "requestAnimationFrame").mockReturnValue(1);
		const { rerender } = render(<MatrixRain />);

		fillRects.length = 0;
		fillTexts.length = 0;
		rerender(<MatrixRain color="#ff0000" />);
		expect(fillRects[0]).toBe("black");
		expect(fillTexts).toContain("#ff0000");

		fillRects.length = 0;
		rerender(<MatrixRain color="#ff0000" fadeOpacity={0.2} />);
		expect(fillRects).toContain("rgba(0, 0, 0, 0.2)");

		fillRects.length = 0;
		rerender(<MatrixRain color="#ff0000" fadeOpacity={0.2} />);
		expect(fillRects).toHaveLength(0);
	});
});
