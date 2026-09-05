import { describe, it, expect } from "vitest";
import { computeFloatPosition, type FloatPlacement, type FloatRect } from "./float.js";

const OFFSET = 6;
const PADDING = 8;
const VIEWPORT = { width: 1000, height: 800 };

function rect(x: number, y: number, width: number, height: number): FloatRect {
	return { x, y, width, height };
}

function place(
	anchor: FloatRect,
	float: { width: number; height: number },
	placement: FloatPlacement,
	viewport = VIEWPORT
) {
	return computeFloatPosition(anchor, float, viewport, {
		placement,
		offset: OFFSET,
		padding: PADDING,
	});
}

describe("computeFloatPosition", () => {
	it("places below with left edges aligned for bottom-start", () => {
		const result = place(rect(100, 100, 200, 40), { width: 200, height: 120 }, "bottom-start");
		expect(result).toEqual({ top: 146, left: 100, placement: "bottom-start" });
	});

	it("flips bottom to top when the bottom is short and the top is roomier", () => {
		const result = place(rect(100, 700, 200, 40), { width: 200, height: 120 }, "bottom-start");
		expect(result.placement).toBe("top-start");
		expect(result.top).toBe(574);
	});

	it("keeps the requested side when neither fits but the requested side is larger", () => {
		// roomAbove 186 vs roomBelow 46: both too small for a 220px float, so the
		// larger side wins and the float overflows where it hides the least.
		const viewport = { width: 1000, height: 300 };
		const result = place(rect(100, 200, 200, 40), { width: 200, height: 220 }, "top", viewport);
		expect(result.placement).toBe("top");
	});

	it("clamps top to the padding when the float overflows above", () => {
		const viewport = { width: 1000, height: 300 };
		const result = place(rect(100, 200, 200, 40), { width: 200, height: 220 }, "top", viewport);
		expect(result.top).toBe(PADDING);
	});

	it("clamps left to the padding against the leading edge", () => {
		const result = place(rect(0, 100, 120, 40), { width: 200, height: 100 }, "bottom-start");
		expect(result.left).toBe(PADDING);
	});

	it("clamps left against the trailing edge when the float is wider than the room left", () => {
		const result = place(rect(900, 100, 100, 40), { width: 300, height: 100 }, "bottom-start");
		expect(result.left).toBe(VIEWPORT.width - 300 - PADDING);
	});

	it("aligns right edges for -end placements", () => {
		const result = place(rect(400, 100, 200, 40), { width: 120, height: 100 }, "bottom-end");
		expect(result.left).toBe(480);
		expect(result.placement).toBe("bottom-end");
	});

	it("centers the float for a bare side and keeps the bare placement", () => {
		const result = place(rect(400, 300, 200, 40), { width: 100, height: 80 }, "top");
		expect(result).toEqual({ top: 214, left: 450, placement: "top" });
	});

	it("positions against a zero-width virtual rect (caret anchoring)", () => {
		const result = place(rect(250, 300, 0, 18), { width: 180, height: 90 }, "bottom-start");
		expect(result).toEqual({ top: 324, left: 250, placement: "bottom-start" });
	});

	it("centers a zero-width virtual rect on the caret itself", () => {
		const result = place(rect(250, 300, 0, 18), { width: 180, height: 90 }, "bottom");
		expect(result.left).toBe(160);
	});
});

/*
 * The DOM-observing half of float.ts (`attachFloat` / `useFloat`) is a
 * separate unit and is not ported here — see the file header.
 */
