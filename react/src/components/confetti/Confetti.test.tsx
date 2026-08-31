import { render, cleanup } from "@testing-library/react";
import { afterEach, describe, it, expect, vi } from "vitest";
import { Confetti } from "./Confetti.js";

// canvas-confetti requires actual canvas context which jsdom doesn't support,
// so we mock the module and just test DOM structure
vi.mock("canvas-confetti", () => ({
	default: {
		create: () => {
			const fn = vi.fn() as ReturnType<typeof vi.fn> & {
				reset: ReturnType<typeof vi.fn>;
			};
			fn.reset = vi.fn();
			return fn;
		},
	},
}));

describe("Confetti", () => {
	afterEach(cleanup);

	it("renders canvas element", () => {
		const { container } = render(<Confetti />);
		const canvas = container.querySelector("canvas");
		expect(canvas).toBeInTheDocument();
	});

	it("renders wrapper div", () => {
		const { container } = render(<Confetti />);
		const div = container.firstElementChild as HTMLElement;
		expect(div).toBeInTheDocument();
		expect(div.tagName).toBe("DIV");
	});

	it("applies custom class to canvas", () => {
		const { container } = render(<Confetti className="my-confetti" />);
		const canvas = container.querySelector("canvas") as HTMLElement;
		expect(canvas?.className).toContain("my-confetti");
	});

	it("canvas is inside wrapper div", () => {
		const { container } = render(<Confetti />);
		const div = container.firstElementChild as HTMLElement;
		const canvas = div?.querySelector("canvas");
		expect(canvas).toBeInTheDocument();
	});
});
