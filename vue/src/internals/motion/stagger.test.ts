import { describe, expect, it } from "vitest";
import { staggerDelay, type StaggerFrom } from "./stagger.js";

describe("staggerDelay", () => {
	it("returns 0 for a single item or an empty list, whatever step/from/cap is", () => {
		expect(staggerDelay(0, 1, 50)).toBe(0);
		expect(staggerDelay(0, 0, 50, "center", 200)).toBe(0);
	});

	it("from=first: delay grows with index, the first item is 0", () => {
		expect(staggerDelay(0, 5, 50, "first")).toBe(0);
		expect(staggerDelay(4, 5, 50, "first")).toBe(200);
	});

	it("from=last: delay shrinks with index, the last item is 0", () => {
		expect(staggerDelay(0, 5, 50, "last")).toBe(200);
		expect(staggerDelay(4, 5, 50, "last")).toBe(0);
	});

	it("from=center (odd count): symmetric around the middle, 0 at the true center", () => {
		// count=5, center index 2 → distances 2,1,0,1,2
		expect([0, 1, 2, 3, 4].map((i) => staggerDelay(i, 5, 10, "center"))).toEqual([
			20, 10, 0, 10, 20,
		]);
	});

	it("from=center (even count): the two middle items are equidistant", () => {
		// count=4, center 1.5 → distances 1.5,0.5,0.5,1.5
		expect([0, 1, 2, 3].map((i) => staggerDelay(i, 4, 10, "center"))).toEqual([15, 5, 5, 15]);
	});

	it("from=<number>: distance from an arbitrary origin index, not clamped to the list", () => {
		expect(staggerDelay(0, 5, 10, 2)).toBe(20);
		expect(staggerDelay(4, 5, 10, 2)).toBe(20);
		// An origin outside [0, count-1] is honoured as-is — clamping it would
		// silently change what the caller asked for.
		expect(staggerDelay(0, 5, 10, -3)).toBe(30);
	});

	it("with no cap, the step is used verbatim", () => {
		expect(staggerDelay(39, 40, 15, "first")).toBe(585);
	});

	it("with a cap, compresses the step so the furthest item lands at ~the cap (from=first)", () => {
		// TextRoll's own numbers: stagger 15ms/step, cap 200ms total.
		const delay = staggerDelay(39, 40, 15, "first", 200);
		expect(delay).toBeCloseTo(200, 9);
	});

	it("a cap looser than the natural total leaves the step untouched", () => {
		// natural total = 50 * 4 = 200, well under the 600ms cap.
		expect(staggerDelay(4, 5, 50, "first", 600)).toBe(200);
	});

	it.each<[StaggerFrom]>([["first"], ["last"], ["center"]])(
		"with a cap, no item's delay exceeds it (from=%s, whose max distance is <= count-1)",
		(from) => {
			const count = 40;
			const cap = 200;
			const delays = Array.from({ length: count }, (_, i) => staggerDelay(i, count, 15, from, cap));
			expect(Math.max(...delays)).toBeLessThanOrEqual(cap + 1e-9);
		}
	);

	it("compression preserves relative ordering: item i+1 never starts before item i (from=first)", () => {
		const count = 40;
		const delays = Array.from({ length: count }, (_, i) =>
			staggerDelay(i, count, 15, "first", 200)
		);
		for (let i = 1; i < delays.length; i++) {
			expect(delays[i]).toBeGreaterThanOrEqual(delays[i - 1] as number);
		}
	});
});
