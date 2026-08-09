import { describe, it, expect } from "vitest";
import { computePosition } from "./anchor-position";

function rect(partial: Partial<DOMRect>): DOMRect {
	const { x = 0, y = 0, width = 0, height = 0 } = partial;
	return {
		x,
		y,
		width,
		height,
		top: y,
		left: x,
		right: x + width,
		bottom: y + height,
		toJSON() {
			return this;
		},
	};
}

const viewport = { width: 1024, height: 768 };

describe("computePosition", () => {
	it("places the floating element below the anchor by default", () => {
		const anchor = rect({ x: 100, y: 100, width: 50, height: 20 });
		const result = computePosition(anchor, { width: 200, height: 40 }, { viewport });

		expect(result.side).toBe("bottom");
		expect(result.y).toBe(anchor.bottom + 8); // default offset
		expect(result.x).toBe(anchor.left + anchor.width / 2 - 100); // centered
	});

	it("places the floating element above the anchor when side is 'top'", () => {
		const anchor = rect({ x: 100, y: 300, width: 50, height: 20 });
		const result = computePosition(anchor, { width: 200, height: 40 }, { side: "top", viewport });

		expect(result.side).toBe("top");
		expect(result.y).toBe(anchor.top - 40 - 8);
	});

	it("respects a custom offset", () => {
		const anchor = rect({ x: 100, y: 100, width: 50, height: 20 });
		const result = computePosition(
			anchor,
			{ width: 200, height: 40 },
			{ side: "bottom", offset: 16, viewport }
		);

		expect(result.y).toBe(anchor.bottom + 16);
	});

	it("aligns to start / end along the cross axis for a horizontal side", () => {
		const anchor = rect({ x: 700, y: 100, width: 50, height: 20 });
		const floating = { width: 100, height: 40 };

		const start = computePosition(anchor, floating, { side: "bottom", align: "start", viewport });
		expect(start.x).toBe(anchor.left);

		const end = computePosition(anchor, floating, { side: "bottom", align: "end", viewport });
		expect(end.x).toBe(anchor.right - floating.width);
	});

	it("aligns to start / end along the cross axis for a vertical side", () => {
		const anchor = rect({ x: 300, y: 100, width: 50, height: 20 });
		const floating = { width: 120, height: 60 };

		const start = computePosition(anchor, floating, { side: "right", align: "start", viewport });
		expect(start.y).toBe(anchor.top);

		const end = computePosition(anchor, floating, { side: "right", align: "end", viewport });
		expect(end.y).toBe(anchor.bottom - floating.height);
	});

	it("flips from bottom to top when there is no room below", () => {
		const anchor = rect({ x: 100, y: 700, width: 50, height: 20 }); // near the bottom edge
		const result = computePosition(
			anchor,
			{ width: 200, height: 100 },
			{ side: "bottom", viewport }
		);

		expect(result.side).toBe("top");
		expect(result.y).toBe(anchor.top - 100 - 8);
	});

	it("flips from top to bottom when there is no room above", () => {
		const anchor = rect({ x: 100, y: 10, width: 50, height: 20 }); // near the top edge
		const result = computePosition(anchor, { width: 200, height: 100 }, { side: "top", viewport });

		expect(result.side).toBe("bottom");
		expect(result.y).toBe(anchor.bottom + 8);
	});

	it("does not flip when flip is disabled, even if it overflows", () => {
		const anchor = rect({ x: 100, y: 700, width: 50, height: 20 });
		const result = computePosition(
			anchor,
			{ width: 200, height: 100 },
			{ side: "bottom", flip: false, viewport }
		);

		expect(result.side).toBe("bottom");
	});

	it("clamps horizontally so the floating element never renders off the left edge", () => {
		const anchor = rect({ x: 5, y: 100, width: 20, height: 20 });
		const result = computePosition(
			anchor,
			{ width: 200, height: 40 },
			{ side: "bottom", align: "center", viewport }
		);

		expect(result.x).toBe(0);
	});

	it("clamps horizontally so the floating element never renders off the right edge", () => {
		const anchor = rect({ x: 1000, y: 100, width: 20, height: 20 });
		const result = computePosition(
			anchor,
			{ width: 200, height: 40 },
			{ side: "bottom", align: "center", viewport }
		);

		expect(result.x).toBe(viewport.width - 200);
	});

	it("clamps vertically within the viewport", () => {
		const anchor = rect({ x: 100, y: -50, width: 50, height: 20 });
		const result = computePosition(
			anchor,
			{ width: 200, height: 40 },
			{ side: "top", flip: false, viewport }
		);

		expect(result.y).toBe(0);
	});

	it("is a pure function that does not require a real DOM", () => {
		const anchor = rect({ x: 0, y: 0, width: 10, height: 10 });
		expect(() =>
			computePosition(anchor, { width: 10, height: 10 }, { viewport: { width: 100, height: 100 } })
		).not.toThrow();
	});
});
